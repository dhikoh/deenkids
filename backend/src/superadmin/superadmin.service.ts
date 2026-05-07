import { Injectable, Logger, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const AI_SETTING_KEY = 'ai_checker_enabled';
const DONATION_ENABLED_KEY = 'donation_enabled';
const DONATION_TITLE_KEY = 'donation_title';
const DONATION_MESSAGE_KEY = 'donation_message';
const DONATION_METHODS_KEY = 'donation_methods';

// TTS & API setting keys
const TTS_KEYS = ['tts_provider', 'tts_api_key', 'tts_voice_id', 'tts_model', 'tts_language', 'tts_stability', 'tts_similarity'];
const AI_KEYS = ['ai_checker_enabled', 'ai_provider', 'ai_api_key'];

@Injectable()
export class SuperadminService {
  private readonly logger = new Logger(SuperadminService.name);

  constructor(private prisma: PrismaService) {}

  // ── Users ──
  async getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
        _count: { select: { contentItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserRole(userId: string, role: string) {
    const validRoles = ['AUTHOR', 'ADMIN', 'SUPERADMIN'];
    if (!validRoles.includes(role)) throw new BadRequestException('Role tidak valid');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
      select: { id: true, name: true, email: true, role: true },
    });
    this.logger.log(`Role updated: ${user.email} → ${role}`);
    return { data: updated, message: `Role ${user.name} berhasil diubah menjadi ${role}` };
  }

  // ── AI Config (legacy toggle) ──
  async getAiConfig() {
    const setting = await this.prisma.setting.findUnique({ where: { key: AI_SETTING_KEY } });
    return { aiEnabled: setting?.value === 'true' };
  }

  async toggleAi(enabled: boolean) {
    const setting = await this.prisma.setting.upsert({
      where: { key: AI_SETTING_KEY },
      update: { value: enabled.toString() },
      create: { key: AI_SETTING_KEY, value: enabled.toString(), group: 'ai' },
    });
    this.logger.log(`AI Toggle set to: ${enabled}`);
    return { aiEnabled: setting.value === 'true', message: 'AI Toggle updated successfully' };
  }

  // ── API Settings (TTS + AI provider config) ──
  async getApiSettings() {
    const allKeys = [...TTS_KEYS, ...AI_KEYS];
    const records = await this.prisma.setting.findMany({ where: { key: { in: allKeys } } });
    const get = (k: string, def = '') => records.find(r => r.key === k)?.value ?? def;

    return {
      tts: {
        provider: get('tts_provider', 'elevenlabs'),
        apiKey: get('tts_api_key') ? '••••••••' : '',   // masked — never expose raw key
        hasApiKey: !!get('tts_api_key'),
        voiceId: get('tts_voice_id', ''),
        model: get('tts_model', 'eleven_multilingual_v2'),
        language: get('tts_language', 'id'),
        stability: get('tts_stability', '0.5'),
        similarityBoost: get('tts_similarity', '0.75'),
      },
      ai: {
        provider: get('ai_provider', 'openai'),
        apiKey: get('ai_api_key') ? '••••••••' : '',
        hasApiKey: !!get('ai_api_key'),
        enabled: get('ai_checker_enabled', 'false') === 'true',
      },
    };
  }

  async updateApiSettings(settings: { key: string; value: string; group: string }[]) {
    const allowedKeys = [...TTS_KEYS, ...AI_KEYS];
    const filtered = settings.filter(s => allowedKeys.includes(s.key));
    await Promise.all(
      filtered.map(s =>
        this.prisma.setting.upsert({
          where: { key: s.key },
          update: { value: s.value, group: s.group },
          create: { key: s.key, value: s.value, group: s.group },
        }),
      ),
    );
    this.logger.log(`API settings updated: ${filtered.map(s => s.key).join(', ')}`);
    return { message: 'Pengaturan API berhasil disimpan', updated: filtered.length };
  }

  // ── TTS Generate — provider-agnostic ──
  async generateTts(blocks: { type: string; text: string }[]): Promise<Buffer> {
    const narrateText = blocks
      .filter(b => b.text?.trim())
      .map(b => b.text.trim())
      .join('\n\n');

    if (!narrateText) throw new BadRequestException('Tidak ada teks yang bisa dinarasikan');
    if (narrateText.length > 5000) throw new BadRequestException('Teks terlalu panjang (maks 5000 karakter)');

    const allKeys = [...TTS_KEYS];
    const records = await this.prisma.setting.findMany({ where: { key: { in: allKeys } } });
    const get = (k: string, def = '') => records.find(r => r.key === k)?.value ?? def;

    const provider = get('tts_provider', 'elevenlabs');
    const apiKey = get('tts_api_key');
    if (!apiKey) throw new BadRequestException('API key TTS belum dikonfigurasi. Silakan isi di Pengaturan → API');

    try {
      if (provider === 'elevenlabs') {
        return await this.callElevenLabs(narrateText, apiKey, get('tts_voice_id', ''), get('tts_model', 'eleven_multilingual_v2'), get('tts_stability', '0.5'), get('tts_similarity', '0.75'));
      } else if (provider === 'openai') {
        return await this.callOpenAiTts(narrateText, apiKey, get('tts_voice_id', 'alloy'), get('tts_model', 'tts-1'));
      } else if (provider === 'google') {
        return await this.callGoogleTts(narrateText, apiKey, get('tts_language', 'id-ID'));
      } else {
        throw new BadRequestException(`Provider TTS tidak dikenal: ${provider}`);
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`TTS generate failed: ${err.message}`);
      throw new InternalServerErrorException(`TTS gagal: ${err.message}`);
    }
  }

  private async callElevenLabs(text: string, apiKey: string, voiceId: string, model: string, stability: string, similarity: string): Promise<Buffer> {
    if (!voiceId) throw new BadRequestException('Voice ID ElevenLabs belum dikonfigurasi di Pengaturan → API');
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: model || 'eleven_multilingual_v2',
        voice_settings: { stability: parseFloat(stability) || 0.5, similarity_boost: parseFloat(similarity) || 0.75 },
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new InternalServerErrorException(`ElevenLabs error ${response.status}: ${errText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  private async callOpenAiTts(text: string, apiKey: string, voice: string, model: string): Promise<Buffer> {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model || 'tts-1', input: text, voice: voice || 'alloy', response_format: 'mp3' }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new InternalServerErrorException(`OpenAI TTS error ${response.status}: ${errText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  private async callGoogleTts(text: string, apiKey: string, languageCode: string): Promise<Buffer> {
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: languageCode || 'id-ID', ssmlGender: 'NEUTRAL' },
        audioConfig: { audioEncoding: 'MP3' },
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new InternalServerErrorException(`Google TTS error ${response.status}: ${errText}`);
    }
    const { audioContent } = await response.json();
    return Buffer.from(audioContent, 'base64');
  }

  // ── Donation Settings ──
  async getDonationSettings() {
    const [enabled, title, message, methods] = await Promise.all([
      this.prisma.setting.findUnique({ where: { key: DONATION_ENABLED_KEY } }),
      this.prisma.setting.findUnique({ where: { key: DONATION_TITLE_KEY } }),
      this.prisma.setting.findUnique({ where: { key: DONATION_MESSAGE_KEY } }),
      this.prisma.setting.findUnique({ where: { key: DONATION_METHODS_KEY } }),
    ]);
    return {
      enabled: enabled?.value === 'true',
      title: title?.value || 'Dukung Adably 🌱',
      message: message?.value || 'Dukung kami terus menyajikan konten parenting islami secara gratis.',
      methods: methods?.value ? JSON.parse(methods.value) : [],
    };
  }

  async updateDonationSettings(body: { enabled: boolean; title?: string; message?: string; methods?: { type: string; label: string; value: string; icon?: string }[] }) {
    await Promise.all([
      this.prisma.setting.upsert({ where: { key: DONATION_ENABLED_KEY }, update: { value: body.enabled.toString() }, create: { key: DONATION_ENABLED_KEY, value: body.enabled.toString(), group: 'donation' } }),
      body.title !== undefined && this.prisma.setting.upsert({ where: { key: DONATION_TITLE_KEY }, update: { value: body.title }, create: { key: DONATION_TITLE_KEY, value: body.title, group: 'donation' } }),
      body.message !== undefined && this.prisma.setting.upsert({ where: { key: DONATION_MESSAGE_KEY }, update: { value: body.message }, create: { key: DONATION_MESSAGE_KEY, value: body.message, group: 'donation' } }),
      body.methods !== undefined && this.prisma.setting.upsert({ where: { key: DONATION_METHODS_KEY }, update: { value: JSON.stringify(body.methods) }, create: { key: DONATION_METHODS_KEY, value: JSON.stringify(body.methods), group: 'donation' } }),
    ].filter(Boolean));
    this.logger.log('Donation settings updated');
    return { message: 'Pengaturan donasi berhasil disimpan' };
  }

  // ── Announcement Banner ──
  async getAnnouncementSettings() {
    const keys = ['announcement_enabled', 'announcement_text', 'announcement_type', 'announcement_link'];
    const settings = await this.prisma.setting.findMany({ where: { key: { in: keys } } });
    const get = (k: string) => settings.find(s => s.key === k)?.value;
    return {
      enabled: get('announcement_enabled') === 'true',
      text: get('announcement_text') || '',
      type: get('announcement_type') || 'info',
      link: get('announcement_link') || '',
    };
  }

  async updateAnnouncementSettings(body: { enabled: boolean; text?: string; type?: string; link?: string }) {
    const upsert = (key: string, value: string) => this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value, group: 'announcement' },
    });
    await Promise.all([
      upsert('announcement_enabled', body.enabled.toString()),
      body.text !== undefined && upsert('announcement_text', body.text),
      body.type !== undefined && upsert('announcement_type', body.type),
      body.link !== undefined && upsert('announcement_link', body.link),
    ].filter(Boolean));
    this.logger.log('Announcement settings updated');
    return { message: 'Pengaturan pengumuman berhasil disimpan' };
  }

  // ── Homepage Visibility Config ──
  private readonly HOMEPAGE_KEYS = {
    pembelajaran: 'section_pembelajaran_visible',
    qna: 'section_qna_visible',
    kisah: 'section_kisah_visible',
    article: 'section_article_visible',
  };

  async getHomepageConfig() {
    const keys = Object.values(this.HOMEPAGE_KEYS);
    const settings = await this.prisma.setting.findMany({ where: { key: { in: keys } } });
    const get = (k: string) => settings.find(s => s.key === k)?.value;
    return {
      pembelajaran: get(this.HOMEPAGE_KEYS.pembelajaran) !== 'false', // default visible
      qna: get(this.HOMEPAGE_KEYS.qna) !== 'false',
      kisah: get(this.HOMEPAGE_KEYS.kisah) !== 'false',
      article: get(this.HOMEPAGE_KEYS.article) !== 'false',
    };
  }

  async updateHomepageConfig(body: { pembelajaran?: boolean; qna?: boolean; kisah?: boolean; article?: boolean }) {
    const upsert = (key: string, value: string) => this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value, group: 'homepage' },
    });
    const ops: Promise<any>[] = [];
    if (body.pembelajaran !== undefined) ops.push(upsert(this.HOMEPAGE_KEYS.pembelajaran, body.pembelajaran.toString()));
    if (body.qna !== undefined) ops.push(upsert(this.HOMEPAGE_KEYS.qna, body.qna.toString()));
    if (body.kisah !== undefined) ops.push(upsert(this.HOMEPAGE_KEYS.kisah, body.kisah.toString()));
    if (body.article !== undefined) ops.push(upsert(this.HOMEPAGE_KEYS.article, body.article.toString()));
    await Promise.all(ops);
    this.logger.log('Homepage visibility config updated');
    return { message: 'Pengaturan visibilitas beranda berhasil disimpan' };
  }
}
