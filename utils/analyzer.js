import * as cheerio from "cheerio";
// Adiós a la dependencia del SDK experimental. Usamos fetch nativo para mayor control.

// El cliente de IA ya no es necesario como objeto global
let dummyAIInstance = null;

// Helper function to check if a valid file exists on the server
async function checkFileExists(baseUrl, path, timeout = 2500) {
  try {
    const res = await fetch(new URL(path, baseUrl).href, { 
      method: "HEAD", 
      signal: AbortSignal.timeout(timeout) 
    });
    return res.ok;
  } catch (error) {
    return false;
  }
}

// Main analyzer function
export async function analyzeWebsite(url) {
  const startTime = Date.now();
  try {
    // Paralelismo: Disparamos las 3 peticiones técnicas al mismo tiempo para ganar 4-6 segundos.
    const [response, hasRobots, hasLlms] = await Promise.all([
      fetch(url, { signal: AbortSignal.timeout(8000) }),
      checkFileExists(url, "/robots.txt"),
      checkFileExists(url, "/llms.txt")
    ]);

    const latency = Date.now() - startTime; 
    
    if (!response.ok) throw new Error("No se pudo acceder a la URL");
    
    const html = await response.text();
    const $ = cheerio.load(html);

    // --- 1. Auditoría Técnica (Heurística Estricta) ---
    const isBotBlocked = html.includes("GPTBot") || html.includes("CCBot") || html.includes("AdsBot-Google");
    const schemasFound = $('script[type="application/ld+json"]').length;
    
    const h1Count = $('h1').length;
    const hasGoodHierarchy = h1Count === 1 && $('h2').length > 0;
    const isSSR = !html.includes("id=\"__NEXT_DATA__\"") || html.length > 8000; // Umbral de SSR más exigente
    
    // Detección de Autoría más robusta (evitar Powered By)
    const authorSelectors = ['[rel="author"]', '[itemprop="author"]', '.author-name', '.byline'];
    let authorFound = false;
    authorSelectors.forEach(s => { if ($(s).length > 0) authorFound = true; });
    if (!authorFound) {
      const lowerText = $('body').text().toLowerCase();
      // Solo cuenta si hay "escrito por" o "autor" pero no "diseñado por"
      if ((lowerText.includes("autor: ") || lowerText.includes("escrito por")) && !lowerText.includes("diseño por")) {
        authorFound = true;
      }
    }

    // --- 2. Estructura de Contenido (Filtrado de Ruido) ---
    const textContent = $('p, h1, h2, h3, li').text();
    const blufFound = textContent.substring(0, 300).toLowerCase().match(/(es |somos |ofrecemos |somos |agencia |expertos )/);
    const blufScoreBase = blufFound ? 7 : 2;

    // Estadísticas Reales (Filtrar años y números de teléfono)
    const statsMatches = textContent.match(/(\d+(?:\.\d+)?[%])|(\d{1,3}(?:,\d{3})+(?!\d))|(\d+\s+(?:usuarios|clientes|ventas|crecimiento|proyectos))/g) || [];
    const statsCount = statsMatches.length;
    const isScannable = $('ul').length > 1 && $('h2').length > 2 && textContent.length > 600;

    // --- 3. Generative Engine Optimization 2026 Core Audit ---
    let somSimulation = 10; // Base más baja
    let ragProbability = "Baja";
    let sentiment = "Neutral";
    let aiResult = null;
    let aiError = null;
    let blufScore = blufScoreBase;
    let cleanText = textContent.replace(/\s+/g, ' ').substring(0, 4500);
    
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("[DASHBOARD] ¿API Key detectada?:", !!apiKey);

    if (apiKey) {
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
2. "Data Density": ¿Hay métricas, entidades fuertes y claridad técnica o solo "clichés"?
3. "Expert Voice": ¿Hay señales reales de E-E-A-T (autoría, experiencia)?

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

        const modelsToTry = [
          'gemini-2.0-flash', 
          'gemini-2.5-flash', 
          'gemini-flash-latest', 
          'gemini-pro-latest'
        ];
        
        let dataAI = null;
        let diagnosticLog = [];

        for (const modelName of modelsToTry) {
          try {
            // Intentamos con v1 que suele ser más estable para estos modelos comerciales
            const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;
            
            const responseAI = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1 },
                safetySettings: [
                  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
              }),
              signal: AbortSignal.timeout(6000)
            });

            if (!responseAI.ok) {
              const errJson = await responseAI.json();
              const errMsg = errJson.error?.message || `Status ${responseAI.status}`;
              diagnosticLog.push(`${modelName}: ${errMsg}`);
              continue;
            }

            const tempData = await responseAI.json();
            if (tempData.candidates && tempData.candidates.length > 0) {
              dataAI = tempData;
              break;
            } else {
              diagnosticLog.push(`${modelName}: Sin candidatos`);
            }
          } catch (e) {
            diagnosticLog.push(`${modelName}: Error de red/timeout`);
          }
        }

        if (!dataAI) {
          throw new Error(`Fallo Total Model Hunter. Reporte: [${diagnosticLog.join(" | ")}]`);
        }

        let text = dataAI.candidates[0].content.parts[0].text;

        if (text.includes('```json')) {
          text = text.split('```json')[1].split('```')[0].trim();
        } else if (text.includes('```')) {
          text = text.split('```')[1].split('```')[0].trim();
        }
        
        // Refuerzo: si queda algo raro, buscamos el primer { y el último }
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          text = jsonMatch[0];
        }
        
        aiResult = JSON.parse(text);
        console.log("Auditoría IA Completada con éxito.");
        
        somSimulation = aiResult.som_score || 30;
        ragProbability = aiResult.rag_probability || "Media";
        sentiment = aiResult.sentiment_analysis || "Neutral";
        blufScore = aiResult.bluf_score || blufScore;
        
      } catch (err) {
        console.error("Error crítico en Gemini:", err);
        aiError = err.message || "Error desconocido en el servicio de IA.";
        // Fallback dinámico si falla la IA pero tenemos datos técnicos
        somSimulation = 30 + (schemasFound > 0 ? 15 : 0) + (hasGoodHierarchy ? 10 : 0);
      }
    } else {
      // Fallback manual (Anti-Inflación)
      if (schemasFound > 0) somSimulation += 10;
      if (hasGoodHierarchy) somSimulation += 5;
      if (statsCount > 3) somSimulation += 10;
      if (isScannable) somSimulation += 5;
      if (hasLlms) somSimulation += 10;
      if (somSimulation > 70) ragProbability = "Alta";
      else if (somSimulation > 40) ragProbability = "Media";
    }

    // --- 4. Sistema de Puntuación Kiev GEO Master (The Hard Standard) ---
    // PILAR TÉCNICO (0-100) - Mucho más estricto
    let techScoreValue = 0;
    if (hasRobots) techScoreValue += 10;
    if (hasLlms) techScoreValue += 10;
    if (!isBotBlocked) techScoreValue += 15;
    if (schemasFound > 0) techScoreValue += 25; // JSON-LD es Vital
    if (h1Count === 1) techScoreValue += 10; // H1 único es básico
    if (hasGoodHierarchy) techScoreValue += 10;
    if (isSSR) techScoreValue += 20;

    // PILAR DE CONTENIDO (0-100)
    let contentScoreValue = (blufScore * 5) + // Max 50 (Pilar central)
                           (Math.min(statsCount, 5) * 4) + // Max 20 (Solo hechos reales)
                           (isScannable ? 15 : 0) + 
                           (authorFound ? 15 : 0);

    // PILAR GEO/IA (0-100)
    let geoScoreValue = somSimulation;

    // Fórmula Final Ponderada (Tech: 30%, Content: 30%, Geo: 40%)
    const finalScore = Math.round(
      (techScoreValue * 0.3) + 
      (contentScoreValue * 0.3) + 
      (geoScoreValue * 0.4)
    );

    return {
      success: true,
      isAI: !!aiResult,
      aiError: aiError,
      overallScore: Math.min(100, Math.max(0, finalScore)), 
      technical: {
        robotsTxt: hasRobots,
        llmsTxt: hasLlms,
        aiBotsBlocked: isBotBlocked,
        schemasFound,
        hasGoodHierarchy,
        isSSR,
        h1Count,
        latencyMs: latency
      },
      content: {
        blufScore,
        blufDetected: !!blufFound,
        statsCount,
        isScannable,
        hasAuthor: authorFound
      },
      metrics2026: {
        somSimulation: aiResult ? (aiResult.som_score || somSimulation) : somSimulation,
        ragProbability: aiResult ? (aiResult.rag_probability || ragProbability) : ragProbability,
        sentimentScore: aiResult ? (aiResult.sentiment_analysis || sentiment) : sentiment,
        geoAlignment: aiResult?.geo_alignment || {
          directness: blufScore * 10,
          fact_density: Math.min(100, statsCount * 20),
          structural_clarity: hasGoodHierarchy ? 80 : 30,
          authority: authorFound ? 70 : 20,
          technical_health: techScoreValue
        },
        semanticIntent: aiResult?.semantic_intent || {
          informational: 40,
          commercial: 30,
          transactional: 30
        },
        signalToNoise: aiResult?.signal_to_noise ?? (cleanText.length > 800 ? 70 : 30)
      }
    };

  } catch (error) {
    console.error("Critical error in analyzeWebsite:", error);
    return { success: false, error: error.message };
  }
}
// Trigger Rebuild
