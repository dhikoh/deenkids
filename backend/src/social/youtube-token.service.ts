import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { encrypt, decrypt } from '../common/utils/encryption.util';

/**
 * Handles YouTube OAuth2 token exchange and API authentication.
 * Uses Google OAuth2 with YouTube Data API v3 scopes.
 */
@Injectable()
export class YouTubeTokenService {
  private readonly logger = new Logger(YouTubeTokenService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly encryptionKey: string;

  constructor(private config: ConfigService) {
    this.clientId = this.config.get<string>('YOUTUBE_CLIENT_ID') || '';
    this.clientSecret = this.config.get<string>('YOUTUBE_CLIENT_SECRET') || '';
    this.redirectUri = this.config.get<string>('YOUTUBE_REDIRECT_URI') || '';
    this.encryptionKey = this.config.get<string>('SOCIAL_ENCRYPTION_KEY') || '';
  }

  /**
   * Generate the OAuth2 consent URL for YouTube.
   * Requests youtube.upload and youtube scopes.
   */
  getAuthUrl(csrfState: string): string {
    if (!this.clientId) {
      throw new BadRequestException('YOUTUBE_CLIENT_ID belum dikonfigurasi.');
    }

    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.readonly',
    ].join(' ');

    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${csrfState}`;
  }

  /**
   * Exchange authorization code for access + refresh tokens.
   */
  async exchangeCodeForTokens(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const data = await res.json();
    if (data.error) {
      this.logger.error(`YouTube OAuth failed: ${JSON.stringify(data)}`);
      throw new BadRequestException(data.error_description || 'YouTube OAuth gagal');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  /**
   * Refresh an expired access token using the refresh token.
   */
  async refreshAccessToken(encryptedRefreshToken: string): Promise<string> {
    const refreshToken = this.decryptToken(encryptedRefreshToken);

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    const data = await res.json();
    if (data.error) {
      this.logger.error(`YouTube token refresh failed: ${JSON.stringify(data)}`);
      throw new BadRequestException('Gagal refresh token YouTube. Silakan hubungkan ulang.');
    }

    return data.access_token;
  }

  /**
   * Fetch the authenticated user's YouTube channel info.
   */
  async fetchChannelInfo(accessToken: string): Promise<{ channelId: string; channelTitle: string; thumbnailUrl: string | null }> {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json();
    if (data.error) {
      throw new BadRequestException(data.error.message || 'Gagal mengambil info channel YouTube');
    }

    const channel = data.items?.[0];
    if (!channel) {
      throw new BadRequestException('Tidak ditemukan YouTube channel untuk akun ini.');
    }

    return {
      channelId: channel.id,
      channelTitle: channel.snippet.title,
      thumbnailUrl: channel.snippet.thumbnails?.default?.url || null,
    };
  }

  /**
   * Validate if the refresh token still works.
   */
  async validateToken(encryptedRefreshToken: string): Promise<boolean> {
    try {
      await this.refreshAccessToken(encryptedRefreshToken);
      return true;
    } catch {
      return false;
    }
  }

  encryptToken(plainToken: string): string {
    if (!this.encryptionKey) {
      this.logger.warn('SOCIAL_ENCRYPTION_KEY not set — storing token in plain text');
      return plainToken;
    }
    return encrypt(plainToken, this.encryptionKey);
  }

  decryptToken(encryptedToken: string): string {
    if (!this.encryptionKey || !encryptedToken.includes(':')) {
      return encryptedToken;
    }
    return decrypt(encryptedToken, this.encryptionKey);
  }
}
