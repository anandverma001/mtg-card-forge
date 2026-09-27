import { GoogleGenAI, Type } from '@google/genai';
import { MTGCardData, GenerateCardResponse } from './types';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const CARD_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: 'Card title' },
    manaCost: { type: Type.STRING, description: 'Mana cost using MTG bracket syntax like {1}{U}{R}' },
    colorIdentity: { 
      type: Type.STRING, 
      enum: ['White', 'Blue', 'Black', 'Red', 'Green', 'Multicolor', 'Colorless', 'Artifact'] 
    },
    typeLine: { type: Type.STRING, description: 'Card type line, e.g. Creature — Elemental' },
    oracleText: { type: Type.STRING, description: 'Rules text using official MTG wording standards' },
    flavorText: { type: Type.STRING, description: 'Italicized flavor or lore text' },
    power: { type: Type.STRING, description: 'Power if creature/vehicle, otherwise omit' },
    toughness: { type: Type.STRING, description: 'Toughness if creature/vehicle, otherwise omit' },
    rarity: { 
      type: Type.STRING, 
      enum: ['Common', 'Uncommon', 'Rare', 'Mythic Rare'] 
    },
    artPrompt: {
      type: Type.STRING,
      description: 'Vivid, dramatic visual description of the fantasy scene without UI or borders'
    }
  },
  required: ['name', 'manaCost', 'colorIdentity', 'typeLine', 'oracleText', 'flavorText', 'rarity', 'artPrompt'],
};

// Helper: Tries model with retries, then cascades to fallback models if busy
async function generateCardContentWithFallback(prompt: string): Promise<string> {
  const models = ['gemini-3.8-flash', 'gemini-3.8-pro', 'gemini-2.0-flash'];

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Generating card with ${model} (attempt ${attempt})...`);
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: CARD_SCHEMA,
          },
        });
        if (response.text) return response.text;
      } catch (err: any) {
        const isBusy = err?.code === 503 || err?.status === 'UNAVAILABLE' || err?.message?.includes('high demand');
        if (isBusy) {
          console.warn(`${model} is busy (503). Retrying in 2 seconds...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          console.warn(`Model ${model} returned error:`, err?.message || err);
          break; // Move to next fallback model
        }
      }
    }
  }

  throw new Error('All model endpoints are currently experiencing heavy traffic. Please wait 15 seconds and try again.');
}

export async function generateMTGCard(theme: string): Promise<GenerateCardResponse> {
  const prompt = `Design an authentic, mechanically balanced, and flavorful Magic: The Gathering card based on this theme: "${theme}".`;
  const rawJson = await generateCardContentWithFallback(prompt);
  const cardData: MTGCardData = JSON.parse(rawJson);

  // Fallback vector visual for developer keys
  const fallbackSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <defs>
        <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="50%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#020617"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#cardBg)"/>
      <circle cx="200" cy="130" r="60" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="8,6"/>
      <text x="200" y="136" fill="#f8fafc" font-family="Georgia, serif" font-size="16" font-weight="bold" text-anchor="middle">${cardData.name}</text>
      <text x="200" y="220" fill="#94a3b8" font-family="sans-serif" font-size="11" text-anchor="middle">${cardData.typeLine}</text>
    </svg>
  `.trim();

  return {
    card: cardData,
    imageBase64: `data:image/svg+xml;utf8,${encodeURIComponent(fallbackSvg)}`,
  };
}