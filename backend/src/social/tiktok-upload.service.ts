import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';

/**
 * Handles video upload to TikTok via Content Posting API v2.
 * Flow: init upload → upload video file → publish
 */
@Injectable()
export class TikTokUploadService {
  private readonly logger = new Logger(TikTokUploadService.name);

  /**
   * Upload and publish a video to TikTok.
   * @param accessToken - TikTok access token
   * @param videoPath - Local path to the MP4 file
   * @param caption - Video caption/description
   */
  async uploadVideo(
    accessToken: string,
    videoPath: string,
    caption: string,
  ): Promise<{ publishId: string }> {
    const videoBuffer = fs.readFileSync(videoPath);
    const videoSize = videoBuffer.length;

    // Step 1: Initialize upload
    this.logger.log(`Initializing TikTok upload (${(videoSize / 1024 / 1024).toFixed(1)} MB)...`);

    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/inbox/video/init/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: caption.substring(0, 150), // TikTok title max 150 chars
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: true,
          disable_stitch: true,
          disable_comment: false,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: videoSize,
          chunk_size: videoSize, // Single chunk upload
          total_chunk_count: 1,
        },
      }),
    });

    const initData = await initRes.json();
    if (!initRes.ok || initData.error?.code) {
      this.logger.error(`TikTok init failed: ${JSON.stringify(initData)}`);
      throw new Error(initData.error?.message || 'TikTok upload init failed');
    }

    const publishId = initData.data?.publish_id;
    const uploadUrl = initData.data?.upload_url;

    if (!publishId || !uploadUrl) {
      throw new Error('TikTok upload init returned no publish_id or upload_url');
    }

    // Step 2: Upload video file
    this.logger.log(`Uploading video to TikTok (publish_id: ${publishId})...`);

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': videoSize.toString(),
        'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`,
      },
      body: videoBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '');
      this.logger.error(`TikTok video upload failed: ${uploadRes.status} ${errText}`);
      throw new Error(`TikTok video upload failed: ${uploadRes.status}`);
    }

    this.logger.log(`TikTok upload complete (publish_id: ${publishId})`);
    return { publishId };
  }
}
