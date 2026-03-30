import * as cheerio from "cheerio";
import { GoogleGenAI } from "@google/genai";

// Inicializar cliente de Gemini (si hay API Key disponible)
let aiClient = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// Helper function to check if a valid file exists on the server
async function checkFileExists(baseUrl, path) {
  try {
    const res = await fetch(new URL(path, baseUrl).href, { method: "HEAD" });
    return res.ok;
  } catch (error) {
    return false;
  }
}

// Main analyzer function
export async function analyzeWebsite(url) {
  const startTime = Date.now();
  try {
    const response = await fetch(url);
    const latency = Date.now() - startTime; // Medición de latencia real
    
    if (!response.ok) throw new Error("No se pudo acceder a la URL");
    
    const html = await response.text();
    const $ = cheerio.load(html);

    // --- 1. Auditoría Técnica (Heurística) ---
    const hasRobots = await checkFileExists(url, "/robots.txt");
    const hasLlms = await checkFileExists(url, "/llms.txt");
    const isBotBlocked = html.includes("GPTBot") || html.includes("CCBot");
    const schemasFound = $('script[type="application/ld+json"]').length;
    const hasGoodHierarchy = $('h1').length === 1 && $('h2').length > 0;
    const isSSR = !html.includes("id=\"__NEXT_DATA__\"") || html.length > 5000;
    const hasAuthor = html.toLowerCase().includes('author') || html.toLowerCase().includes('by ');

    // --- 2. Estructura de Contenido (Base) ---
    const textContent = $('p, h1, h2, h3, li').text();
    const blufFound = textContent.substring(0, 300).includes("es ") || textContent.substring(0, 300).includes("somos ");
    const blufScoreBase = blufFound ? 9 : 3;
    const statsCount = (textContent.match(/\d+(?:\.\d+)?%/g) || []).length + (textContent.match(/\d{4}/g) || []).length;
    const isScannable = $('ul').length > 1 && $('h2').length > 2;

    // --- 3. Generative Engine Optimization 2026 Metrics ---
    let somSimulation = 20;
    let ragProbability = "Baja";
    let sentiment = "Neutral";
    let aiResult = null;
    let blufScore = blufScoreBase;
    let cleanText = textContent.replace(/\s+/g, ' ').substring(0, 4000);
    
    if (aiClient) {
      try {
        const prompt = `Analiza semánticamente el siguiente extracto de texto de una página web, y califica su optimización para Answer Engine Optimization (AEO) y RAG.
Evalúa de forma OBJETIVA Y DETERMINÍSTICA basándote en:
1. Formato "Answer-First" o BLUF (qué tan directo responde preguntas).
2. Tono y Autoridad ("Wiki-voice", falta de sesgos subjetivos).
3. Densidad de hechos duros (números, estadísticas, entidades).

Devuelve EXCLUSIVAMENTE un JSON válido con esta estructura:
{
  "som_score": 0,
  "rag_probability": "Alta" | "Media" | "Baja",
  "sentiment_analysis": "Positivo (Altamente citable)" | "Neutral" | "Negativo",
  "bluf_score": 0,
  "geo_alignment": {
    "directness": 0,
    "fact_density": 0,
    "structural_clarity": 0,
    "authority": 0,
    "technical_health": 0
  },
  "semantic_intent": {
    "informational": 0,
    "commercial": 0,
    "transactional": 0
  },
  "signal_to_noise": 0
}

IMPORTANTE: Los valores de score deben ser realistas. No regales 100 si no es perfecto.
Análisis DETERMINÍSTICO: para el mismo texto de entrada, produce siempre el mismo puntaje exacto.

Texto a analizar:
"""
${cleanText}
"""`;

        const responseAI = await aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0 // Forzando respuestas determinísticas
          }
        });

        aiResult = JSON.parse(responseAI.text);
        
        somSimulation = aiResult.som_score || 50;
        ragProbability = aiResult.rag_probability || "Media";
        sentiment = aiResult.sentiment_analysis || "Neutral";
        blufScore = aiResult.bluf_score || blufScore;
        
      } catch (err) {
        console.error("Error analizando con Gemini:", err);
        somSimulation = 40 + (schemasFound > 0 ? 10 : 0) + (isScannable ? 10 : 0);
        ragProbability = somSimulation > 65 ? "Alta" : "Media";
      }
    } else {
      // Fallback manual si no hay API Key
      if (schemasFound > 0) somSimulation += 15;
      if (hasGoodHierarchy) somSimulation += 10;
      if (blufScore >= 8) somSimulation += 15;
      if (statsCount > 5) somSimulation += 15;
      if (isScannable) somSimulation += 15;
      if (hasLlms) somSimulation += 10;
      if (somSimulation > 75) ragProbability = "Alta";
      else if (somSimulation > 45) ragProbability = "Media";
      if (statsCount > 10 && hasGoodHierarchy) sentiment = "Positivo (Altamente citable)";
    }

    // --- 4. Sistema de Puntuación Kiev GEO Master (The Gold Standard) ---
    // Pilar Técnico (0-100)
    let techScoreValue = 0;
    if (hasRobots) techScoreValue += 10;
    if (hasLlms) techScoreValue += 10;
    if (!isBotBlocked) techScoreValue += 20;
    if (schemasFound > 0) techScoreValue += 20;
    if (hasGoodHierarchy) techScoreValue += 20;
    if (isSSR) techScoreValue += 20;

    // Pilar de Contenido (0-100)
    let contentScoreValue = (blufScore * 4) + 
                           (Math.min(statsCount, 10) * 2) + 
                           (isScannable ? 20 : 0) + 
                           (hasAuthor ? 20 : 0);

    // Pilar GEO/IA (0-100)
    let geoScoreValue = somSimulation;

    // Fórmula Final Ponderada (Tech: 30%, Content: 30%, Geo: 40%)
    const finalScore = Math.round(
      (techScoreValue * 0.3) + 
      (contentScoreValue * 0.3) + 
      (geoScoreValue * 0.4)
    );

    return {
      success: true,
      overallScore: Math.min(100, Math.max(0, finalScore)), 
      technical: {
        robotsTxt: hasRobots,
        llmsTxt: hasLlms,
        aiBotsBlocked: isBotBlocked,
        schemasFound,
        hasGoodHierarchy,
        isSSR,
        latencyMs: latency
      },
      content: {
        blufScore,
        blufDetected: blufFound,
        statsCount,
        isScannable,
        hasAuthor
      },
      metrics2026: {
        somSimulation: aiResult ? (aiResult.som_score || somSimulation) : somSimulation,
        ragProbability: aiResult ? (aiResult.rag_probability || ragProbability) : ragProbability,
        sentimentScore: aiResult ? (aiResult.sentiment_analysis || sentiment) : sentiment,
        geoAlignment: (aiResult && aiResult.geo_alignment) ? aiResult.geo_alignment : {
          directness: blufScore * 10,
          fact_density: Math.min(100, statsCount * 10),
          structural_clarity: hasGoodHierarchy ? 90 : 40,
          authority: hasAuthor ? 80 : 30,
          technical_health: isSSR ? 95 : 50
        },
        semanticIntent: (aiResult && aiResult.semantic_intent) ? aiResult.semantic_intent : {
          informational: 40,
          commercial: 30,
          transactional: 30
        },
        signalToNoise: (aiResult && aiResult.signal_to_noise) !== undefined ? aiResult.signal_to_noise : (cleanText.length > 500 ? 80 : 40)
      }
    };

  } catch (error) {
    console.error("Critical error in analyzeWebsite:", error);
    return { success: false, error: error.message };
  }
}
