import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { extname } from 'path';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;
  private enabled: boolean;

  constructor(private config: ConfigService) {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT');
    this.bucket = this.config.get<string>('MINIO_BUCKET') || 'adably';
    this.enabled = !!endpoint;

    if (!this.enabled) {
      this.logger.warn('⚠️  MINIO_ENDPOINT not set — file uploads will fail. Configure MinIO env vars.');
      return;
    }

    this.publicUrl = `${endpoint}/${this.bucket}`;
    this.client = new S3Client({
      endpoint,
      region: 'us-east-1', // Required by SDK; MinIO ignores it
      credentials: {
        accessKeyId: this.config.get<string>('MINIO_ACCESS_KEY') || '',
        secretAccessKey: this.config.get<string>('MINIO_SECRET_KEY') || '',
      },
      forcePathStyle: true, // Required for MinIO path-style URLs
    });
  }

  async onModuleInit() {
    if (!this.enabled) return;
    await this.ensureBucketReady();
  }

  /**
   * Ensure bucket exists with public-read policy.
   * Idempotent — safe to call on every startup.
   */
  private async ensureBucketReady(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`✅ MinIO bucket '${this.bucket}' ready`);
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        // Set public-read policy so files are accessible via URL without auth
        const policy = JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucket}/*`],
            },
          ],
        });
        await this.client.send(
          new PutBucketPolicyCommand({ Bucket: this.bucket, Policy: policy }),
        );
        this.logger.log(`✅ MinIO bucket '${this.bucket}' created with public-read policy`);
      } catch (err) {
        this.logger.error(`❌ Failed to initialize MinIO bucket: ${err.message}`);
      }
    }
  }

  /**
   * Upload a file buffer to MinIO.
   * @param buffer   - File content as Buffer (from memoryStorage)
   * @param mimetype - MIME type of the file
   * @param originalName - Original filename (used to preserve extension)
   * @param folder   - Optional subfolder prefix inside the bucket (e.g. 'content', 'banners')
   * @returns Full public URL of the uploaded file
   */
  async uploadFile(
    buffer: Buffer,
    mimetype: string,
    originalName: string,
    folder: string = '',
  ): Promise<string> {
    if (!this.enabled) throw new Error('Storage service is not configured (MINIO_ENDPOINT missing)');

    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${unique}${extname(originalName)}`;
    const key = folder ? `${folder}/${filename}` : filename;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      }),
    );

    return `${this.publicUrl}/${key}`;
  }

  /**
   * Delete a file from MinIO by its public URL.
   * Safe to call even if URL doesn't match this MinIO instance (no-op).
   */
  async deleteFile(url: string): Promise<void> {
    if (!this.enabled || !url || !url.includes(this.bucket)) return;
    try {
      // Extract key from full URL
      const key = url.replace(`${this.publicUrl}/`, '');
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (err) {
      this.logger.warn(`⚠️  Failed to delete file from MinIO: ${err.message}`);
    }
  }

  /**
   * List all files in a folder prefix.
   * Returns array of { key, url, lastModified, size }.
   */
  async listFiles(prefix: string): Promise<{ key: string; url: string; lastModified: Date; size: number }[]> {
    if (!this.enabled) return [];
    const results: { key: string; url: string; lastModified: Date; size: number }[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      for (const obj of response.Contents || []) {
        if (obj.Key) {
          results.push({
            key: obj.Key,
            url: `${this.publicUrl}/${obj.Key}`,
            lastModified: obj.LastModified || new Date(),
            size: obj.Size || 0,
          });
        }
      }
      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return results;
  }
}
