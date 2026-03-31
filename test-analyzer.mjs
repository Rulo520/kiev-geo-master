import fs from 'fs';
import * as cheerio from "cheerio";
import { GoogleGenAI } from "@google/genai";

const env = fs.readFileSync('.env.local', 'utf-8');
const apiKey = env.match(/GEMINI_API_KEY=(.*)/)[1];

const aiClient = new GoogleGenAI({ apiKey });

// Helper function to check if a valid file exists on the server
async function checkFileExists(baseUrl, path) {
  try {
    const res = await fetch(new URL(path, baseUrl).href, { method: "HEAD" });
    return res.ok;
  } catch (error) {
    return false;
  }
}

export async function analyzeWebsite(url) {
  const startTime = Date.now();
  try {
    console.log("fetching url", url);
    const response = await fetch(url);
    const latency = Date.now() - startTime; 
    
    if (!response.ok) throw new Error("No se pudo acceder a la URL");
    
    const html = await response.text();
    console.log("loading cheerio");
    const $ = cheerio.load(html);

    // --- 1. Auditoría Técnica (Heurística Estricta) ---
    console.log("checking files");
    const hasRobots = await checkFileExists(url, "/robots.txt");
    const hasLlms = await checkFileExists(url, "/llms.txt");
    const isBotBlocked = html.includes("GPTBot") || html.includes("CCBot") || html.includes("AdsBot-Google");
    const schemasFound = $('script[type="application/ld+json"]').length;
    
    const h1Count = $('h1').length;
    const hasGoodHierarchy = h1Count === 1 && $('h2').length > 0;
    const isSSR = !html.includes("id=\"__NEXT_DATA__\"") || html.length > 8000;
    
    const authorSelectors = ['[rel="author"]', '[itemprop="author"]', '.author-name', '.byline'];
    let authorFound = false;
    authorSelectors.forEach(s => { if ($(s).length > 0) authorFound = true; });
    if (!authorFound) {
      const lowerText = $('body').text().toLowerCase();
      if ((lowerText.includes("autor: ") || lowerText.includes("escrito por")) && !lowerText.includes("diseño por")) {
        authorFound = true;
      }
    }

    const textContent = $('p, h1, h2, h3, li').text();
    const blufFound = textContent.substring(0, 300).toLowerCase().match(/(es |somos |ofrecemos |somos |agencia |expertos )/);
    const blufScoreBase = blufFound ? 7 : 2;

    const statsMatches = textContent.match(/(\d+(?:\.\d+)?[%])|(\d{1,3}(?:,\d{3})+(?!\d))|(\d+\s+(?:usuarios|clientes|ventas|crecimiento|proyectos))/g) || [];
    const statsCount = statsMatches.length;
    const isScannable = $('ul').length > 1 && $('h2').length > 2 && textContent.length > 600;

    let somSimulation = 10;
    let ragProbability = "Baja";
    let sentiment = "Neutral";
    let aiResult = null;
    let blufScore = blufScoreBase;
    let cleanText = textContent.replace(/\s+/g, ' ').substring(0, 4500);
    
    console.log("calling gemini");
    if (aiClient) {
      try {
        const prompt = `AUDITORÍA PROFESIONAL DE SEO GENERATIVO (GEO) - MODO HIPER-CRÍTICO.
Analiza semánticamente el extracto web y califica su optimización para Answer Engine Optimization (AEO) y RAG.

SE IMPLACABLE. No regales puntos. La mayoría de sitios corporativos NO están optimizados para IA.
Benchmarking:
- 0-30: Desastre absoluto para IA.
- 40-60: Sitio normal, "promedio".
- 70-85: Sitio con buena estructura factual y técnica.
- 90+: Casi inexistente (Wikipedia, documentación de Microsoft/Google).

CRITERIOS:
1. "Answer-First" (BLUF): ¿Responde a "qué es esto" en la primera frase con HECHOS? (Slogans como "comunicación total" penalizan).
2. Densidad de Datos: ¿Hay métricas, entidades fuertes y claridad técnica o solo "clichés"?
3. Voz de Autoridad: ¿Hay señales reales de E-E-A-T (autoría, experiencia)?

Devuelve EXCLUSIVAMENTE un JSON válido:
{
  "som_score": 0_100,
  "rag_probability": "Alta" | "Media" | "Baja",
  "sentiment_analysis": "Positivo (Factual)" | "Neutral" | "Negativo (Persuasivo/Subjetivo)",
  "bluf_score": 0_10,
  "geo_alignment": {
    "directness": 0_100,
    "fact_density": 0_100,
    "structural_clarity": 0_100,
    "authority": 0_100,
    "technical_health": 0_100
  },
  "semantic_intent": {
    "informational": 0_100,
    "commercial": 0_100,
    "transactional": 0_100
  },
  "signal_to_noise": 0_100
}

IMPORTANTE: El campo 'bluf_score' es base 10. Todo lo demás base 100. Penaliza el marketing-speak vacío.

Texto:
"""
${cleanText}
"""`;

        const responseAI = await aiClient.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [prompt],
          config: {
            responseMimeType: "application/json",
            temperature: 0
          }
        });

        if (!responseAI || !responseAI.text) {
          throw new Error("La IA no devolvió una respuesta válida.");
        }

        aiResult = JSON.parse(responseAI.text);
        
        somSimulation = aiResult.som_score || 30;
        ragProbability = aiResult.rag_probability || "Media";
        sentiment = aiResult.sentiment_analysis || "Neutral";
        blufScore = aiResult.bluf_score || blufScore;
        
      } catch (err) {
        console.error("Error crítico en Gemini:", err);
        somSimulation = 30 + (schemasFound > 0 ? 15 : 0) + (hasGoodHierarchy ? 10 : 0);
      }
    } else {
      if (schemasFound > 0) somSimulation += 10;
      if (hasGoodHierarchy) somSimulation += 5;
      if (statsCount > 3) somSimulation += 10;
      if (isScannable) somSimulation += 5;
      if (hasLlms) somSimulation += 10;
      if (somSimulation > 70) ragProbability = "Alta";
      else if (somSimulation > 40) ragProbability = "Media";
    }

    let techScoreValue = 0;
    if (hasRobots) techScoreValue += 10;
    if (hasLlms) techScoreValue += 10;
    if (!isBotBlocked) techScoreValue += 15;
    if (schemasFound > 0) techScoreValue += 25;
    if (h1Count === 1) techScoreValue += 10;
    if (hasGoodHierarchy) techScoreValue += 10;
    if (isSSR) techScoreValue += 20;

    let contentScoreValue = (blufScore * 5) +
                           (Math.min(statsCount, 5) * 4) +
                           (isScannable ? 15 : 0) + 
                           (authorFound ? 15 : 0);

    let geoScoreValue = somSimulation;

    const finalScore = Math.round(
      (techScoreValue * 0.3) + 
      (contentScoreValue * 0.3) + 
      (geoScoreValue * 0.4)
    );
    console.log("calculated", finalScore);

    return {
      success: true,
      overallScore: Math.min(100, Math.max(0, finalScore))
    };

  } catch (error) {
    console.error("Critical error in analyzeWebsite:", error);
    return { success: false, error: error.message };
  }
}

analyzeWebsite("https://www.casakiev.com").then(console.log);
