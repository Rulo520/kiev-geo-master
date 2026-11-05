import * as cheerio from "cheerio";

// ============================================================================
// KIEV GEO MASTER — Motor de Análisis v2.0
// Análisis integral: SEO técnico, contenido, accesibilidad, GEO/AEO
// ============================================================================

// --- Constantes ---
const FETCH_TIMEOUT = 5000;       // Timeout para fetches de recursos (ms)
const PAGESPEED_TIMEOUT = 15000;  // Timeout para PageSpeed Insights (ms)
const GEMINI_TIMEOUT = 30000;     // Timeout para Gemini API (ms)
const GEMINI_PRIMARY_MODEL = "gemini-2.5-flash";
const GEMINI_FALLBACK_MODEL = "gemini-2.0-flash";

// Bots de IA que rastreamos en robots.txt
const AI_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "PerplexityBot",
  "anthropic-ai",
  "Bytespider",
];

// ============================================================================
// 1. FETCHING DE RECURSOS (en paralelo)
// ============================================================================

/**
 * Fetch seguro con timeout y manejo de errores graceful.
 * Retorna null si falla en vez de lanzar excepción.
 */
async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(options.timeout || FETCH_TIMEOUT),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; KievGEOMaster/2.0; +https://kiev.agency)",
        ...(options.headers || {}),
      },
      redirect: "follow",
    });
    return response;
  } catch {
    return null;
  }
}

/**
 * Descarga todos los recursos necesarios en paralelo.
 * Mide la latencia de la página principal.
 */
async function fetchAllResources(url) {
  const parsedUrl = new URL(url);
  const origin = parsedUrl.origin;

  const startTime = Date.now();

  // Lanzar todos los fetches en paralelo
  const [htmlResponse, robotsResponse, llmsResponse, sitemapResponse] =
    await Promise.all([
      safeFetch(url),
      safeFetch(`${origin}/robots.txt`),
      safeFetch(`${origin}/llms.txt`),
      safeFetch(`${origin}/sitemap.xml`),
    ]);

  const latencyMs = Date.now() - startTime;

  // Extraer contenidos
  const htmlText =
    htmlResponse && htmlResponse.ok ? await htmlResponse.text() : null;
  const robotsText =
    robotsResponse && robotsResponse.ok ? await robotsResponse.text() : null;
  const llmsText =
    llmsResponse && llmsResponse.ok ? await llmsResponse.text() : null;
  const sitemapText =
    sitemapResponse && sitemapResponse.ok
      ? await sitemapResponse.text()
      : null;

  return {
    htmlText,
    htmlResponse,
    robotsText,
    llmsText,
    sitemapText,
    latencyMs,
  };
}

// ============================================================================
// 2. PARSING DE ROBOTS.TXT
// ============================================================================

/**
 * Parsea robots.txt y verifica si bloquea bots de IA específicos.
 * Busca reglas Disallow: / para cada bot y para el wildcard *.
 */
function parseRobotsTxt(robotsText) {
  if (!robotsText) {
    return { exists: false, allowsAIBots: true, blockedBots: [] };
  }

  const lines = robotsText.split("\n").map((l) => l.trim());
  const blockedBots = [];

  // Verificar si el wildcard (*) bloquea todo
  let wildcardBlocks = false;
  let currentAgent = null;

  for (const line of lines) {
    // Ignorar comentarios y líneas vacías
    if (line.startsWith("#") || line === "") {
      // Un bloque de user-agent termina con línea vacía (reset)
      if (line === "") currentAgent = null;
      continue;
    }

    const lowerLine = line.toLowerCase();

    if (lowerLine.startsWith("user-agent:")) {
      currentAgent = line.substring("user-agent:".length).trim();
    } else if (
      lowerLine.startsWith("disallow:") &&
      currentAgent !== null
    ) {
      const disallowPath = line.substring("disallow:".length).trim();
      if (disallowPath === "/") {
        // Este agente tiene bloqueado todo el sitio
        if (currentAgent === "*") {
          wildcardBlocks = true;
        }
        // Verificar si es un bot de IA conocido
        for (const bot of AI_BOTS) {
          if (currentAgent.toLowerCase() === bot.toLowerCase()) {
            if (!blockedBots.includes(bot)) {
              blockedBots.push(bot);
            }
          }
        }
      }
    }
  }

  // Si el wildcard bloquea todo y no hay reglas Allow específicas para bots de IA,
  // entonces todos los bots sin regla propia están bloqueados
  if (wildcardBlocks) {
    for (const bot of AI_BOTS) {
      if (!blockedBots.includes(bot)) {
        // Verificar si hay un User-agent específico para este bot con Allow
        const hasSpecificAllow = hasExplicitAllow(robotsText, bot);
        if (!hasSpecificAllow) {
          blockedBots.push(bot);
        }
      }
    }
  }

  return {
    exists: true,
    allowsAIBots: blockedBots.length === 0,
    blockedBots,
  };
}

