import { Injectable, Logger } from '@nestjs/common';
import { YouTubeTokenService } from './youtube-token.service';

/**
 * Handles YouTube video upload using the YouTube Data API v3.
 * Supports resumable uploads for reliable video publishing.
 */
@Injectable()
export class YouTubeUploadService {
  private readonly logger = new Logger(YouTubeUploadService.name);

  constructor(private readonly tokenService: YouTubeTokenService) {}

  /**
   * Upload a video to YouTube from a public URL.
   * Uses the resumable upload protocol for reliability.
   *
   * @param encryptedRefreshToken - Encrypted refresh token from database
   * @param videoUrl              - Public URL of the MP4 video (from MinIO)
   * @param title                 - Video title
   * @param description           - Video description
   * @param tags                  - Video tags
   * @param categoryId            - YouTube category ID (27 = Education)
   * @returns { videoId, videoUrl }
   */
  async uploadVideo(
    encryptedRefreshToken: string,
    videoUrl: string,
    title: string,
    description: string,
    tags: string[] = [],
    categoryId: string = '27', // Education
  ): Promise<{ videoId: string; videoUrl: string }> {
    // 1. Get fresh access token
    const accessToken = await this.tokenService.refreshAccessToken(encryptedRefreshToken);

    // 2. Download video from MinIO into buffer
    this.logger.log(`📥 Downloading video for YouTube upload: ${title}`);
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Failed to download video: ${videoRes.status}`);
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

    // 3. Initialize resumable upload
    this.logger.log(`📤 Initiating YouTube upload: ${title} (${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB)`);
    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': 'video/mp4',
          'X-Upload-Content-Length': videoBuffer.length.toString(),
        },
        body: JSON.stringify({
          snippet: {
            title: title.substring(0, 100), // YouTube title max 100 chars
            description: description.substring(0, 5000), // YouTube desc max 5000 chars
            tags: tags.slice(0, 30), // YouTube max 30 tags
            categoryId,
            defaultLanguage: 'id',
            defaultAudioLanguage: 'id',
          },
          status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: true, // Adably is kids content
          },
        }),
      },
    );

    if (!initRes.ok) {
      const errorData = await initRes.json().catch(() => ({}));
      throw new Error(`YouTube upload init failed: ${initRes.status} ${JSON.stringify(errorData)}`);
    }

    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) throw new Error('YouTube did not return upload URL');

    // 4. Upload the actual video bytes
    this.logger.log(`📤 Uploading video bytes to YouTube...`);
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': videoBuffer.length.toString(),
      },
      body: videoBuffer,
    });

    if (!uploadRes.ok) {
      const errorData = await uploadRes.json().catch(() => ({}));
      throw new Error(`YouTube upload failed: ${uploadRes.status} ${JSON.stringify(errorData)}`);
    }

    const result = await uploadRes.json();
    const videoId = result.id;
    const ytVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    this.logger.log(`✅ YouTube upload complete: ${ytVideoUrl}`);
    return { videoId, videoUrl: ytVideoUrl };
  }
}
