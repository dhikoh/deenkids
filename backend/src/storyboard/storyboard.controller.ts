import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, RolesGuard } from '../common/guards/roles.guard';
import { SetMetadata } from '@nestjs/common';
import { StoryboardService, RenderStatus } from './storyboard.service';
import { Request, Response } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// MIME type constants
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_MIMES = ['video/mp4', 'video/webm'];
const AUDIO_MIMES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac'];
const ALLOWED_MIMES = [...IMAGE_MIMES, ...VIDEO_MIMES, ...AUDIO_MIMES];

// Multer config: save uploads to a unique temp directory per session
const storyboardStorage = diskStorage({
  destination: (req: any, _file, cb) => {
    // Create or reuse session dir
    if (!req._storyboardDir) {
      const sessionId = req.body?.sessionId || randomUUID();
      const dir = join(tmpdir(), `adably-storyboard-${sessionId}`);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      req._storyboardDir = dir;
      req._storyboardSessionId = sessionId;
    }
    cb(null, req._storyboardDir);
  },
  filename: (_req, file, cb) => {
    const uniqueId = randomUUID().slice(0, 8);
    const ext = extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${uniqueId}${ext}`);
  },
});

@Controller('storyboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class StoryboardController {
  private readonly logger = new Logger(StoryboardController.name);

  constructor(private readonly storyboardService: StoryboardService) {}

  /**
   * Upload images, videos, and audio for storyboard editing.
   * Accepts up to 55 files (50 images/videos + 1 audio + buffer).
   */
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 55, {
      storage: storyboardStorage,
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file (video can be large)
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`File type ${file.mimetype} tidak diizinkan`), false);
        }
      },
    }),
  )
  async uploadAssets(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Tidak ada file yang diupload');
    }

    const sessionId = req._storyboardSessionId || req.body?.sessionId;
    const sessionDir = req._storyboardDir;

    const images: any[] = [];
    const videos: any[] = [];
    let audio: any = null;

    for (const file of files) {
      if (AUDIO_MIMES.includes(file.mimetype)) {
        audio = {
          id: file.filename,
          filename: file.originalname,
          path: file.path,
          size: file.size,
        };
      } else if (VIDEO_MIMES.includes(file.mimetype)) {
        videos.push({
          id: file.filename,
          filename: file.originalname,
          path: file.path,
          size: file.size,
          mediaType: 'video' as const,
          order: images.length + videos.length,
        });
      } else {
        images.push({
          id: file.filename,
          filename: file.originalname,
          path: file.path,
          size: file.size,
          mediaType: 'image' as const,
          order: images.length + videos.length,
        });
      }
    }

    this.logger.log(
      `📤 Storyboard upload: ${images.length} images, ${videos.length} videos, ${audio ? '1 audio' : 'no audio'} (session: ${sessionId})`,
    );

    return {
      sessionId,
      sessionDir,
      images,
      videos,
      audio,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
    };
  }

  /**
   * Render storyboard to MP4 using FFmpeg.
   * Supports mixed image + video slides.
   */
  @Post('render')
  async renderVideo(
    @Body() body: {
      sessionId: string;
      slides: Array<{
        imageId: string;
        duration: number;
        transition: string;
        transitionDuration?: number;
        subtitle?: string;
        mediaType?: 'image' | 'video';
      }>;
      audioId?: string;
      aspectRatio: '16:9' | '9:16' | '1:1';
      fps: number;
      subtitleConfig?: {
        enabled: boolean;
        font: string;
        fontSize: 'small' | 'medium' | 'large';
        color: string;
        position: 'top' | 'center' | 'bottom';
        bgStyle: 'semi-transparent' | 'none' | 'blur';
      };
    },
    @Req() req: any,
  ) {
    // Validate inputs
    if (!body.sessionId) throw new BadRequestException('sessionId wajib diisi');
    if (!body.slides || body.slides.length === 0) throw new BadRequestException('Minimal 1 slide diperlukan');
    if (body.slides.length > 50) throw new BadRequestException('Maksimal 50 slide');

    const allowedFps = [30, 60, 120];
    const fps = allowedFps.includes(body.fps) ? body.fps : 30;

    const allowedRatios = ['16:9', '9:16', '1:1'];
    if (!allowedRatios.includes(body.aspectRatio)) {
      throw new BadRequestException('Aspek rasio tidak valid');
    }

    const mediaTypes = body.slides.reduce(
      (acc, s) => {
        if (s.mediaType === 'video') acc.video++;
        else acc.image++;
        return acc;
      },
      { image: 0, video: 0 },
    );

    this.logger.log(
      `🎬 Render request: ${body.slides.length} slides (${mediaTypes.image} img, ${mediaTypes.video} vid), ${body.aspectRatio}, ${fps}fps (session: ${body.sessionId})`,
    );

    const result = await this.storyboardService.renderVideo({
      sessionId: body.sessionId,
      slides: body.slides,
      audioId: body.audioId,
      aspectRatio: body.aspectRatio,
      fps,
      subtitleConfig: body.subtitleConfig,
    });

    return result;
  }

  /**
   * Check render progress/status.
   */
  @Get('status/:sessionId')
  async getStatus(@Param('sessionId') sessionId: string): Promise<RenderStatus> {
    return this.storyboardService.getStatus(sessionId);
  }

  /**
   * Download rendered MP4.
   */
  @Get('download/:sessionId')
  async downloadVideo(
    @Param('sessionId') sessionId: string,
    @Res() res: Response,
  ) {
    const filePath = this.storyboardService.getOutputPath(sessionId);
    if (!filePath) {
      throw new BadRequestException('Video belum di-render atau session sudah expired');
    }

    res.download(filePath, `storyboard-${sessionId.slice(0, 8)}.mp4`);
  }

  /**
   * Upload rendered MP4 to MinIO for social publish pipeline.
   */
  @Post('upload-to-storage/:sessionId')
  async uploadToStorage(
    @Param('sessionId') sessionId: string,
    @Body() body: { slug?: string },
  ) {
    return this.storyboardService.uploadToStorage(sessionId, body.slug);
  }

  /**
   * Link a storyboard video URL to a content item.
   */
  @Patch('link')
  async linkToContent(
    @Body() body: { contentId: string; videoUrl?: string; mp4Url?: string },
  ) {
    if (!body.contentId) throw new BadRequestException('contentId wajib diisi');
    return this.storyboardService.linkToContent(body.contentId, body.videoUrl, body.mp4Url);
  }

  /**
   * Remove storyboard video link from a content item.
   */
  @Patch('unlink')
  async unlinkFromContent(
    @Body() body: { contentId: string },
  ) {
    if (!body.contentId) throw new BadRequestException('contentId wajib diisi');
    return this.storyboardService.unlinkFromContent(body.contentId);
  }

  /**
   * Get list of published content for linking.
   */
  @Get('content-list')
  async getContentList() {
    return this.storyboardService.getPublishedContentList();
  }

  /**
   * Delete a specific uploaded asset from a session.
   * Used when user removes a slide after uploading.
   */
  @Post('delete-asset')
  async deleteAsset(
    @Body() body: { sessionId: string; fileId: string },
  ) {
    if (!body.sessionId) throw new BadRequestException('sessionId wajib diisi');
    if (!body.fileId) throw new BadRequestException('fileId wajib diisi');
    return this.storyboardService.deleteSessionAsset(body.sessionId, body.fileId);
  }
}
