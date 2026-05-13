import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { StorageService } from '../common/storage/storage.service';

const execFileAsync = promisify(execFile);

/**
 * Generates MP4 video from a static image + audio file using FFmpeg.
 * Used by the social publish pipeline to convert content into video format
 * for platforms like YouTube, Instagram Reels, Facebook Reels, and TikTok.
 */
@Injectable()
export class VideoGeneratorService {
  private readonly logger = new Logger(VideoGeneratorService.name);

  constructor(private readonly storageService: StorageService) {}

  /**
   * Generate an MP4 video from a thumbnail image and audio file.
   * Downloads both from MinIO, combines with FFmpeg, uploads result back to MinIO.
   *
   * @param imageUrl   - Public URL of the thumbnail image (from MinIO)
   * @param audioUrl   - Public URL of the audio file (from MinIO)
   * @param slug       - Content slug for naming the output file
   * @param aspectRatio - '16:9' for YouTube, '9:16' for Reels/TikTok
   * @returns Public URL of the generated MP4 in MinIO
   */
  async generateVideo(
    imageUrl: string,
    audioUrl: string,
    slug: string,
    aspectRatio: '16:9' | '9:16' = '16:9',
  ): Promise<string> {
    let tempDir: string | null = null;

    try {
      // 1. Create temp directory
      tempDir = await mkdtemp(join(tmpdir(), 'adably-video-'));
      const imagePath = join(tempDir, 'thumb.jpg');
      const audioPath = join(tempDir, 'audio.mp3');
      const outputPath = join(tempDir, 'output.mp4');

      // 2. Download image and audio from MinIO
      this.logger.log(`🎬 Downloading assets for video: ${slug}`);
      const [imageRes, audioRes] = await Promise.all([
        fetch(imageUrl),
        fetch(audioUrl),
      ]);

      if (!imageRes.ok) throw new Error(`Failed to download image: ${imageRes.status}`);
      if (!audioRes.ok) throw new Error(`Failed to download audio: ${audioRes.status}`);

      const [imageBuffer, audioBuffer] = await Promise.all([
        imageRes.arrayBuffer(),
        audioRes.arrayBuffer(),
      ]);

      await Promise.all([
        writeFile(imagePath, Buffer.from(imageBuffer)),
        writeFile(audioPath, Buffer.from(audioBuffer)),
      ]);

      // 3. Determine video dimensions based on aspect ratio
      const dimensions = aspectRatio === '9:16'
        ? { width: 1080, height: 1920 }
        : { width: 1280, height: 720 };

      // 4. Run FFmpeg to combine image + audio → MP4
      this.logger.log(`🎬 Generating ${aspectRatio} video: ${slug}`);
      const ffmpegArgs = [
        '-loop', '1',                          // Loop the image
        '-i', imagePath,                       // Input image
        '-i', audioPath,                       // Input audio
        '-c:v', 'libx264',                     // H.264 video codec
        '-tune', 'stillimage',                 // Optimize for still image
        '-c:a', 'aac',                         // AAC audio codec
        '-b:a', '192k',                        // Audio bitrate
        '-vf', `scale=${dimensions.width}:${dimensions.height}:force_original_aspect_ratio=decrease,pad=${dimensions.width}:${dimensions.height}:(ow-iw)/2:(oh-ih)/2:black`,
        '-pix_fmt', 'yuv420p',                 // Pixel format (max compatibility)
        '-shortest',                           // End when audio ends
        '-movflags', '+faststart',             // Web-optimized MP4
        '-y',                                  // Overwrite output
        outputPath,
      ];

      await execFileAsync('ffmpeg', ffmpegArgs, { timeout: 120000 }); // 2 min timeout

      // 5. Read the generated video
      const { readFile } = await import('fs/promises');
      const videoBuffer = await readFile(outputPath);

      // 6. Upload to MinIO
      const folder = aspectRatio === '9:16' ? 'social-video/portrait' : 'social-video/landscape';
      const videoUrl = await this.storageService.uploadFile(
        videoBuffer,
        'video/mp4',
        `${slug}.mp4`,
        folder,
      );

      this.logger.log(`✅ Video generated and uploaded: ${videoUrl} (${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB)`);
      return videoUrl;
    } catch (err) {
      this.logger.error(`❌ Video generation failed for ${slug}: ${err.message}`);
      throw err;
    } finally {
      // 7. Cleanup temp files
      if (tempDir) {
        const files = ['thumb.jpg', 'audio.mp3', 'output.mp4'];
        await Promise.allSettled(
          files.map(f => unlink(join(tempDir!, f)).catch(() => {})),
        );
        // Remove temp directory
        const { rmdir } = await import('fs/promises');
        await rmdir(tempDir).catch(() => {});
      }
    }
  }
}
