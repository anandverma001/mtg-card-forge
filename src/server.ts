import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { generateMTGCard } from './cardGenerator';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.post('/api/generate-card', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'A card prompt or concept is required.' });
    }

    const cardPayload = await generateMTGCard(prompt);
    res.json(cardPayload);
  } catch (err: any) {
    console.error('Generation Error:', err);
    res.status(500).json({ error: err.message || 'Error generating card.' });
  }
});

app.listen(port, () => {
  console.log(`🧙 MTG Card Forge running at http://localhost:${port}`);
});