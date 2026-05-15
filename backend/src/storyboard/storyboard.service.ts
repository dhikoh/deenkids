import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync, readFileSync, writeFileSync, unlinkSync, utimesSync } from 'fs';
import { readFile } from 'fs/promises';

const execFileAsync = promisify(execFile);

// Render queue: only 1 render at a time to protect server
export interface RenderStatus {
  status: 'queued' | 'rendering' | 'done' | 'error';
  progress: number;
  outputPath?: string;
  error?: string;
  startedAt?: Date;
}

// Available Google Fonts for subtitle rendering
const SUBTITLE_FONTS: Record<string, string> = {
  'montserrat':      'Montserrat-Bold',
  'poppins':         'Poppins-SemiBold',
  'bebas-neue':      'BebasNeue-Regular',
  'playfair':        'PlayfairDisplay-Bold',
  'fredoka':         'FredokaOne-Regular',
  'righteous':       'Righteous-Regular',
  'baloo':           'Baloo2-SemiBold',
  'amiri':           'Amiri-Bold',
};

// Font size mapping (relative to video height)
const FONT_SIZE_MAP: Record<string, number> = {
  small: 28,
  medium: 36,
  large: 48,
};

// Transition effects available in FFmpeg xfade filter
const TRANSITIONS = [
  'fade', 'slideright', 'slideleft', 'slideup', 'slidedown',
  'wipeleft', 'wiperight', 'dissolve', 'pixelize', 'zoomin', 'none',
];

// File extensions recognized as video
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];

/** Slide input for render pipeline */
interface SlideInput {
  imageId: string;
  duration: number;
  transition: string;
  transitionDuration?: number;
  subtitle?: string;
  mediaType?: 'image' | 'video';
}

/** Internal slide after clamping and validation */
interface ProcessedSlide extends SlideInput {
  transition: string;
  transitionDuration: number;
  mediaType: 'image' | 'video';
  /** Actual duration (for video: probed, for image: user-set) */
  resolvedDuration: number;
}

@Injectable()
export class StoryboardService {
  private readonly logger = new Logger(StoryboardService.name);
  private isRendering = false;
  private renderStatuses = new Map<string, RenderStatus>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Render storyboard slides + audio into MP4 video using FFmpeg.
   * Supports mixed image + video slide inputs.
   */
  async renderVideo(config: {
    sessionId: string;
    slides: SlideInput[];
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
  }) {
    const { sessionId, slides, audioId, aspectRatio, fps, subtitleConfig } = config;

    // Verify session directory exists
    const sessionDir = join(tmpdir(), `adably-storyboard-${sessionId}`);
    if (!existsSync(sessionDir)) {
      throw new BadRequestException('Session tidak ditemukan atau sudah expired. Upload ulang file.');
    }

    // Prevent concurrent renders
    if (this.isRendering) {
      throw new BadRequestException('Server sedang memproses video lain. Coba lagi dalam beberapa menit.');
    }

    // Set status
    this.renderStatuses.set(sessionId, {
      status: 'rendering',
      progress: 0,
      startedAt: new Date(),
    });
    this.isRendering = true;

    // Run render in background (don't await — let client poll status)
    this.executeRender(sessionDir, sessionId, slides, audioId, aspectRatio, fps, subtitleConfig)
      .catch(err => {
        this.logger.error(`❌ Render failed for ${sessionId}: ${err.message}`);
        this.renderStatuses.set(sessionId, {
          status: 'error',
          progress: 0,
          error: err.message,
        });
        this.isRendering = false;
      });

    return {
      sessionId,
      status: 'rendering',
      message: 'Video sedang di-render. Gunakan GET /storyboard/status/:sessionId untuk cek progress.',
    };
  }

  /**
   * Detect media type from file extension.
   */
  private detectMediaType(filename: string): 'image' | 'video' {
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    return VIDEO_EXTENSIONS.includes(ext) ? 'video' : 'image';
  }

