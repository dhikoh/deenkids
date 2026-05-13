import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Handles TikTok OAuth2 flow and token management.
 * Uses TikTok Login Kit for authorization and Content Posting API for publishing.
 *
 * Required env vars:
 * - TIKTOK_CLIENT_KEY
 * - TIKTOK_CLIENT_SECRET
 * - TIKTOK_REDIRECT_URI
 */
@Injectable()
export class TikTokTokenService {
  private readonly logger = new Logger(TikTokTokenService.name);
  private readonly clientKey: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(private readonly config: ConfigService) {
    this.clientKey = this.config.get<string>('TIKTOK_CLIENT_KEY') || '';
    this.clientSecret = this.config.get<string>('TIKTOK_CLIENT_SECRET') || '';
    this.redirectUri = this.config.get<string>('TIKTOK_REDIRECT_URI') || '';
  }

  /**
   * Generate TikTok OAuth URL for user authorization.
   */
  getAuthUrl(state: string): string {
    const scopes = 'user.info.basic,video.upload,video.publish';
    return `https://www.tiktok.com/v2/auth/authorize/?client_key=${this.clientKey}&scope=${scopes}&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${state}`;
  }

  /**
   * Exchange authorization code for access + refresh tokens.
   */
  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    openId: string;
    expiresIn: number;
  }> {
    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      this.logger.error(`TikTok token exchange failed: ${JSON.stringify(data)}`);
      throw new Error(data.error_description || 'TikTok token exchange failed');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      openId: data.open_id,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Refresh access token using refresh token.
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      this.logger.error(`TikTok token refresh failed: ${JSON.stringify(data)}`);
      throw new Error(data.error_description || 'TikTok token refresh failed');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Get TikTok user info (display name, avatar).
   */
  async getUserInfo(accessToken: string): Promise<{ displayName: string; avatarUrl: string }> {
    const res = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json();
    if (!res.ok || data.error?.code) {
      throw new Error(data.error?.message || 'Failed to get TikTok user info');
    }

    return {
      displayName: data.data?.user?.display_name || 'TikTok User',
      avatarUrl: data.data?.user?.avatar_url || '',
    };
  }
}