/**
 * Verifica si un bot tiene una regla Allow explícita en robots.txt
 */
function hasExplicitAllow(robotsText, botName) {
  const lines = robotsText.split("\n").map((l) => l.trim());
  let isTargetAgent = false;

  for (const line of lines) {
    if (line === "" || line.startsWith("#")) {
      if (line === "") isTargetAgent = false;
      continue;
    }
    const lowerLine = line.toLowerCase();
    if (lowerLine.startsWith("user-agent:")) {
      const agent = line.substring("user-agent:".length).trim();
      isTargetAgent = agent.toLowerCase() === botName.toLowerCase();
    } else if (lowerLine.startsWith("allow:") && isTargetAgent) {
      const allowPath = line.substring("allow:".length).trim();
      if (allowPath === "/" || allowPath === "") {
        return true;
      }
    }
  }
  return false;
}

// ============================================================================
// 3. ANÁLISIS HTML CON CHEERIO
// ============================================================================

/**
 * Analiza el HTML completo: meta tags, headings, schemas, contenido,
 * accesibilidad y detección de SSR.
 */
function analyzeHTML(htmlText) {
  if (!htmlText) {
    return {
      meta: getEmptyMeta(),
      headings: { h1: 0, h2: 0, h3: 0, h4: 0, hasGoodHierarchy: false },
      schemas: { count: 0, types: [] },
      content: getEmptyContent(),
      accessibility: getEmptyAccessibility(),
      isSSR: false,
    };
  }

  const $ = cheerio.load(htmlText);

  // --- Meta Tags ---
  const meta = analyzeMetaTags($);

  // --- Jerarquía de Headings ---
  const headings = analyzeHeadings($);

  // --- Schema Markup (JSON-LD) ---
  const schemas = analyzeSchemas($);

  // --- Análisis de Contenido ---
  const content = analyzeContent($);

  // --- Accesibilidad ---
  const accessibility = analyzeAccessibility($);

  // --- Detección de SSR ---
  const isSSR = detectSSR($);

  return { meta, headings, schemas, content, accessibility, isSSR };
}

/**
 * Extrae y evalúa todos los meta tags relevantes.
 */
function analyzeMetaTags($) {
  // Título
  const title = $("title").first().text().trim();
  const titleLength = title.length;
  let titleStatus = "good";
  if (titleLength === 0) titleStatus = "error";
  else if (titleLength < 50 || titleLength > 60) titleStatus = "warn";

  // Meta Description
  const description = $('meta[name="description"]').attr("content") || "";
  const descriptionLength = description.length;
  let descriptionStatus = "good";
  if (descriptionLength === 0) descriptionStatus = "error";
  else if (descriptionLength < 150 || descriptionLength > 160)
    descriptionStatus = "warn";

  // Canonical
  const hasCanonical = $('link[rel="canonical"]').length > 0;

  // Open Graph
  const ogTagsList = [];
  const ogMapping = ["og:title", "og:description", "og:image", "og:type"];
  for (const tag of ogMapping) {
    if ($(`meta[property="${tag}"]`).length > 0) {
      ogTagsList.push(tag);
    }
  }
  const hasOgTags = ogTagsList.length > 0;

  // Twitter Cards
  const hasTwitterCards =
    $('meta[name="twitter:card"]').length > 0 ||
    $('meta[name="twitter:title"]').length > 0 ||
    $('meta[name="twitter:description"]').length > 0;

  // Lang attribute
  const langValue = $("html").attr("lang") || "";
  const hasLang = langValue.length > 0;

  // Viewport
  const hasViewport = $('meta[name="viewport"]').length > 0;

  // Charset
  const hasCharset =
    $("meta[charset]").length > 0 ||
    $('meta[http-equiv="Content-Type"]').length > 0;

  return {
    title,
    titleLength,
    titleStatus,
    description,
    descriptionLength,
    descriptionStatus,
    hasCanonical,
    hasOgTags,
    ogTagsList,
    hasTwitterCards,
    hasLang,
    langValue,
    hasViewport,
    hasCharset,
  };
}

/**
 * Analiza la jerarquía de headings.
 * Válida = exactamente 1 h1 y al menos 1 h2.
 */
function analyzeHeadings($) {
  const h1 = $("h1").length;
  const h2 = $("h2").length;
  const h3 = $("h3").length;
  const h4 = $("h4").length;
  const hasGoodHierarchy = h1 === 1 && h2 >= 1;

  return { h1, h2, h3, h4, hasGoodHierarchy };
}

/**
 * Extrae schemas JSON-LD del HTML.
 */
