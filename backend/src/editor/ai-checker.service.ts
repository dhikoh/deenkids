import { Injectable } from '@nestjs/common';
import { CreateContentDto } from './dto/editor.dto';
// import OpenAI from 'openai';

@Injectable()
export class AiCheckerService {
  // private openai: OpenAI;

  constructor() {
    /*
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    */
  }

  async validateContent(dto: CreateContentDto) {
    // Simulasi AI Validation untuk sementara
    // Nanti akan dihubungkan ke OpenAI API betulan sesuai prompt Manhaj Salaf
    
    console.log('🤖 AI Checking content:', dto.title);
    
    // Simulate API Delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      score: 85,
      breakdown: {
        dalilAccuracy: 90,
        ageAppropriate: 80,
        syariCompliance: 100,
      },
      issues: [
        { type: 'tone', message: 'Analogi tentang kamera CCTV mungkin terlalu kaku untuk anak 3 tahun.' }
      ],
      suggestions: [
        { text: 'Gunakan perumpamaan cahaya matahari yang bisa masuk ke mana saja.' }
      ]
    };
  }
}
