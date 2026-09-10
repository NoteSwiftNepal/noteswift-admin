import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const apiKey = (process.env.GEMINI_API_KEY || '').trim();

export const ai = genkit({
  plugins: [googleAI({
    apiKey: apiKey || undefined,
  })],
  model: 'googleai/gemini-3.6-flash',
});