function analyzeSchemas($) {
  const jsonLdScripts = $('script[type="application/ld+json"]');
  const types = [];

  jsonLdScripts.each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      // Puede ser un objeto o un array de objetos
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"]) {
          const typeVal = Array.isArray(item["@type"])
            ? item["@type"]
            : [item["@type"]];
          types.push(...typeVal);
        }
        // Revisar @graph para schemas anidados
        if (item["@graph"] && Array.isArray(item["@graph"])) {
          for (const graphItem of item["@graph"]) {
            if (graphItem["@type"]) {
              const typeVal = Array.isArray(graphItem["@type"])
                ? graphItem["@type"]
                : [graphItem["@type"]];
              types.push(...typeVal);
            }
          }
        }
      }
    } catch {
      // JSON-LD malformado, ignorar
    }
  });

  return { count: jsonLdScripts.length, types: [...new Set(types)] };
}

/**
 * Analiza el contenido textual: palabras, BLUF, datos factuales,
 * escaneabilidad y señales de autoría.
 */
function analyzeContent($) {
  // Extraer texto de elementos de contenido
  const contentElements = $("p, h1, h2, h3, h4, li");
  let fullText = "";
  contentElements.each((_, el) => {
    fullText += $(el).text().trim() + " ";
  });
  fullText = fullText.trim();

  // Conteo de palabras
  const words = fullText.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  // Detección BLUF (Bottom Line Up Front)
  // ¿El primer párrafo responde una pregunta directamente?
  const firstParagraph = $("p").first().text().trim();
  const blufDetected = detectBLUF(firstParagraph);
  const blufScore = blufDetected ? 7 : 3;

  // Datos factuales: porcentajes, números con unidades
  const statsRegex =
    /\d+[.,]?\d*\s*(%|USD|EUR|kg|km|mb|gb|tb|ms|px|rem|em|años|months|years|days|días|horas|hours|minutes|minutos|seconds|segundos)/gi;
  const statsMatches = fullText.match(statsRegex);
  const statsCount = statsMatches ? statsMatches.length : 0;

  // Escaneabilidad: listas > 1, tablas > 0, h2 > 2
  const listCount = $("ul, ol").length;
  const tableCount = $("table").length;
  const h2Count = $("h2").length;
  const isScannable = listCount > 1 || tableCount > 0 || h2Count > 2;

  // Señales de autoría
  const hasAuthor = detectAuthorSignals($);

  return {
    blufScore,
    blufDetected,
    statsCount,
    isScannable,
    hasAuthor,
    wordCount,
    fullText, // Se usará internamente para Gemini
  };
}

/**
 * Detecta si un párrafo sigue el patrón BLUF:
 * responde directamente, sin rodeos.
 */
function detectBLUF(paragraph) {
  if (!paragraph || paragraph.length < 20) return false;

  // Indicadores de respuesta directa
  const directPatterns = [
    /^(es|son|fue|será|está|están|significa|consiste|se define)/i,
    /^(the|a|an|this|it|they|we|you)\s/i,
    /^(en resumen|en definitiva|básicamente|esencialmente)/i,
    /^(sí|no|la respuesta|el resultado)/i,
    /^\d/,
    /^[A-Z][a-z]+\s(es|is|are|was|were|means|refers)/i,
  ];

  return directPatterns.some((p) => p.test(paragraph));
}

/**
 * Detecta señales de autoría en el HTML.
 */
function detectAuthorSignals($) {
  // Buscar en meta tags
  if ($('meta[name="author"]').attr("content")) return true;

  // Buscar en JSON-LD
  const jsonLdScripts = $('script[type="application/ld+json"]');
  let found = false;
  jsonLdScripts.each((_, el) => {
    try {
      const text = $(el).html();
      if (text && text.includes('"author"')) found = true;
    } catch {
      // ignorar
    }
  });
  if (found) return true;

  // Buscar en atributos rel="author" o clases comunes
  if ($('a[rel="author"]').length > 0) return true;
  if ($(".author, .byline, [itemprop='author']").length > 0) return true;

  return false;
}

/**
 * Análisis de accesibilidad básico.
 */
