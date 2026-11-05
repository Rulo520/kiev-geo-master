import * as cheerio from "cheerio";

// ============================================================================
// KIEV GEO MASTER — Motor de Análisis v3.0
// Análisis integral: SEO técnico, contenido, accesibilidad, GEO/AEO,
// links internos, imágenes, hreflang, CWV offline, social, keywords
// ============================================================================

// --- Constantes ---
const FETCH_TIMEOUT = 5000;        // Timeout para fetches de recursos (ms)
const PAGESPEED_TIMEOUT = 20000;   // Timeout para PageSpeed Insights (ms) — v3: 15s → 20s
const GEMINI_TIMEOUT = 45000;      // Timeout para Gemini API (ms) — v3: 30s → 45s
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

// Stop words en español e inglés para extracción de keywords
const STOP_WORDS_ES = new Set([
  "de", "la", "que", "el", "en", "y", "a", "los", "del", "se", "las",
  "por", "un", "para", "con", "no", "una", "su", "al", "lo", "como",
  "más", "pero", "sus", "le", "ya", "o", "este", "sí", "porque", "esta",
  "entre", "cuando", "muy", "sin", "sobre", "también", "me", "hasta",
  "hay", "donde", "quien", "desde", "todo", "nos", "durante", "todos",
  "uno", "les", "ni", "contra", "otros", "ese", "eso", "ante", "ellos",
  "e", "esto", "mí", "antes", "algunos", "qué", "unos", "yo", "otro",
  "otras", "otra", "él", "tanto", "esa", "estos", "mucho", "quienes",
  "nada", "muchos", "cual", "poco", "ella", "estar", "estas", "algunas",
  "algo", "nosotros", "mi", "mis", "tú", "te", "ti", "tu", "tus",
  "ellas", "nosotras", "vosotros", "vosotras", "os", "mío", "mía",
  "ser", "es", "son", "fue", "era", "han", "ha", "está", "están",
]);
const STOP_WORDS_EN = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her",
  "she", "or", "an", "will", "my", "one", "all", "would", "there",
  "their", "what", "so", "up", "out", "if", "about", "who", "get",
  "which", "go", "me", "when", "make", "can", "like", "time", "no",
  "just", "him", "know", "take", "people", "into", "year", "your",
  "good", "some", "could", "them", "see", "other", "than", "then",
  "now", "look", "only", "come", "its", "over", "think", "also",
  "back", "after", "use", "two", "how", "our", "work", "first",
  "well", "way", "even", "new", "want", "because", "any", "these",
  "give", "day", "most", "us", "is", "are", "was", "were", "been",
  "has", "had", "did", "does", "am",
]);
/** @type {Set<string>} Conjunto combinado de stop words */
const ALL_STOP_WORDS = new Set([...STOP_WORDS_ES, ...STOP_WORDS_EN]);

// Anchor texts genéricos que indican mala calidad de links
const GENERIC_ANCHORS = new Set([
  "click here", "read more", "learn more", "more", "here", "link",
  "leer más", "ver más", "haz clic", "clic aquí", "aquí", "más info",
  "saber más", "ver", "continuar", "seguir leyendo",
]);

// ============================================================================
// 1. FETCHING DE RECURSOS (en paralelo)
// ============================================================================

/**
 * Fetch seguro con timeout y manejo de errores graceful.
 * Retorna null si falla en vez de lanzar excepción.
 */
const safeFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(options.timeout || FETCH_TIMEOUT),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; KievGEOMaster/3.0; +https://kiev.agency)",
        ...(options.headers || {}),
      },
      redirect: "follow",
    });
    return response;
  } catch {
    return null;
  }
};

/**
 * Descarga todos los recursos necesarios en paralelo.
 * Mide la latencia de la página principal.
 */
const fetchAllResources = async (url) => {
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
};

// ============================================================================
// 2. PARSING DE ROBOTS.TXT
// ============================================================================

/**
 * Parsea robots.txt y verifica si bloquea bots de IA específicos.
 * Busca reglas Disallow: / para cada bot y para el wildcard *.
 */
const parseRobotsTxt = (robotsText) => {
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
};

/**
 * Verifica si un bot tiene una regla Allow explícita en robots.txt
 */
const hasExplicitAllow = (robotsText, botName) => {
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
};

// ============================================================================
// 3. ANÁLISIS HTML CON CHEERIO
// ============================================================================

/**
 * Analiza el HTML completo: meta tags, headings, schemas, contenido,
 * accesibilidad y detección de SSR.
 */
