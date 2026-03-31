import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  try {
    const prompt = "hello world";
    const responseAI = await aiClient.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [prompt],
      config: {
        responseMimeType: "application/json",
        temperature: 0
      }
    });
    console.log(responseAI.text);
  } catch (err) {
    console.error(err);
  }
}

test();