function analyzeAccessibility($) {
  // Imágenes y alt text
  const images = $("img");
  const imagesTotal = images.length;
  let imagesWithoutAlt = 0;
  images.each((_, el) => {
    const alt = $(el).attr("alt");
    if (alt === undefined || alt === null) {
      imagesWithoutAlt++;
    }
  });

  // Lang attribute
  const hasLangAttribute = ($("html").attr("lang") || "").length > 0;

  // Skip-to-content link
  const hasSkipLink =
    $('a[href="#main"], a[href="#content"], a[href="#main-content"]').length >
      0 ||
    $("a")
      .filter((_, el) =>
        /skip.*(content|nav|main)/i.test($(el).text())
      )
      .length > 0;

  // Formularios y labels
  const forms = $("form");
  const formsTotal = forms.length;
  let formsWithLabels = 0;
  forms.each((_, form) => {
    const inputs = $(form).find("input, select, textarea").not('[type="hidden"], [type="submit"], [type="button"]');
    const labels = $(form).find("label");
    // Un formulario tiene labels adecuados si hay al menos un label por input
    if (inputs.length > 0 && labels.length >= inputs.length) {
      formsWithLabels++;
    } else if (inputs.length === 0) {
      formsWithLabels++; // Formulario sin inputs visibles = OK
    }
  });

  // Calcular score de accesibilidad (0-100)
  let accessScore = 0;
  // Lang attribute: 25 puntos
  if (hasLangAttribute) accessScore += 25;
  // Alt texts: 35 puntos
  if (imagesTotal === 0) accessScore += 35;
  else accessScore += Math.round((1 - imagesWithoutAlt / imagesTotal) * 35);
  // Skip link: 15 puntos
  if (hasSkipLink) accessScore += 15;
  // Forms: 25 puntos
  if (formsTotal === 0) accessScore += 25;
  else accessScore += Math.round((formsWithLabels / formsTotal) * 25);

  return {
    imagesTotal,
    imagesWithoutAlt,
    hasLangAttribute,
    hasSkipLink,
    formsTotal,
    formsWithLabels,
    score: accessScore,
  };
}

/**
 * Detecta si la página usa Server-Side Rendering.
 * Verifica que el body tenga contenido textual real (> 200 chars).
 */
function detectSSR($) {
  // Extraer texto visible del body, excluyendo scripts y styles
  const bodyClone = $("body").clone();
  bodyClone.find("script, style, noscript").remove();
  const bodyText = bodyClone.text().replace(/\s+/g, " ").trim();

  return bodyText.length > 200;
}

// ============================================================================
// 4. HEADERS DE SEGURIDAD
// ============================================================================

/**
 * Analiza headers de seguridad de la respuesta HTTP.
 */
function analyzeSecurityHeaders(response, url) {
  const https = url.startsWith("https");

  if (!response || !response.headers) {
    return {
      https,
      hsts: false,
      csp: false,
      xFrameOptions: false,
      xContentTypeOptions: false,
    };
  }

  const headers = response.headers;

  return {
    https,
    hsts: headers.has("strict-transport-security"),
    csp: headers.has("content-security-policy"),
    xFrameOptions: headers.has("x-frame-options"),
    xContentTypeOptions: headers.has("x-content-type-options"),
  };
}

// ============================================================================
// 5. ANÁLISIS DE SITEMAP
// ============================================================================

/**
 * Parsea sitemap.xml y cuenta URLs usando regex simple.
 */
function analyzeSitemap(sitemapText) {
  if (!sitemapText) {
    return { exists: false, urlCount: 0 };
  }

  // Contar tags <loc> en el sitemap
  const locMatches = sitemapText.match(/<loc>/gi);
  const urlCount = locMatches ? locMatches.length : 0;

  return { exists: true, urlCount };
}

// ============================================================================
// 6. CALIDAD DE LLMS.TXT
// ============================================================================

/**
 * Evalúa la calidad del archivo llms.txt.
 */
function analyzeLlmsTxt(llmsText) {
  if (!llmsText) {
    return { exists: false, quality: null };
  }

  const trimmed = llmsText.trim();

  // Demasiado corto para ser útil
  if (trimmed.length < 100) {
    return { exists: true, quality: "Básico" };
  }

  // Verificar si tiene secciones claras (headers con # o líneas con :)
  const hasSections =
    /^#+\s/m.test(trimmed) ||
    /^[A-Z][A-Za-z\s]+:/m.test(trimmed);
  // Verificar si tiene contenido útil (descripciones, URLs, instrucciones)
  const hasUsefulContent =
    trimmed.split("\n").filter((l) => l.trim().length > 20).length >= 3;

  if (hasSections && hasUsefulContent && trimmed.length > 300) {
    return { exists: true, quality: "Completo" };
  }

  return { exists: true, quality: "Básico" };
}

// ============================================================================
// 7. ANÁLISIS CON GEMINI AI
// ============================================================================

/**
 * Schema de respuesta estructurada para Gemini.
 */
