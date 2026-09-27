export interface MTGCardData {
  name: string;
  manaCost: string;
  colorIdentity: 'White' | 'Blue' | 'Black' | 'Red' | 'Green' | 'Multicolor' | 'Colorless' | 'Artifact';
  typeLine: string;
  oracleText: string;
  flavorText: string;
  power?: string;
  toughness?: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Mythic Rare';
  artPrompt: string;
}

export interface GenerateCardResponse {
  card: MTGCardData;
  imageBase64: string;
}