const analyzeHTML = (htmlText) => {
  if (!htmlText) {
    return {
      meta: getEmptyMeta(),
      headings: { h1: 0, h2: 0, h3: 0, h4: 0, hasGoodHierarchy: false },
      schemas: { count: 0, types: [] },
      content: getEmptyContent(),
      accessibility: getEmptyAccessibility(),
      isSSR: false,
      $: null,
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

  return { meta, headings, schemas, content, accessibility, isSSR, $ };
};

/**
 * Extrae y evalúa todos los meta tags relevantes.
 */
const analyzeMetaTags = ($) => {
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
};

/**
 * Analiza la jerarquía de headings.
 * Válida = exactamente 1 h1 y al menos 1 h2.
 */
const analyzeHeadings = ($) => {
  const h1 = $("h1").length;
  const h2 = $("h2").length;
  const h3 = $("h3").length;
  const h4 = $("h4").length;
  const hasGoodHierarchy = h1 === 1 && h2 >= 1;

  return { h1, h2, h3, h4, hasGoodHierarchy };
};

/**
 * Extrae schemas JSON-LD del HTML.
 */
const analyzeSchemas = ($) => {
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
};

/**
 * Analiza el contenido textual: palabras, BLUF, datos factuales,
 * escaneabilidad y señales de autoría.
 */
const analyzeContent = ($) => {
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
    fullText, // Se usará internamente para Gemini y keywords
  };
};

/**
 * Detecta si un párrafo sigue el patrón BLUF:
 * responde directamente, sin rodeos.
 */
const detectBLUF = (paragraph) => {
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
};

/**
 * Detecta señales de autoría en el HTML.
 */
const detectAuthorSignals = ($) => {
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
};

/**
 * Análisis de accesibilidad básico.
 */
const analyzeAccessibility = ($) => {
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
};

/**
 * Detecta si la página usa Server-Side Rendering.
 * Verifica que el body tenga contenido textual real (> 200 chars).
 */
const detectSSR = ($) => {
  // Extraer texto visible del body, excluyendo scripts y styles
  const bodyClone = $("body").clone();
  bodyClone.find("script, style, noscript").remove();
  const bodyText = bodyClone.text().replace(/\s+/g, " ").trim();

  return bodyText.length > 200;
};

// ============================================================================
// 4. HEADERS DE SEGURIDAD
// ============================================================================

/**
 * Analiza headers de seguridad de la respuesta HTTP.
 */
const analyzeSecurityHeaders = (response, url) => {
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
};

// ============================================================================
// 5. ANÁLISIS DE SITEMAP
// ============================================================================

/**
 * Parsea sitemap.xml y cuenta URLs usando regex simple.
 */
const analyzeSitemap = (sitemapText) => {
  if (!sitemapText) {
    return { exists: false, urlCount: 0 };
  }

  // Contar tags <loc> en el sitemap
  const locMatches = sitemapText.match(/<loc>/gi);
  const urlCount = locMatches ? locMatches.length : 0;

  return { exists: true, urlCount };
};

// ============================================================================
// 6. CALIDAD DE LLMS.TXT
// ============================================================================

/**
 * Evalúa la calidad del archivo llms.txt.
 */
const analyzeLlmsTxt = (llmsText) => {
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
};

// ============================================================================
// 7. ANÁLISIS CON GEMINI AI (v3: mejor manejo de errores)
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
 * Clasifica un error de la API de Gemini en un código semántico específico.
 *
 * @param {number|null} httpStatus - Código HTTP de la respuesta (o null si no hubo respuesta)
 * @param {Error|null} err - Error capturado durante la llamada
 * @returns {{ errorCode: string, errorMessage: string, httpStatus: number|null }}
 */
const classifyGeminiError = (httpStatus, err) => {
  // Timeout del AbortSignal
  if (err && (err.name === "TimeoutError" || err.name === "AbortError")) {
    return {
      errorCode: "timeout",
      errorMessage: `La solicitud a Gemini excedió el timeout de ${GEMINI_TIMEOUT}ms`,
      httpStatus: null,
    };
  }

  // Errores basados en HTTP status
  if (httpStatus === 402) {
    return {
      errorCode: "credits_exhausted",
      errorMessage: "Créditos de la API de Gemini agotados (HTTP 402)",
      httpStatus: 402,
    };
  }
  if (httpStatus === 429) {
    return {
      errorCode: "quota_exceeded",
      errorMessage: "Cuota de la API de Gemini excedida (HTTP 429). Reintentar más tarde.",
      httpStatus: 429,
    };
  }
  if (httpStatus === 404) {
    return {
      errorCode: "model_not_found",
      errorMessage: `Modelo de Gemini no encontrado (HTTP 404)`,
      httpStatus: 404,
    };
  }
  if (httpStatus === 403) {
    return {
      errorCode: "api_key_invalid",
      errorMessage: "API key de Gemini inválida o sin permisos (HTTP 403)",
      httpStatus: 403,
    };
  }

  // Error genérico con status HTTP
  if (httpStatus && httpStatus >= 400) {
    return {
      errorCode: "unknown",
      errorMessage: `Error HTTP ${httpStatus} de la API de Gemini`,
      httpStatus,
    };
  }

  // Error de red u otro
  return {
    errorCode: "unknown",
    errorMessage: err?.message || "Error desconocido al contactar Gemini",
    httpStatus: null,
  };
};

/**
 * Llama a la API de Gemini para análisis semántico profundo.
 * Usa structured output para evitar parsing manual de JSON.
 * Intenta modelo primario, luego fallback.
 *
 * v3: Retorna códigos de error específicos y el status HTTP.
 */
const analyzeWithGemini = async (url, textContent, metaSummary) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "GEMINI_API_KEY no configurada",
      errorCode: "api_key_missing",
      httpStatus: null,
    };
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
  /** @type {{ errorCode: string, errorMessage: string, httpStatus: number|null }|null} */
  let lastError = null;

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
        lastError = classifyGeminiError(response.status, null);
        continue; // Intentar fallback
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        console.error(`Gemini ${model}: respuesta vacía`);
        lastError = { errorCode: "unknown", errorMessage: `Gemini ${model}: respuesta vacía`, httpStatus: null };
        continue;
      }

      // Con structured output, el texto ya es JSON válido
      const parsed = JSON.parse(text);
      return { success: true, data: parsed, model };
    } catch (err) {
      console.error(`Gemini ${model} falló:`, err.message);
      lastError = classifyGeminiError(null, err);
      continue;
    }
  }

  return {
    success: false,
    error: lastError?.errorMessage || "Ambos modelos de Gemini fallaron",
    errorCode: lastError?.errorCode || "unknown",
    httpStatus: lastError?.httpStatus || null,
  };
};