const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    som_score: { type: "NUMBER" },
    rag_probability: { type: "STRING" },
    sentiment_analysis: { type: "STRING" },
    bluf_score: { type: "NUMBER" },
    geo_alignment: {
      type: "OBJECT",
      properties: {
        directness: { type: "NUMBER" },
        fact_density: { type: "NUMBER" },
        structural_clarity: { type: "NUMBER" },
        authority: { type: "NUMBER" },
        technical_health: { type: "NUMBER" },
      },
      required: [
        "directness",
        "fact_density",
        "structural_clarity",
        "authority",
        "technical_health",
      ],
    },
    semantic_intent: {
      type: "OBJECT",
      properties: {
        informational: { type: "NUMBER" },
        commercial: { type: "NUMBER" },
        transactional: { type: "NUMBER" },
      },
      required: ["informational", "commercial", "transactional"],
    },
    signal_to_noise: { type: "NUMBER" },
    critical_findings: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: [
    "som_score",
    "rag_probability",
    "sentiment_analysis",
    "bluf_score",
    "geo_alignment",
    "semantic_intent",
    "signal_to_noise",
    "critical_findings",
  ],
};

/**
 * Llama a la API de Gemini para análisis semántico profundo.
 * Usa structured output para evitar parsing manual de JSON.
 * Intenta modelo primario, luego fallback.
 */
async function analyzeWithGemini(url, textContent, metaSummary) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "GEMINI_API_KEY no configurada" };
  }

  // Limitar contenido a 5000 caracteres
  const truncatedContent = textContent.substring(0, 5000);

  const prompt = `Eres un evaluador ULTRA EXIGENTE de calidad web para GEO (Generative Engine Optimization) y AEO (Answer Engine Optimization). Tu trabajo es evaluar si una IA generativa citaría o usaría este contenido como fuente.

REGLAS DE SCORING (SÉ HIPER-CRÍTICO):
- Score 80-100: Solo contenido nivel Wikipedia, documentación oficial de MDN, papers científicos. Extremadamente raro.
- Score 50-79: Contenido bueno con datos verificables, fuentes citadas, estructura clara. Poco común.
- Score 20-49: Contenido promedio de blog/landing page. Lo más común.
- Score 0-19: Contenido thin, sin sustancia, puramente comercial sin valor informativo.

La mayoría de sitios web deberían puntuar entre 20-50. NO seas generoso.

URL analizada: ${url}
Meta título: ${metaSummary.title}
Meta descripción: ${metaSummary.description}

CONTENIDO DE LA PÁGINA (primeros 5000 chars):
---
${truncatedContent}
---

Evalúa todos los campos con precisión. Para critical_findings, proporciona 3-5 hallazgos ESPECÍFICOS y ACCIONABLES (no genéricos). Sé concreto: menciona qué falta, qué está mal, qué mejorar exactamente.`;

  // Intentar con modelo primario, luego fallback
  const models = [GEMINI_PRIMARY_MODEL, GEMINI_FALLBACK_MODEL];

  for (const model of models) {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(GEMINI_TIMEOUT),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: GEMINI_RESPONSE_SCHEMA,
            temperature: 0.3,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini ${model} error:`, response.status, errorText);
        continue; // Intentar fallback
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        console.error(`Gemini ${model}: respuesta vacía`);
        continue;
      }

      // Con structured output, el texto ya es JSON válido
      const parsed = JSON.parse(text);
      return { success: true, data: parsed, model };
    } catch (err) {
      console.error(`Gemini ${model} falló:`, err.message);
      continue;
    }
  }

  return {
    success: false,
    error: "Ambos modelos de Gemini fallaron",
  };
}

/**
 * Genera scores heurísticos cuando Gemini no está disponible.
 */
function generateHeuristicScores(content, meta, headings) {
  // SoM Simulation basado en señales heurísticas
  let somScore = 20; // Base baja

  // Bonificaciones
  if (content.wordCount > 800) somScore += 10;
  if (content.wordCount > 1500) somScore += 5;
  if (content.blufDetected) somScore += 8;
  if (content.statsCount > 2) somScore += 7;
  if (content.isScannable) somScore += 5;
  if (content.hasAuthor) somScore += 5;
  if (meta.titleStatus === "good") somScore += 3;
  if (meta.descriptionStatus === "good") somScore += 3;
  if (meta.hasOgTags) somScore += 2;
  if (headings.hasGoodHierarchy) somScore += 5;

  // Penalizaciones
  if (content.wordCount < 300) somScore -= 10;
  if (meta.titleStatus === "error") somScore -= 5;
  if (meta.descriptionStatus === "error") somScore -= 5;

  somScore = Math.max(0, Math.min(100, somScore));

  // RAG probability
  let ragProb = "Baja";
  if (somScore >= 60) ragProb = "Alta";
  else if (somScore >= 35) ragProb = "Media";

  // Geo alignment heurístico
  const directness = content.blufDetected ? 60 : 30;
  const factDensity = Math.min(
    100,
    Math.round((content.statsCount / Math.max(content.wordCount / 200, 1)) * 50)
  );
  const structuralClarity =
    (headings.hasGoodHierarchy ? 40 : 15) + (content.isScannable ? 25 : 0);
  const authority = content.hasAuthor ? 40 : 15;
  const technicalHealth =
    (meta.titleStatus === "good" ? 25 : 10) +
    (meta.descriptionStatus === "good" ? 25 : 10) +
    (meta.hasCanonical ? 15 : 0);

  return {
    som_score: somScore,
    rag_probability: ragProb,
    sentiment_analysis: "Neutral (análisis heurístico)",
    bluf_score: content.blufScore,
    geo_alignment: {
      directness,
      fact_density: factDensity,
      structural_clarity: Math.min(100, structuralClarity),
      authority,
      technical_health: Math.min(100, technicalHealth),
    },
    semantic_intent: {
      informational: content.wordCount > 500 ? 60 : 30,
      commercial: meta.title.match(/comprar|buy|precio|price|oferta/i)
        ? 60
        : 20,
      transactional: meta.title.match(
        /suscri|regist|sign.up|contact|demo/i
      )
        ? 50
        : 15,
    },
    signal_to_noise: somScore,
    critical_findings: [
      content.wordCount < 300
        ? "Contenido insuficiente: menos de 300 palabras"
        : "El contenido podría beneficiarse de más datos y estadísticas",
      !content.blufDetected
        ? "Falta patrón BLUF: el primer párrafo no responde directamente"
        : "Buen uso del patrón BLUF",
      !content.hasAuthor
        ? "Sin señales de autoría: agregar autor verificable"
        : "Señales de autoría detectadas",
      content.statsCount < 3
        ? "Pocas referencias a datos cuantificables"
        : "Buen uso de datos factuales",
      !meta.hasOgTags
        ? "Faltan Open Graph tags para compartibilidad"
        : "Open Graph tags presentes",
    ],
  };
}

// ============================================================================
// 8. PAGESPEED INSIGHTS
// ============================================================================

/**
 * Obtiene métricas de PageSpeed Insights (no bloquea el análisis principal).
 * API pública, no requiere key para uso básico.
 */
async function fetchPageSpeedInsights(url) {
  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&category=performance&strategy=mobile`;

    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(PAGESPEED_TIMEOUT),
    });

    if (!response.ok) {
      return { available: false };
    }

    const data = await response.json();
    const lighthouse = data.lighthouseResult;

    if (!lighthouse) {
      return { available: false };
    }

    const audits = lighthouse.audits || {};

    return {
      available: true,
      performanceScore: Math.round(
        (lighthouse.categories?.performance?.score || 0) * 100
      ),
      lcp: audits["largest-contentful-paint"]?.numericValue
        ? Math.round(audits["largest-contentful-paint"].numericValue)
        : null,
      cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
      tbt: audits["total-blocking-time"]?.numericValue
        ? Math.round(audits["total-blocking-time"].numericValue)
        : null,
      speedIndex: audits["speed-index"]?.numericValue
        ? Math.round(audits["speed-index"].numericValue)
        : null,
      ttfb: audits["server-response-time"]?.numericValue
        ? Math.round(audits["server-response-time"].numericValue)
        : null,
    };
  } catch {
    return { available: false };
  }
}

