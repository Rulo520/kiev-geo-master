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
  try {
    // Basic connectivity and HTML fetch
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching URL: ${response.status}`);
    }

    const html = await response.text();
    const latency = Date.now() - startTime;
    const $ = cheerio.load(html);

    const parsedUrl = new URL(url);
    const domain = parsedUrl.origin;

    // --- 1. Technical Audit ---
    const [hasRobots, hasLlms] = await Promise.all([
      checkFileExists(domain, "/robots.txt"),
      checkFileExists(domain, "/llms.txt"),
    ]);

    // Check if bots are blocked via meta robots or if the content is highly client-side
    const metaRobots = $("meta[name='robots']").attr("content") || "";
    const isBotBlocked = metaRobots.toLowerCase().includes("noindex") || false;

    // Look for JSON-LD schemas
    const schemasFound = $("script[type='application/ld+json']").length;
    
    // Evaluate HTML Hierarchy (H1, H2, H3 count and logical order)
    const h1Count = $("h1").length;
    const h2Count = $("h2").length;
    const hasGoodHierarchy = h1Count === 1 && h2Count > 0;

    // Determine CSR vs SSR: If the body text is extremely short but there are scripts
    const bodyTextLength = $("body").text().trim().length;
    const scriptTags = $("script").length;
    // A heuristic: if there's very little text but many scripts, it might be CSR
    const isSSR = bodyTextLength > 500 || scriptTags < 5;

    // --- 2. Content Structure (On-Page) ---
    // Extract text content and evaluate "Answer-First" (BLUF)
    // A simple heuristic: check the length of paragraphs right after an H2
    let blufScore = 5; // Default average
    let pAfterH2 = $("h2 + p");
    let blufFound = false;
    
    pAfterH2.each((_, el) => {
      let words = $(el).text().split(' ').length;
      if (words > 20 && words < 70) {
        // "Respuesta directa de entre 40 y 60 palabras"
        blufScore += 2;
        blufFound = true;
      } else if (words > 100) {
        blufScore -= 1; // Wall of text
      }
    });
    // clamp between 1 and 10
    blufScore = Math.max(1, Math.min(10, blufScore));

    // Fact Density (Detect numbers, percentages, dates)
    const textContent = $("body").text();
    const numbersMatch = textContent.match(/\\d+%?/g);
    const statsCount = numbersMatch ? numbersMatch.length : 0;

    // Scannability
    const hasLists = $("ul, ol").length > 0;
    const hasTables = $("table").length > 0;
    const isScannable = hasLists || hasTables;

    // E-E-A-T (Author presence)
    const authorMeta = $("meta[name='author']").attr("content");
    const hasAuthor = !!authorMeta || $("a[rel='author']").length > 0 || $('.author').length > 0;

    // --- 3. Generative Engine Optimization 2026 Metrics (via IA) ---
    let somSimulation = 20;
    let ragProbability = "Baja";
    let sentiment = "Neutral";
    
    // Si Gemini está configurado, hacer un análisis semántico profundo
    if (aiClient) {
      try {
        // Reducir el texto a los primeros 4000 caracteres para no sobrecargar el token de contexto
        const cleanText = textContent.replace(/\\s+/g, ' ').substring(0, 4000);
        
        const prompt = `Analiza semánticamente el siguiente extracto de texto de una página web, y califica su optimización para Answer Engine Optimization (AEO) y RAG.
Evalúa basándote en:
1. Formato "Answer-First" o BLUF (qué tan directo responde preguntas).
2. Tono y Autoridad ("Wiki-voice", falta de sesgos subjetivos).
3. Densidad de hechos duros (números, estadísticas, entidades).

Devuelve EXCLUSIVAMENTE un JSON válido con esta estructura:
{
  "som_score": numero_del_0_al_100,
  "rag_probability": "Alta" | "Media" | "Baja",
  "sentiment_analysis": "Positivo (Altamente citable)" | "Neutral" | "Negativo (Desactualizado o subjetivo)",
  "bluf_score": numero_0_al_10
}

Texto a analizar:
"""
${cleanText}
"""`;

        // Aquí usamos "gemini-2.5-flash" por su velocidad ideal para analíticas en tiempo real
        const responseAI = await aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });

        const aiResult = JSON.parse(responseAI.text);
        
        somSimulation = aiResult.som_score || 50;
        ragProbability = aiResult.rag_probability || "Media";
        sentiment = aiResult.sentiment_analysis || "Neutral";
        blufScore = aiResult.bluf_score || blufScore; // Sobrescribir el heurístico
        
      } catch (err) {
        console.error("Error analizando con Gemini:", err);
        // Fallback a heurística simple en caso de que la IA falle por rate limits
        somSimulation = 50 + (schemasFound > 0 ? 15 : 0) + (isScannable ? 15 : 0);
        ragProbability = somSimulation > 65 ? "Alta" : "Media";
      }
    } else {
      // Fallback si no hay API Key (Heurística clásica original)
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

    // Overall Score
    const overallScore = Math.round((somSimulation + blufScore*10 + (isSSR ? 10 : 0)) / 2.2);

    return {
      success: true,
      overallScore: Math.min(100, Math.max(0, overallScore)), // Clamp 0-100
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
        somSimulation,
        ragProbability,
        sentiment
      }
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}
