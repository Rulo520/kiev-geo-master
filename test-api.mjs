import { GoogleGenAI } from "@google/genai";
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const apiKey = env.match(/GEMINI_API_KEY=(.*)/)[1];

const aiClient = new GoogleGenAI({ apiKey });

async function test(modelRaw) {
    const prompt = "Please respond with valid JSON: {\"bluf_score\": 5}";
    const responseAI = await aiClient.models.generateContent({
      model: modelRaw,
      contents: [prompt],
    });
    console.log(responseAI);
    console.log("text typeof:", typeof responseAI.text);
    console.log("text:", responseAI.text);
}

test('gemini-2.5-flash');