// ============================================================================
// 9. CÓMPUTO DE SCORES
// ============================================================================

/**
 * Calcula el score final ponderado basado en 4 pilares:
 * - Infraestructura Técnica (25%)
 * - Contenido & SEO (25%)
 * - Accesibilidad (10%)
 * - GEO/AEO (40%)
 */
function computeOverallScore(technical, content, accessibility, metrics2026) {
  // --- Pilar 1: Infraestructura Técnica (25%) ---
  let techScore = 0;
  const techMax = 100;
  if (technical.robotsTxt) techScore += 12;
  if (technical.robotsTxtDetails.allowsAIBots) techScore += 8;
  if (technical.llmsTxt) techScore += 10;
  if (technical.llmsTxtQuality === "Completo") techScore += 5;
  if (technical.schemasFound > 0) techScore += 10;
  if (technical.hasGoodHierarchy) techScore += 10;
  if (technical.isSSR) techScore += 10;
  if (technical.https) techScore += 10;
  // Headers de seguridad (hasta 15 puntos)
  const secHeaders = technical.securityHeaders;
  if (secHeaders.hsts) techScore += 4;
  if (secHeaders.csp) techScore += 4;
  if (secHeaders.xFrameOptions) techScore += 4;
  if (secHeaders.xContentTypeOptions) techScore += 3;
  if (technical.sitemapXml) techScore += 10;

  techScore = Math.min(techMax, techScore);

  // --- Pilar 2: Contenido & SEO (25%) ---
  let contentScore = 0;
  // Meta completitud (30 puntos)
  if (content.meta.titleStatus === "good") contentScore += 10;
  else if (content.meta.titleStatus === "warn") contentScore += 5;
  if (content.meta.descriptionStatus === "good") contentScore += 10;
  else if (content.meta.descriptionStatus === "warn") contentScore += 5;
  if (content.meta.hasCanonical) contentScore += 5;
  if (content.meta.hasOgTags) contentScore += 5;
  // BLUF (15 puntos)
  contentScore += Math.round((content.blufScore / 10) * 15);
  // Datos factuales (15 puntos)
  contentScore += Math.min(15, content.statsCount * 3);
  // Escaneabilidad (10 puntos)
  if (content.isScannable) contentScore += 10;
  // Autoría (10 puntos)
  if (content.hasAuthor) contentScore += 10;
  // Palabras adecuadas (10 puntos)
  if (content.wordCount >= 300) contentScore += 5;
  if (content.wordCount >= 800) contentScore += 5;

  contentScore = Math.min(100, contentScore);

  // --- Pilar 3: Accesibilidad (10%) ---
  const a11yScore = accessibility.score;

  // --- Pilar 4: GEO/AEO (40%) ---
  const geo = metrics2026.geoAlignment;
  const geoAvg =
    (geo.directness +
      geo.fact_density +
      geo.structural_clarity +
      geo.authority +
      geo.technical_health) /
    5;
  // Mezclar SoM y geoAvg para el score GEO
  const geoScore = Math.round(metrics2026.somSimulation * 0.5 + geoAvg * 0.5);

  // Score final ponderado
  const overallScore = Math.round(
    techScore * 0.25 +
      contentScore * 0.25 +
      a11yScore * 0.1 +
      geoScore * 0.4
  );

  return Math.max(0, Math.min(100, overallScore));
}