  /**
   * Probe video duration using ffprobe.
   * Returns duration in seconds. Falls back to 5s if probe fails.
   */
  private async probeVideoDuration(filePath: string): Promise<number> {
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        filePath,
      ], { timeout: 15000 });
      const dur = parseFloat(stdout.trim());
      if (isNaN(dur) || dur <= 0) return 5;
      return dur;
    } catch (err) {
      this.logger.warn(`⚠️ ffprobe failed for ${filePath}: ${err.message}, using fallback 5s`);
      return 5;
    }
  }

  /**
   * Execute FFmpeg render process.
   * Handles mixed image + video slide inputs.
   */
  private async executeRender(
    sessionDir: string,
    sessionId: string,
    slides: SlideInput[],
    audioId: string | undefined,
    aspectRatio: '16:9' | '9:16' | '1:1',
    fps: number,
    subtitleConfig?: {
      enabled: boolean;
      font: string;
      fontSize: 'small' | 'medium' | 'large';
      color: string;
      position: 'top' | 'center' | 'bottom';
      bgStyle: 'semi-transparent' | 'none' | 'blur';
    },
  ) {
    const lockFile = join(sessionDir, '.rendering');
    try {
      const outputPath = join(sessionDir, 'output.mp4');

      // Create lock file to protect session from cron cleanup during render
      writeFileSync(lockFile, new Date().toISOString());

      // Touch session dir mtime to prevent premature cron cleanup
      const now = new Date();
      utimesSync(sessionDir, now, now);

      // Determine dimensions
      const dimensions = this.getDimensions(aspectRatio);

      // Validate all slide files exist and detect media types
      for (const slide of slides) {
        const filePath = join(sessionDir, slide.imageId);
        if (!existsSync(filePath)) {
          throw new Error(`File ${slide.imageId} tidak ditemukan di session`);
        }
      }

      this.updateProgress(sessionId, 5);

      // Process slides: clamp, detect types, probe video durations
      const processedSlides: ProcessedSlide[] = [];
      for (const s of slides) {
        const filePath = join(sessionDir, s.imageId);
        // Determine media type: prefer client-provided, fallback to extension detection
        const mediaType = s.mediaType || this.detectMediaType(s.imageId);

        let resolvedDuration: number;
        if (mediaType === 'video') {
          // Probe actual video duration
          resolvedDuration = await this.probeVideoDuration(filePath);
        } else {
          // Image: clamp user-provided duration
          resolvedDuration = Math.max(1, Math.min(30, s.duration));
        }

        processedSlides.push({
          ...s,
          duration: resolvedDuration,
          transition: TRANSITIONS.includes(s.transition) ? s.transition : 'fade',
          transitionDuration: Math.max(0.3, Math.min(2, s.transitionDuration || 0.8)),
          mediaType,
          resolvedDuration,
        });
      }

      this.updateProgress(sessionId, 15);

      // Generate subtitle file (SRT) if enabled
      let srtPath: string | undefined;
      if (subtitleConfig?.enabled) {
        srtPath = join(sessionDir, 'subtitles.srt');
        this.generateSrtFile(srtPath, processedSlides);
      }

      this.updateProgress(sessionId, 20);

      // Build FFmpeg command
      const ffmpegArgs = this.buildFfmpegArgs(
        sessionDir,
        processedSlides,
        audioId ? join(sessionDir, audioId) : undefined,
        outputPath,
        dimensions,
        fps,
        srtPath,
        subtitleConfig,
      );

      this.updateProgress(sessionId, 30);

      // Log media composition
      const imgCount = processedSlides.filter(s => s.mediaType === 'image').length;
      const vidCount = processedSlides.filter(s => s.mediaType === 'video').length;

      // Calculate total expected duration for progress tracking
      const totalDuration = processedSlides.reduce((sum, s) => sum + s.resolvedDuration, 0);

      // Execute FFmpeg via spawn for realtime progress tracking
      this.logger.log(`🎬 FFmpeg render starting: ${processedSlides.length} slides (${imgCount} img, ${vidCount} vid), ${aspectRatio}, ${fps}fps, ~${totalDuration.toFixed(1)}s total`);

      await new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        // 15 min kill timer
        const killTimer = setTimeout(() => {
          ffmpeg.kill('SIGKILL');
          reject(new Error('FFmpeg timeout (15 menit)'));
        }, 900000);

        let stderrBuffer = '';

        // Parse FFmpeg stderr for progress (time=HH:MM:SS.ms)
        ffmpeg.stderr?.on('data', (chunk: Buffer) => {
          stderrBuffer += chunk.toString();
          // Parse latest time= value from FFmpeg output
          const timeMatch = stderrBuffer.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/g);
          if (timeMatch && totalDuration > 0) {
            const latest = timeMatch[timeMatch.length - 1];
            const parts = latest.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
            if (parts) {
              const secs = parseInt(parts[1]) * 3600 + parseInt(parts[2]) * 60 + parseInt(parts[3]) + parseInt(parts[4]) / 100;
              // Map to 30–95% range (30% = prep done, 95% = encode done, 100% = verify done)
              const pct = Math.min(95, Math.round(30 + (secs / totalDuration) * 65));
              this.updateProgress(sessionId, pct);
            }
          }
          // Keep buffer from growing indefinitely
          if (stderrBuffer.length > 8192) {
            stderrBuffer = stderrBuffer.slice(-4096);
          }
        });

        ffmpeg.on('close', (code) => {
          clearTimeout(killTimer);
          if (code === 0) resolve();
          else reject(new Error(`FFmpeg exit code ${code}`));
        });

        ffmpeg.on('error', (err) => {
          clearTimeout(killTimer);
          reject(err);
        });
      });

      this.updateProgress(sessionId, 97);

      // Verify output exists
      if (!existsSync(outputPath)) {
        throw new Error('FFmpeg tidak menghasilkan output file');
      }

      this.renderStatuses.set(sessionId, {
        status: 'done',
        progress: 100,
        outputPath,
      });

      this.logger.log(`✅ Render complete: ${outputPath}`);
    } finally {
      this.isRendering = false;
      // Remove lock file so cron can eventually clean up this session
      try { if (existsSync(lockFile)) unlinkSync(lockFile); } catch {}
    }
  }

  /**
   * Build FFmpeg arguments for mixed image + video slideshow with transitions.
   */
  private buildFfmpegArgs(
    sessionDir: string,
    slides: ProcessedSlide[],
    audioPath: string | undefined,
    outputPath: string,
    dimensions: { width: number; height: number },
    fps: number,
    srtPath?: string,
    subtitleConfig?: {
      enabled: boolean;
      font: string;
      fontSize: 'small' | 'medium' | 'large';
      color: string;
      position: 'top' | 'center' | 'bottom';
      bgStyle: 'semi-transparent' | 'none' | 'blur';
    },
  ): string[] {
    const { width, height } = dimensions;
    const args: string[] = [];

    // Input files — different args for images vs videos
    for (const slide of slides) {
      if (slide.mediaType === 'video') {
        // Video input: no loop, use native duration
        // -an to strip audio from video clips (global audio only)
        args.push('-an', '-i', join(sessionDir, slide.imageId));
      } else {
        // Image input: loop for specified duration
        args.push('-loop', '1', '-t', String(slide.resolvedDuration), '-i', join(sessionDir, slide.imageId));
      }
    }

    // Input audio (if provided)
    if (audioPath && existsSync(audioPath)) {
      args.push('-i', audioPath);
    }

    // Build filter_complex
    const filterParts: string[] = [];
    const scaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps},format=yuv420p`;

    // Scale each input and trim video slides to their resolved duration
    for (let i = 0; i < slides.length; i++) {
      if (slides[i].mediaType === 'video') {
        // Video: scale + trim to resolved duration to ensure precise timeline
        filterParts.push(`[${i}:v]${scaleFilter},trim=duration=${slides[i].resolvedDuration.toFixed(2)},setpts=PTS-STARTPTS[v${i}]`);
      } else {
        // Image: just scale (duration is set via -t input flag)
        filterParts.push(`[${i}:v]${scaleFilter}[v${i}]`);
      }
    }

    // Apply xfade transitions between consecutive slides
    if (slides.length === 1) {
      // Single slide: no transition needed
      filterParts.push(`[v0]null[vout]`);
    } else {
      let prevLabel = 'v0';
      let cumulativeOffset = 0;

      for (let i = 1; i < slides.length; i++) {
        const prevDuration = slides[i - 1].resolvedDuration;
        const transition = slides[i].transition;
        const transDur = slides[i].transitionDuration;
        const outLabel = i === slides.length - 1 ? 'vout' : `vt${i}`;

        // Offset = cumulative duration of all previous slides minus transition overlaps
        cumulativeOffset += prevDuration - transDur;
        // Ensure offset is never negative
        const offset = Math.max(0, cumulativeOffset);

        if (transition === 'none') {
          // No transition — simple concat
          filterParts.push(`[${prevLabel}][v${i}]concat=n=2:v=1:a=0[${outLabel}]`);
        } else {
          filterParts.push(`[${prevLabel}][v${i}]xfade=transition=${transition}:duration=${transDur}:offset=${offset.toFixed(2)}[${outLabel}]`);
        }

        prevLabel = outLabel;
      }
    }

    // Add subtitle overlay if SRT file exists
    if (srtPath && subtitleConfig?.enabled) {
      const fontName = SUBTITLE_FONTS[subtitleConfig.font] || 'Montserrat-Bold';
      const fontSize = FONT_SIZE_MAP[subtitleConfig.fontSize] || 36;
      const fontColor = this.parseFontColor(subtitleConfig.color);
      const alignment = this.getSubAlignment(subtitleConfig.position);
      const bgOpacity = subtitleConfig.bgStyle === 'semi-transparent' ? '&H80000000' : '&H00000000';

      // Use ASS-style subtitle rendering for better control
      const subtitleFilter = `subtitles=${srtPath.replace(/\\/g, '/')}:force_style='FontName=${fontName},FontSize=${fontSize},PrimaryColour=${fontColor},Alignment=${alignment},BorderStyle=4,BackColour=${bgOpacity},Outline=0,Shadow=0,MarginV=30'`;
      filterParts.push(`[vout]${subtitleFilter}[vfinal]`);
    } else {
      filterParts.push(`[vout]null[vfinal]`);
    }

    args.push('-filter_complex', filterParts.join(';'));

    // Map outputs
    args.push('-map', '[vfinal]');
    if (audioPath && existsSync(audioPath)) {
      args.push('-map', `${slides.length}:a`);
      args.push('-c:a', 'aac', '-b:a', '192k');
      args.push('-shortest'); // End when shorter stream ends
    }

    // Video encoding settings
    args.push(
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-r', String(fps),
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-y', // Overwrite output
      outputPath,
    );

    return args;
  }

  /**
   * Generate SRT subtitle file from slide data.
   */
  private generateSrtFile(
    srtPath: string,
    slides: Array<{ resolvedDuration: number; subtitle?: string; transitionDuration: number }>,
  ) {
    const srtLines: string[] = [];
    let currentTime = 0;
    let index = 1;

    for (const slide of slides) {
      if (slide.subtitle && slide.subtitle.trim()) {
        const startTime = this.formatSrtTime(currentTime);
        const endTime = this.formatSrtTime(currentTime + slide.resolvedDuration);

        srtLines.push(
          String(index),
          `${startTime} --> ${endTime}`,
          slide.subtitle.trim(),
          '',
        );
        index++;
      }
      // Move time forward (account for transition overlap with next slide)
      currentTime += slide.resolvedDuration - (slide.transitionDuration || 0);
    }

    writeFileSync(srtPath, srtLines.join('\n'), 'utf-8');
    this.logger.log(`📝 Generated SRT: ${index - 1} subtitles`);
  }

  /**
   * Format seconds to SRT timestamp: HH:MM:SS,mmm
   */
  private formatSrtTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  /**
   * Parse font color to ASS format (&HBBGGRR).
   */
  private parseFontColor(color: string): string {
    const colorMap: Record<string, string> = {
      'white':  '&H00FFFFFF',
      'yellow': '&H0000FFFF',
      'black':  '&H00000000',
      'red':    '&H000000FF',
      'green':  '&H0000FF00',
    };
    return colorMap[color] || '&H00FFFFFF'; // default white
  }

  /**
   * Get ASS subtitle alignment number.
   */
  private getSubAlignment(position: string): number {
    // ASS alignment: 1-3 bottom, 4-6 middle, 7-9 top (centered = 2, 5, 8)
    switch (position) {
      case 'top': return 8;
      case 'center': return 5;
      case 'bottom':
      default: return 2;
    }
  }

  /**
   * Get video dimensions based on aspect ratio.
   */
  private getDimensions(aspectRatio: string): { width: number; height: number } {
    switch (aspectRatio) {
      case '9:16': return { width: 1080, height: 1920 };
      case '1:1':  return { width: 1080, height: 1080 };
      case '16:9':
      default:     return { width: 1280, height: 720 };
    }
  }

  /**
   * Update render progress.
   */
  private updateProgress(sessionId: string, progress: number) {
    const current = this.renderStatuses.get(sessionId);
    if (current) {
      current.progress = progress;
      this.renderStatuses.set(sessionId, current);
    }
  }

  /**
   * Get render status for a session.
   */
  getStatus(sessionId: string): RenderStatus {
    return this.renderStatuses.get(sessionId) || {
      status: 'queued',
      progress: 0,
    };
  }

  /**
   * Get the output file path for a rendered session.
   */
  getOutputPath(sessionId: string): string | null {
    const status = this.renderStatuses.get(sessionId);
    if (status?.status === 'done' && status.outputPath && existsSync(status.outputPath)) {
      return status.outputPath;
    }

    // Fallback: check if file exists on disk
    const outputPath = join(tmpdir(), `adably-storyboard-${sessionId}`, 'output.mp4');
    if (existsSync(outputPath)) return outputPath;

    return null;
  }

  /**
   * Upload rendered MP4 to MinIO storage for social publish pipeline.
   */
  async uploadToStorage(sessionId: string, slug?: string): Promise<{ url: string }> {
    const filePath = this.getOutputPath(sessionId);
    if (!filePath) {
      throw new BadRequestException('Video belum di-render atau session sudah expired');
    }

    const videoBuffer = await readFile(filePath);
    const filename = slug ? `${slug}-storyboard.mp4` : `storyboard-${sessionId.slice(0, 8)}.mp4`;

    const url = await this.storageService.uploadFile(
      videoBuffer,
      'video/mp4',
      filename,
      'storyboard-video',
    );

    this.logger.log(`📦 Storyboard video uploaded to MinIO: ${url} (${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB)`);
    return { url };
  }

  /**
   * Link storyboard video URL and/or MP4 URL to a content item.
   */
  async linkToContent(contentId: string, videoUrl?: string, mp4Url?: string) {
    const content = await this.prisma.contentItem.findUnique({
      where: { id: contentId },
      select: { id: true, title: true },
    });
    if (!content) throw new BadRequestException('Konten tidak ditemukan');

    const updateData: any = {};
    if (videoUrl !== undefined) updateData.storyboardVideoUrl = videoUrl || null;
    if (mp4Url !== undefined) updateData.storyboardMp4Url = mp4Url || null;

    await this.prisma.contentItem.update({
      where: { id: contentId },
      data: updateData,
    });

    this.logger.log(`🔗 Storyboard linked to "${content.title}": video=${videoUrl || 'none'}, mp4=${mp4Url || 'none'}`);
    return { success: true, contentId, videoUrl, mp4Url };
  }

  /**
   * Remove storyboard video link from content.
   */
  async unlinkFromContent(contentId: string) {
    const content = await this.prisma.contentItem.findUnique({
      where: { id: contentId },
      select: { id: true, title: true, storyboardMp4Url: true },
    });
    if (!content) throw new BadRequestException('Konten tidak ditemukan');

    // Delete from MinIO if exists
    if (content.storyboardMp4Url) {
      await this.storageService.deleteFile(content.storyboardMp4Url).catch(() => {});
    }

    await this.prisma.contentItem.update({
      where: { id: contentId },
      data: { storyboardVideoUrl: null, storyboardMp4Url: null },
    });

    this.logger.log(`🔗 Storyboard unlinked from "${content.title}"`);
    return { success: true, contentId };
  }

  /**
   * Get published content list for linking dropdown.
   */
  async getPublishedContentList() {
    const items = await this.prisma.contentItem.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        storyboardVideoUrl: true,
        storyboardMp4Url: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 200,
    });
    return items;
  }

  /**
   * Delete a specific file from a session directory.
   */
  deleteSessionAsset(sessionId: string, fileId: string) {
    const sessionDir = join(tmpdir(), `adably-storyboard-${sessionId}`);
    if (!existsSync(sessionDir)) {
      throw new BadRequestException('Session tidak ditemukan');
    }

    // Security: prevent path traversal
    const sanitizedId = fileId.replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = join(sessionDir, sanitizedId);

    if (!filePath.startsWith(sessionDir)) {
      throw new BadRequestException('Invalid file path');
    }

    if (!existsSync(filePath)) {
      throw new BadRequestException('File tidak ditemukan di session');
    }

    try {
      unlinkSync(filePath);
      this.logger.log(`Deleted asset ${sanitizedId} from session ${sessionId}`);
      return { success: true, deleted: sanitizedId };
    } catch (err) {
      this.logger.error(`Failed to delete asset: ${err.message}`);
      throw new BadRequestException('Gagal menghapus file');
    }
  }
}