/**
 * Genera scores heurísticos cuando Gemini no está disponible.
 */
const generateHeuristicScores = (content, meta, headings) => {
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
};

// ============================================================================
// 8. PAGESPEED INSIGHTS (v3: soporte para PAGESPEED_API_KEY)
// ============================================================================

/**
 * Obtiene métricas de PageSpeed Insights.
 * v3: Usa PAGESPEED_API_KEY si está disponible para evitar rate limiting.
 */
const fetchPageSpeedInsights = async (url) => {
  try {
    let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&category=performance&strategy=mobile`;

    // v3: Agregar API key si está configurada para evitar rate limiting
    const pageSpeedKey = process.env.PAGESPEED_API_KEY;
    if (pageSpeedKey) {
      apiUrl += `&key=${pageSpeedKey}`;
    }

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
};

// ============================================================================
// 9. NUEVOS MÓDULOS DE ANÁLISIS v3
// ============================================================================

// ---- 9a. Análisis de Links Internos/Externos ----

/**
 * Analiza la distribución y calidad de los links de la página.
 * Clasifica en internos vs externos, detecta problemas comunes
 * como links vacíos, anchor text genérico y falta de rel="noopener".
 *
 * @param {import('cheerio').CheerioAPI} $ - Instancia de Cheerio cargada con el HTML
 * @param {string} url - URL de la página analizada (para determinar el origin)
 * @returns {{ totalLinks: number, internalCount: number, externalCount: number, emptyHrefCount: number, genericAnchorCount: number, nofollowCount: number, externalWithoutNoopener: number }}
 */
const analyzeInternalLinks = ($, url) => {
  let origin = "";
  try {
    origin = new URL(url).origin;
  } catch {
    // Si la URL no es parseable, todo es "externo"
  }

  const links = $("a");
  let totalLinks = 0;
  let internalCount = 0;
  let externalCount = 0;
  let emptyHrefCount = 0;
  let genericAnchorCount = 0;
  let nofollowCount = 0;
  let externalWithoutNoopener = 0;

  links.each((_, el) => {
    totalLinks++;
    const href = ($(el).attr("href") || "").trim();
    const rel = ($(el).attr("rel") || "").toLowerCase();
    const anchorText = $(el).text().trim().toLowerCase();

    // Links vacíos o javascript:void(0)
    if (!href || href === "#" || href.startsWith("javascript:")) {
      emptyHrefCount++;
      return; // continuar al siguiente
    }

    // Anchor text genérico
    if (anchorText && GENERIC_ANCHORS.has(anchorText)) {
      genericAnchorCount++;
    }

    // Nofollow
    if (rel.includes("nofollow")) {
      nofollowCount++;
    }

    // Clasificar interno vs externo
    let isExternal = false;
    try {
      if (href.startsWith("http://") || href.startsWith("https://")) {
        const linkOrigin = new URL(href).origin;
        isExternal = linkOrigin !== origin;
      }
      // Links relativos, mailto:, tel: etc. se consideran internos
    } catch {
      // URL inválida, se ignora como interna
    }

    if (isExternal) {
      externalCount++;
      // Verificar si tiene rel="noopener noreferrer"
      if (!rel.includes("noopener") || !rel.includes("noreferrer")) {
        externalWithoutNoopener++;
      }
    } else {
      internalCount++;
    }
  });

  return {
    totalLinks,
    internalCount,
    externalCount,
    emptyHrefCount,
    genericAnchorCount,
    nofollowCount,
    externalWithoutNoopener,
  };
};

// ---- 9b. Optimización de Imágenes ----

/**
 * Analiza la optimización de imágenes en la página.
 * Verifica lazy loading, formatos modernos, dimensiones explícitas y responsividad.
 *
 * @param {import('cheerio').CheerioAPI} $ - Instancia de Cheerio
 * @returns {{ totalImages: number, withoutLazy: number, legacyFormatCount: number, withoutDimensions: number, withoutSrcset: number, score: number }}
 */
const analyzeImageOptimization = ($) => {
  const images = $("img");
  const totalImages = images.length;
  let withoutLazy = 0;
  let legacyFormatCount = 0;
  let withoutDimensions = 0;
  let withoutSrcset = 0;

  /** Extensiones de formatos legacy */
  const legacyExtensions = new Set([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff"]);

  images.each((i, el) => {
    const src = ($(el).attr("src") || "").toLowerCase();
    const loading = ($(el).attr("loading") || "").toLowerCase();
    const width = $(el).attr("width");
    const height = $(el).attr("height");
    const srcset = $(el).attr("srcset");
    const sizes = $(el).attr("sizes");

    // Las primeras 2 imágenes deberían ser eager (above the fold), el resto lazy
    if (i >= 2 && loading !== "lazy") {
      withoutLazy++;
    }

    // Detectar formatos legacy por extensión del src
    if (src) {
      const extMatch = src.match(/\.([a-z]+)(\?|$)/);
      if (extMatch) {
        const ext = `.${extMatch[1]}`;
        if (legacyExtensions.has(ext)) {
          legacyFormatCount++;
        }
      }
    }

    // Verificar dimensiones explícitas (previene CLS)
    if (!width || !height) {
      withoutDimensions++;
    }

    // Verificar responsive images
    if (!srcset && !sizes) {
      withoutSrcset++;
    }
  });

  // Score de optimización de imágenes (0-100)
  let score = 100;
  if (totalImages > 0) {
    const lazyPenalty = totalImages > 2 ? (withoutLazy / Math.max(1, totalImages - 2)) * 25 : 0;
    const formatPenalty = (legacyFormatCount / totalImages) * 25;
    const dimensionPenalty = (withoutDimensions / totalImages) * 25;
    const srcsetPenalty = (withoutSrcset / totalImages) * 25;
    score = Math.max(0, Math.round(100 - lazyPenalty - formatPenalty - dimensionPenalty - srcsetPenalty));
  }

  return {
    totalImages,
    withoutLazy,
    legacyFormatCount,
    withoutDimensions,
    withoutSrcset,
    score,
  };
};

// ---- 9c. Análisis de Hreflang ----

/**
 * Analiza las etiquetas hreflang de la página para internacionalización.
 * Verifica presencia, idiomas declarados, x-default y formato correcto.
 *
 * @param {import('cheerio').CheerioAPI} $ - Instancia de Cheerio
 * @returns {{ present: boolean, languages: string[], hasXDefault: boolean, isValid: boolean, count: number }}
 */
const analyzeHreflang = ($) => {
  const hreflangTags = $('link[rel="alternate"][hreflang]');
  const count = hreflangTags.length;

  if (count === 0) {
    return {
      present: false,
      languages: [],
      hasXDefault: false,
      isValid: true, // No hay tags, no hay error de formato
      count: 0,
    };
  }

  const languages = [];
  let hasXDefault = false;
  let isValid = true;

  // Regex para validar formato de hreflang (ISO 639-1, opcionalmente ISO 3166-1)
  const hreflangRegex = /^[a-z]{2}(-[A-Za-z]{2,4})?$/;

  hreflangTags.each((_, el) => {
    const lang = ($(el).attr("hreflang") || "").trim();
    const href = ($(el).attr("href") || "").trim();

    if (lang.toLowerCase() === "x-default") {
      hasXDefault = true;
    } else if (lang) {
      languages.push(lang);
      // Validar formato
      if (!hreflangRegex.test(lang)) {
        isValid = false;
      }
    }

    // Un hreflang sin href es inválido
    if (!href) {
      isValid = false;
    }
  });

  return {
    present: true,
    languages: [...new Set(languages)],
    hasXDefault,
    isValid,
    count,
  };
};

// ---- 9d. Estimación Offline de Core Web Vitals ----

/**
 * Estima el riesgo de Core Web Vitals cuando PageSpeed no está disponible.
 * Analiza el HTML estático en busca de señales de problemas de rendimiento.
 *
 * @param {import('cheerio').CheerioAPI} $ - Instancia de Cheerio
 * @param {string} htmlText - Texto HTML completo de la página
 * @returns {{ riskLevel: string, risks: string[], renderBlockingScripts: number, largeInlineStyles: number, hasLazyImages: boolean, hasFontDisplaySwap: boolean, hasPreconnect: boolean, hasPreload: boolean }}
 */
const estimateCWVOffline = ($, htmlText) => {
  const risks = [];

  // 1. Scripts en <head> sin async/defer (render-blocking)
  const headScripts = $("head script[src]");
  let renderBlockingScripts = 0;
  headScripts.each((_, el) => {
    const hasAsync = $(el).attr("async") !== undefined;
    const hasDefer = $(el).attr("defer") !== undefined;
    const type = ($(el).attr("type") || "").toLowerCase();
    // module scripts se ejecutan defer por defecto
    if (!hasAsync && !hasDefer && type !== "module") {
      renderBlockingScripts++;
    }
  });
  if (renderBlockingScripts > 0) {
    risks.push(`${renderBlockingScripts} script(s) render-blocking en <head> sin async/defer`);
  }

  // 2. Inline styles grandes (>500 caracteres)
  let largeInlineStyles = 0;
  $("style").each((_, el) => {
    const content = $(el).html() || "";
    if (content.length > 500) {
      largeInlineStyles++;
    }
  });
  if (largeInlineStyles > 0) {
    risks.push(`${largeInlineStyles} bloque(s) <style> inline con >500 caracteres`);
  }

  // 3. Lazy loading en imágenes
  const totalImgs = $("img").length;
  const lazyImgs = $('img[loading="lazy"]').length;
  const hasLazyImages = lazyImgs > 0;
  if (totalImgs > 2 && lazyImgs === 0) {
    risks.push("Ninguna imagen usa loading='lazy' — riesgo de carga lenta");
  }

  // 4. font-display: swap
  const hasFontDisplaySwap = htmlText.includes("font-display") &&
    /font-display\s*:\s*swap/i.test(htmlText);
  if (!hasFontDisplaySwap && (htmlText.includes("@font-face") || $('link[href*="fonts"]').length > 0)) {
    risks.push("No se detecta font-display: swap — riesgo de FOIT/FOUT");
  }

  // 5. Preconnect y preload hints
  const hasPreconnect = $('link[rel="preconnect"]').length > 0;
  const hasPreload = $('link[rel="preload"]').length > 0;
  if (!hasPreconnect) {
    risks.push("Sin <link rel='preconnect'> — los recursos de terceros cargan más lento");
  }
  if (!hasPreload) {
    risks.push("Sin <link rel='preload'> — recursos críticos no priorizados");
  }

  // Determinar nivel de riesgo
  let riskLevel = "low";
  if (risks.length >= 4) riskLevel = "high";
  else if (risks.length >= 2) riskLevel = "medium";

  return {
    riskLevel,
    risks,
    renderBlockingScripts,
    largeInlineStyles,
    hasLazyImages,
    hasFontDisplaySwap,
    hasPreconnect,
    hasPreload,
  };
};

// ---- 9e. Social Readiness ----

/**
 * Evalúa la preparación de la página para compartirse en redes sociales.
 * Verifica Open Graph, Twitter Cards, favicon, manifest, etc.
 *
 * @param {import('cheerio').CheerioAPI} $ - Instancia de Cheerio
 * @returns {{ ogImage: string|null, ogImageWidth: string|null, ogImageHeight: string|null, twitterCardType: string|null, hasFavicon: boolean, hasAppleTouchIcon: boolean, hasManifest: boolean, hasThemeColor: boolean, score: number }}
 */
const analyzeSocialReadiness = ($) => {
  // og:image
  const ogImage = $('meta[property="og:image"]').attr("content") || null;
  const ogImageWidth = $('meta[property="og:image:width"]').attr("content") || null;
  const ogImageHeight = $('meta[property="og:image:height"]').attr("content") || null;

  // Twitter card type
  const twitterCardType = $('meta[name="twitter:card"]').attr("content") || null;

  // Favicon
  const hasFavicon =
    $('link[rel="icon"]').length > 0 ||
    $('link[rel="shortcut icon"]').length > 0;

  // Apple touch icon
  const hasAppleTouchIcon = $('link[rel="apple-touch-icon"]').length > 0;

  // Web app manifest
  const hasManifest = $('link[rel="manifest"]').length > 0;

  // Theme color
  const hasThemeColor = $('meta[name="theme-color"]').length > 0;

  // Score de social readiness (0-100)
  let score = 0;
  if (ogImage) score += 25;           // og:image es lo más importante
  if (ogImageWidth && ogImageHeight) score += 5;
  if (twitterCardType) score += 15;
  if (hasFavicon) score += 15;
  if (hasAppleTouchIcon) score += 10;
  if (hasManifest) score += 15;
  if (hasThemeColor) score += 5;
  // Bonus por tener OG básico completo
  const hasOgTitle = $('meta[property="og:title"]').length > 0;
  const hasOgDesc = $('meta[property="og:description"]').length > 0;
  if (hasOgTitle && hasOgDesc && ogImage) score += 10;

  return {
    ogImage,
    ogImageWidth,
    ogImageHeight,
    twitterCardType,
    hasFavicon,
    hasAppleTouchIcon,
    hasManifest,
    hasThemeColor,
    score: Math.min(100, score),
  };
};

// ---- 9f. Extracción de Keywords ----

/**
 * Extrae keywords y bigrams del contenido textual de la página.
 * Elimina stop words en español e inglés, calcula frecuencias,
 * y evalúa la alineación entre keywords del título y el cuerpo.
 *
 * @param {string} fullText - Texto completo extraído de la página
 * @param {string} title - Título de la página
 * @returns {{ topKeywords: Array<{word: string, count: number}>, topBigrams: Array<{phrase: string, count: number}>, titleAlignmentScore: number }}
 */
const extractKeywords = (fullText, title) => {
  if (!fullText || fullText.length < 10) {
    return {
      topKeywords: [],
      topBigrams: [],
      titleAlignmentScore: 0,
    };
  }

  // Tokenizar: solo letras y números, mínimo 3 caracteres
  const tokens = fullText
    .toLowerCase()
    .replace(/[^a-záéíóúüñ0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !ALL_STOP_WORDS.has(w));

  // Frecuencia de palabras individuales
  /** @type {Map<string, number>} */
  const wordFreq = new Map();
  for (const token of tokens) {
    wordFreq.set(token, (wordFreq.get(token) || 0) + 1);
  }

  // Top 10 keywords
  const topKeywords = [...wordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  // Bigrams (pares de palabras consecutivas)
  /** @type {Map<string, number>} */
  const bigramFreq = new Map();
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`;
    bigramFreq.set(bigram, (bigramFreq.get(bigram) || 0) + 1);
  }

  // Top 5 bigrams (mínimo 2 ocurrencias para ser relevante)
  const topBigrams = [...bigramFreq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase, count]) => ({ phrase, count }));

  // Title alignment: ¿cuántas palabras del título aparecen en el body?
  let titleAlignmentScore = 0;
  if (title) {
    const titleTokens = title
      .toLowerCase()
      .replace(/[^a-záéíóúüñ0-9\s]/gi, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !ALL_STOP_WORDS.has(w));

    if (titleTokens.length > 0) {
      const bodyTokenSet = new Set(tokens);
      const matchCount = titleTokens.filter((t) => bodyTokenSet.has(t)).length;
      titleAlignmentScore = Math.round((matchCount / titleTokens.length) * 100);
    }
  }

  return {
    topKeywords,
    topBigrams,
    titleAlignmentScore,
  };
};