// ============================================================================
// HELPERS (objetos vacíos)
// ============================================================================

function getEmptyMeta() {
  return {
    title: "",
    titleLength: 0,
    titleStatus: "error",
    description: "",
    descriptionLength: 0,
    descriptionStatus: "error",
    hasCanonical: false,
    hasOgTags: false,
    ogTagsList: [],
    hasTwitterCards: false,
    hasLang: false,
    langValue: "",
    hasViewport: false,
    hasCharset: false,
  };
}

function getEmptyContent() {
  return {
    blufScore: 0,
    blufDetected: false,
    statsCount: 0,
    isScannable: false,
    hasAuthor: false,
    wordCount: 0,
    fullText: "",
  };
}

function getEmptyAccessibility() {
  return {
    imagesTotal: 0,
    imagesWithoutAlt: 0,
    hasLangAttribute: false,
    hasSkipLink: false,
    formsTotal: 0,
    formsWithLabels: 0,
    score: 0,
  };
}

// ============================================================================
// FUNCIÓN PRINCIPAL: analyzeWebsite
// ============================================================================

/**
 * Analiza un sitio web completo.
 * Ejecuta fetches en paralelo y combina resultados.
 *
 * @param {string} url - URL completa del sitio a analizar
 * @returns {Object} - Resultado completo del análisis
 */
