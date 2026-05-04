import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { encrypt, decrypt } from '../common/utils/encryption.util';

/**
 * Handles Meta OAuth token exchange, page discovery, and token lifecycle.
 */
@Injectable()
export class SocialTokenService {
  private readonly logger = new Logger(SocialTokenService.name);
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly redirectUri: string;
  private readonly configId: string;
  private readonly encryptionKey: string;
  private readonly graphBaseUrl = 'https://graph.facebook.com/v19.0';

  constructor(private config: ConfigService) {
    this.appId = this.config.get<string>('META_APP_ID') || '';
    this.appSecret = this.config.get<string>('META_APP_SECRET') || '';
    this.redirectUri = this.config.get<string>('META_REDIRECT_URI') || '';
    this.configId = this.config.get<string>('META_CONFIG_ID') || '';
    this.encryptionKey = this.config.get<string>('SOCIAL_ENCRYPTION_KEY') || '';
  }

  /**
   * Generate the OAuth login URL for Facebook Login for Business.
   * Uses config_id (configured in Meta Developer Console) instead of individual scopes.
   * This is required for apps registered under a Business Portfolio.
   */
  getAuthUrl(csrfState: string): string {
    if (!this.configId) {
      this.logger.error('META_CONFIG_ID is not set — Facebook Login for Business requires a config_id');
      throw new BadRequestException('META_CONFIG_ID belum dikonfigurasi. Hubungi administrator.');
    }

    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${this.appId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&config_id=${this.configId}&state=${csrfState}&response_type=code&override_default_response_type=true`;
  }

  /**
   * Exchange authorization code for a short-lived token, then long-lived token.
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    // Step 1: Code → short-lived token
    const shortUrl = `${this.graphBaseUrl}/oauth/access_token?client_id=${this.appId}&client_secret=${this.appSecret}&redirect_uri=${encodeURIComponent(this.redirectUri)}&code=${code}`;
    const shortRes = await fetch(shortUrl);
    const shortData = await shortRes.json();
    if (shortData.error) {
      this.logger.error(`OAuth code exchange failed: ${JSON.stringify(shortData.error)}`);
      throw new BadRequestException(shortData.error.message || 'OAuth code exchange failed');
    }

    // Step 2: Short-lived → long-lived token
    const longUrl = `${this.graphBaseUrl}/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.appId}&client_secret=${this.appSecret}&fb_exchange_token=${shortData.access_token}`;
    const longRes = await fetch(longUrl);
    const longData = await longRes.json();
    if (longData.error) {
      this.logger.error(`Token exchange failed: ${JSON.stringify(longData.error)}`);
      throw new BadRequestException(longData.error.message || 'Token exchange failed');
    }

    return longData.access_token;
  }

  /**
   * Fetch all Facebook Pages the user manages.
   */
  async fetchPages(userToken: string): Promise<any[]> {
    const url = `${this.graphBaseUrl}/me/accounts?access_token=${userToken}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
      throw new BadRequestException(data.error.message || 'Failed to fetch pages');
    }
    return data.data || [];
  }

  /**
   * Fetch the Instagram Business Account linked to a Facebook Page.
   */
  async fetchIgAccount(pageId: string, pageToken: string): Promise<{ igId: string | null; igUsername: string | null; profilePictureUrl: string | null }> {
    const url = `${this.graphBaseUrl}/${pageId}?fields=instagram_business_account,name,picture&access_token=${pageToken}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.instagram_business_account) {
      return { igId: null, igUsername: null, profilePictureUrl: data.picture?.data?.url || null };
    }

    const igId = data.instagram_business_account.id;
    // Fetch IG username
    const igUrl = `${this.graphBaseUrl}/${igId}?fields=username,profile_picture_url&access_token=${pageToken}`;
    const igRes = await fetch(igUrl);
    const igData = await igRes.json();

    return {
      igId,
      igUsername: igData.username || null,
      profilePictureUrl: igData.profile_picture_url || data.picture?.data?.url || null,
    };
  }

  /**
   * Validate a page access token using the debug_token endpoint.
   */
  async validateToken(pageToken: string): Promise<boolean> {
    try {
      const decrypted = this.decryptToken(pageToken);
      const url = `${this.graphBaseUrl}/debug_token?input_token=${decrypted}&access_token=${this.appId}|${this.appSecret}`;
      const res = await fetch(url);
      const data = await res.json();
      return data.data?.is_valid === true;
    } catch {
      return false;
    }
  }

  /**
   * Encrypt a token for database storage.
   */
  encryptToken(plainToken: string): string {
    if (!this.encryptionKey) {
      this.logger.warn('SOCIAL_ENCRYPTION_KEY not set — storing token in plain text (NOT RECOMMENDED)');
      return plainToken;
    }
    return encrypt(plainToken, this.encryptionKey);
  }

  /**
   * Decrypt a token from database storage.
   */
  decryptToken(encryptedToken: string): string {
    if (!this.encryptionKey || !encryptedToken.includes(':')) {
      return encryptedToken; // Not encrypted or no key
    }
    return decrypt(encryptedToken, this.encryptionKey);
  }
}