// ============================================================================
// 10. CÓMPUTO DE SCORES (v3: incorpora nuevos módulos)
// ============================================================================

/**
 * Calcula el score final ponderado basado en 4 pilares:
 * - Infraestructura Técnica (25%)
 * - Contenido & SEO (25%)
 * - Accesibilidad (10%)
 * - GEO/AEO (40%)
 *
 * v3: Incorpora imageOptimization en Technical, internalLinks y social en Content & SEO.
 *
 * @param {Object} technical - Datos técnicos de la página
 * @param {Object} content - Datos de contenido y meta
 * @param {Object} accessibility - Datos de accesibilidad
 * @param {Object} metrics2026 - Métricas GEO/AEO (de Gemini o heurísticas)
 * @param {Object} imageOptimization - Resultado de analyzeImageOptimization
 * @param {Object} internalLinks - Resultado de analyzeInternalLinks
 * @param {Object} social - Resultado de analyzeSocialReadiness
 * @returns {number} Score final 0-100
 */
const computeOverallScore = (technical, content, accessibility, metrics2026, imageOptimization, internalLinks, social) => {
  // --- Pilar 1: Infraestructura Técnica (25%) ---
  let techScore = 0;
  const techMax = 100;
  if (technical.robotsTxt) techScore += 10;
  if (technical.robotsTxtDetails.allowsAIBots) techScore += 7;
  if (technical.llmsTxt) techScore += 8;
  if (technical.llmsTxtQuality === "Completo") techScore += 5;
  if (technical.schemasFound > 0) techScore += 8;
  if (technical.hasGoodHierarchy) techScore += 8;
  if (technical.isSSR) techScore += 8;
  if (technical.https) techScore += 8;
  // Headers de seguridad (hasta 12 puntos)
  const secHeaders = technical.securityHeaders;
  if (secHeaders.hsts) techScore += 3;
  if (secHeaders.csp) techScore += 3;
  if (secHeaders.xFrameOptions) techScore += 3;
  if (secHeaders.xContentTypeOptions) techScore += 3;
  if (technical.sitemapXml) techScore += 8;
  // v3: Image optimization contribuye al score técnico (hasta 14 puntos)
  if (imageOptimization) {
    techScore += Math.round((imageOptimization.score / 100) * 14);
  }

  techScore = Math.min(techMax, techScore);

  // --- Pilar 2: Contenido & SEO (25%) ---
  let contentScore = 0;
  // Meta completitud (25 puntos)
  if (content.meta.titleStatus === "good") contentScore += 8;
  else if (content.meta.titleStatus === "warn") contentScore += 4;
  if (content.meta.descriptionStatus === "good") contentScore += 8;
  else if (content.meta.descriptionStatus === "warn") contentScore += 4;
  if (content.meta.hasCanonical) contentScore += 5;
  if (content.meta.hasOgTags) contentScore += 4;
  // BLUF (12 puntos)
  contentScore += Math.round((content.blufScore / 10) * 12);
  // Datos factuales (12 puntos)
  contentScore += Math.min(12, content.statsCount * 3);
  // Escaneabilidad (8 puntos)
  if (content.isScannable) contentScore += 8;
  // Autoría (8 puntos)
  if (content.hasAuthor) contentScore += 8;
  // Palabras adecuadas (8 puntos)
  if (content.wordCount >= 300) contentScore += 4;
  if (content.wordCount >= 800) contentScore += 4;
  // v3: Internal links quality (hasta 10 puntos)
  if (internalLinks) {
    let linkScore = 10;
    if (internalLinks.totalLinks > 0) {
      // Penalizar links vacíos
      if (internalLinks.emptyHrefCount > 3) linkScore -= 3;
      // Penalizar anchor text genérico
      if (internalLinks.genericAnchorCount > 5) linkScore -= 3;
      // Penalizar links externos sin noopener
      if (internalLinks.externalWithoutNoopener > 3) linkScore -= 2;
      // Bonus por tener balance de links
      if (internalLinks.internalCount > 0 && internalLinks.externalCount > 0) linkScore += 2;
    } else {
      linkScore = 2; // Sin links = malo
    }
    contentScore += Math.max(0, Math.min(10, linkScore));
  }
  // v3: Social readiness (hasta 7 puntos — peso menor)
  if (social) {
    contentScore += Math.round((social.score / 100) * 7);
  }

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
};