export async function analyzeWebsite(url) {
  // --- Paso 1: Fetch de todos los recursos en paralelo ---
  // PageSpeed se lanza aparte porque es lento y no debe bloquear
  const [resources, pageSpeedResult] = await Promise.all([
    fetchAllResources(url),
    fetchPageSpeedInsights(url).catch(() => ({ available: false })),
  ]);

  const { htmlText, htmlResponse, robotsText, llmsText, sitemapText, latencyMs } =
    resources;

  // --- Paso 2: Análisis de HTML ---
  const htmlAnalysis = analyzeHTML(htmlText);

  // --- Paso 3: Robots.txt ---
  const robotsResult = parseRobotsTxt(robotsText);

  // --- Paso 4: Sitemap ---
  const sitemapResult = analyzeSitemap(sitemapText);

  // --- Paso 5: llms.txt ---
  const llmsResult = analyzeLlmsTxt(llmsText);

  // --- Paso 6: Headers de seguridad ---
  const securityHeaders = analyzeSecurityHeaders(htmlResponse, url);

  // --- Paso 7: Análisis con Gemini AI ---
  let isAI = false;
  let aiError = null;
  let aiMetrics;

  const geminiResult = await analyzeWithGemini(
    url,
    htmlAnalysis.content.fullText,
    {
      title: htmlAnalysis.meta.title,
      description: htmlAnalysis.meta.description,
    }
  );

  if (geminiResult.success) {
    isAI = true;
    aiMetrics = geminiResult.data;
  } else {
    aiError = geminiResult.error;
    aiMetrics = generateHeuristicScores(
      htmlAnalysis.content,
      htmlAnalysis.meta,
      htmlAnalysis.headings
    );
  }

  // --- Paso 8: Construir objetos de resultado ---
  const technical = {
    robotsTxt: robotsResult.exists,
    robotsTxtDetails: {
      allowsAIBots: robotsResult.allowsAIBots,
      blockedBots: robotsResult.blockedBots,
    },
    llmsTxt: llmsResult.exists,
    llmsTxtQuality: llmsResult.quality,
    sitemapXml: sitemapResult.exists,
    sitemapUrlCount: sitemapResult.urlCount,
    schemasFound: htmlAnalysis.schemas.count,
    schemaTypes: htmlAnalysis.schemas.types,
    hasGoodHierarchy: htmlAnalysis.headings.hasGoodHierarchy,
    h1Count: htmlAnalysis.headings.h1,
    h2Count: htmlAnalysis.headings.h2,
    h3Count: htmlAnalysis.headings.h3,
    isSSR: htmlAnalysis.isSSR,
    https: securityHeaders.https,
    securityHeaders: {
      hsts: securityHeaders.hsts,
      csp: securityHeaders.csp,
      xFrameOptions: securityHeaders.xFrameOptions,
      xContentTypeOptions: securityHeaders.xContentTypeOptions,
    },
    latencyMs,
  };

  const contentResult = {
    meta: {
      title: htmlAnalysis.meta.title,
      titleLength: htmlAnalysis.meta.titleLength,
      titleStatus: htmlAnalysis.meta.titleStatus,
      description: htmlAnalysis.meta.description,
      descriptionLength: htmlAnalysis.meta.descriptionLength,
      descriptionStatus: htmlAnalysis.meta.descriptionStatus,
      hasCanonical: htmlAnalysis.meta.hasCanonical,
      hasOgTags: htmlAnalysis.meta.hasOgTags,
      ogTagsList: htmlAnalysis.meta.ogTagsList,
      hasTwitterCards: htmlAnalysis.meta.hasTwitterCards,
      hasLang: htmlAnalysis.meta.hasLang,
      langValue: htmlAnalysis.meta.langValue,
      hasViewport: htmlAnalysis.meta.hasViewport,
    },
    blufScore: aiMetrics.bluf_score ?? htmlAnalysis.content.blufScore,
    blufDetected: htmlAnalysis.content.blufDetected,
    statsCount: htmlAnalysis.content.statsCount,
    isScannable: htmlAnalysis.content.isScannable,
    hasAuthor: htmlAnalysis.content.hasAuthor,
    wordCount: htmlAnalysis.content.wordCount,
  };

  const accessibilityResult = {
    imagesTotal: htmlAnalysis.accessibility.imagesTotal,
    imagesWithoutAlt: htmlAnalysis.accessibility.imagesWithoutAlt,
    hasLangAttribute: htmlAnalysis.accessibility.hasLangAttribute,
    hasSkipLink: htmlAnalysis.accessibility.hasSkipLink,
    formsTotal: htmlAnalysis.accessibility.formsTotal,
    formsWithLabels: htmlAnalysis.accessibility.formsWithLabels,
    score: htmlAnalysis.accessibility.score,
  };

  const metrics2026 = {
    somSimulation: aiMetrics.som_score,
    ragProbability: aiMetrics.rag_probability,
    sentimentScore: aiMetrics.sentiment_analysis,
    geoAlignment: {
      directness: aiMetrics.geo_alignment.directness,
      fact_density: aiMetrics.geo_alignment.fact_density,
      structural_clarity: aiMetrics.geo_alignment.structural_clarity,
      authority: aiMetrics.geo_alignment.authority,
      technical_health: aiMetrics.geo_alignment.technical_health,
    },
    semanticIntent: {
      informational: aiMetrics.semantic_intent.informational,
      commercial: aiMetrics.semantic_intent.commercial,
      transactional: aiMetrics.semantic_intent.transactional,
    },
    signalToNoise: aiMetrics.signal_to_noise,
    criticalFindings: aiMetrics.critical_findings || [],
  };

  // --- Paso 9: Performance (PageSpeed) ---
  const performance = {
    available: pageSpeedResult?.available || false,
    performanceScore: pageSpeedResult?.performanceScore ?? null,
    lcp: pageSpeedResult?.lcp ?? null,
    cls: pageSpeedResult?.cls ?? null,
    tbt: pageSpeedResult?.tbt ?? null,
    speedIndex: pageSpeedResult?.speedIndex ?? null,
    ttfb: pageSpeedResult?.ttfb ?? null,
  };

  // --- Paso 10: Score Final ---
  const overallScore = computeOverallScore(
    technical,
    contentResult,
    accessibilityResult,
    metrics2026
  );

  // --- Resultado final ---
  return {
    success: true,
    isAI,
    aiError,
    overallScore,
    url,
    analyzedAt: new Date().toISOString(),
    technical,
    content: contentResult,
    accessibility: accessibilityResult,
    metrics2026,
    performance,
  };
}
