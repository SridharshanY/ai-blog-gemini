// backend/src/config/geminiClient.js
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY not set. Requests will fail until you set it in .env');
}

// Create and export a single ai client instance
export const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// default export if you prefer
export default ai;