// ============================================================================
// HELPERS (objetos vacíos)
// ============================================================================

const getEmptyMeta = () => ({
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
});

const getEmptyContent = () => ({
  blufScore: 0,
  blufDetected: false,
  statsCount: 0,
  isScannable: false,
  hasAuthor: false,
  wordCount: 0,
  fullText: "",
});

const getEmptyAccessibility = () => ({
  imagesTotal: 0,
  imagesWithoutAlt: 0,
  hasLangAttribute: false,
  hasSkipLink: false,
  formsTotal: 0,
  formsWithLabels: 0,
  score: 0,
});

// ============================================================================
// FUNCIÓN PRINCIPAL: analyzeWebsite
// ============================================================================

/**
 * Analiza un sitio web completo.
 * Ejecuta fetches en paralelo y combina resultados.
 *
 * @param {string} url - URL completa del sitio a analizar
 * @returns {Promise<Object>} - Resultado completo del análisis
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

  // --- Paso 2: Análisis de HTML (retorna $ para reutilizar en módulos v3) ---
  const htmlAnalysis = analyzeHTML(htmlText);
  const $ = htmlAnalysis.$;

  // --- Paso 3: Robots.txt ---
  const robotsResult = parseRobotsTxt(robotsText);

  // --- Paso 4: Sitemap ---
  const sitemapResult = analyzeSitemap(sitemapText);

  // --- Paso 5: llms.txt ---
  const llmsResult = analyzeLlmsTxt(llmsText);

  // --- Paso 6: Headers de seguridad ---
  const securityHeaders = analyzeSecurityHeaders(htmlResponse, url);

  // --- Paso 7: Nuevos módulos v3 (usan $ de Cheerio) ---
  const internalLinksResult = $ ? analyzeInternalLinks($, url) : {
    totalLinks: 0, internalCount: 0, externalCount: 0,
    emptyHrefCount: 0, genericAnchorCount: 0, nofollowCount: 0,
    externalWithoutNoopener: 0,
  };

  const imageOptimizationResult = $ ? analyzeImageOptimization($) : {
    totalImages: 0, withoutLazy: 0, legacyFormatCount: 0,
    withoutDimensions: 0, withoutSrcset: 0, score: 0,
  };

  const hreflangResult = $ ? analyzeHreflang($) : {
    present: false, languages: [], hasXDefault: false, isValid: true, count: 0,
  };

  const socialResult = $ ? analyzeSocialReadiness($) : {
    ogImage: null, ogImageWidth: null, ogImageHeight: null,
    twitterCardType: null, hasFavicon: false, hasAppleTouchIcon: false,
    hasManifest: false, hasThemeColor: false, score: 0,
  };

  const keywordsResult = extractKeywords(
    htmlAnalysis.content.fullText,
    htmlAnalysis.meta.title
  );

  // --- Paso 7b: Estimación CWV offline (solo si PageSpeed no está disponible) ---
  const cwvEstimate = (!pageSpeedResult?.available && $ && htmlText)
    ? estimateCWVOffline($, htmlText)
    : null;

  // --- Paso 8: Análisis con Gemini AI ---
  let isAI = false;
  let aiError = null;
  let aiErrorCode = null;
  let aiHttpStatus = null;
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
    aiErrorCode = geminiResult.errorCode || null;
    aiHttpStatus = geminiResult.httpStatus || null;
    aiMetrics = generateHeuristicScores(
      htmlAnalysis.content,
      htmlAnalysis.meta,
      htmlAnalysis.headings
    );
  }

  // --- Paso 9: Construir objetos de resultado ---
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
    // v3: Nuevos datos técnicos
    internalLinks: internalLinksResult,
    imageOptimization: imageOptimizationResult,
    hreflang: hreflangResult,
    cwvEstimate, // null si PageSpeed está disponible
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
    // v3: Keywords
    keywords: keywordsResult,
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

  // --- Paso 10: Performance (PageSpeed) ---
  const performance = {
    available: pageSpeedResult?.available || false,
    performanceScore: pageSpeedResult?.performanceScore ?? null,
    lcp: pageSpeedResult?.lcp ?? null,
    cls: pageSpeedResult?.cls ?? null,
    tbt: pageSpeedResult?.tbt ?? null,
    speedIndex: pageSpeedResult?.speedIndex ?? null,
    ttfb: pageSpeedResult?.ttfb ?? null,
  };

  // --- Paso 11: Social Readiness (v3: nuevo top-level key) ---
  const social = socialResult;

  // --- Paso 12: Score Final (v3: incluye nuevos módulos) ---
  const overallScore = computeOverallScore(
    technical,
    contentResult,
    accessibilityResult,
    metrics2026,
    imageOptimizationResult,
    internalLinksResult,
    socialResult
  );

  // --- Resultado final ---
  return {
    success: true,
    isAI,
    aiError,
    aiErrorCode,     // v3: código de error específico
    aiHttpStatus,    // v3: HTTP status del error
    overallScore,
    url,
    analyzedAt: new Date().toISOString(),
    technical,
    content: contentResult,
    accessibility: accessibilityResult,
    metrics2026,
    performance,
    social,          // v3: nuevo top-level key
  };
}
