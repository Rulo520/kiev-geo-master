"use client";
import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Search,
  FileText,
  Bot,
  Zap,
  BookOpen,
  ListChecks,
  Target,
  BarChart3,
  Waves,
  Info,
  Shield,
  Globe,
  Image,
  Type,
  Hash,
  Clock,
  Gauge,
  Eye,
  Accessibility,
  FileSearch,
  AlertOctagon,
  Sparkles,
  Monitor,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import styles from "../app/page.module.css";

/* ──────────────────────────────────────────────
   SMALL INLINE COMPONENTS
   ────────────────────────────────────────────── */

/** Audit mode badge: AI (Gemini) or Heuristic */
function AuditModeBadge({ isAI, aiError }) {
  if (isAI && !aiError) {
    return (
      <span className={`${styles.auditBadge} ${styles.badgeAI}`}>
        <Sparkles size={13} /> Auditoría IA (Gemini)
      </span>
    );
  }
  return (
    <span className={`${styles.auditBadge} ${styles.badgeHeuristic}`}>
      <Activity size={13} /> Análisis Heurístico
    </span>
  );
}

/** Animated SVG donut for the overall score */
function ScoreDonut({ score = 0 }) {
  const [offset, setOffset] = useState(377);
  const r = 60;
  const circ = 2 * Math.PI * r; // ~377
  const clamp = Math.max(0, Math.min(100, score));

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circ - (clamp / 100) * circ);
    }, 120);
    return () => clearTimeout(timer);
  }, [clamp, circ]);

  const color =
    clamp >= 80 ? "var(--success)" : clamp >= 50 ? "var(--warning)" : "var(--danger)";

  return (
    <div className={styles.donutWrapper}>
      <svg className={styles.donutSvg} viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} className={styles.donutBackground} />
        <circle
          cx="70"
          cy="70"
          r={r}
          className={styles.donutProgress}
          style={{
            stroke: color,
            strokeDasharray: circ,
            strokeDashoffset: offset,
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>
      <div className={styles.donutText}>
        <span style={{ color }}>{clamp}</span>
        <span>/ 100</span>
      </div>
    </div>
  );
}

/** Small CWV gauge (60×60) */
function PerformanceGauge({ value, max, thresholds, label, unit = "" }) {
  const [off, setOff] = useState(151);
  const r = 24;
  const circ = 2 * Math.PI * r; // ~151

  const safeVal = value ?? 0;
  const pct = max ? Math.min(safeVal / max, 1) : 0;

  let color = "var(--success)";
  if (thresholds) {
    if (safeVal > thresholds[1]) color = "var(--danger)";
    else if (safeVal > thresholds[0]) color = "var(--warning)";
  }

  useEffect(() => {
    const t = setTimeout(() => setOff(circ - pct * circ), 150);
    return () => clearTimeout(t);
  }, [pct, circ]);

  if (value === null || value === undefined) {
    return (
      <div className={styles.cwvGauge}>
        <svg width="60" height="60" viewBox="0 0 60 60">
          <circle
            cx="30" cy="30" r={r}
            fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5"
          />
        </svg>
        <span className={styles.cwvGaugeLabel}>{label}</span>
        <span className={styles.cwvGaugeValue} style={{ color: "var(--text-muted)" }}>—</span>
      </div>
    );
  }

  return (
    <div className={styles.cwvGauge}>
      <svg width="60" height="60" viewBox="0 0 60 60" style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx="30" cy="30" r={r}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5"
        />
        <circle
          cx="30" cy="30" r={r}
          fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={off}
          style={{
            transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)",
            filter: `drop-shadow(0 0 4px ${color})`,
          }}
        />
      </svg>
      <span className={styles.cwvGaugeLabel}>{label}</span>
      <span className={styles.cwvGaugeValue} style={{ color }}>
        {typeof safeVal === "number" && safeVal % 1 !== 0 ? safeVal.toFixed(2) : safeVal}
        {unit}
      </span>
    </div>
  );
}

/** 5-axis radar for GEO Alignment */
function RadarChart({ data }) {
  if (!data) return null;
  const axes = [
    { key: "directness", label: "Directness" },
    { key: "fact_density", label: "Fact Density" },
    { key: "structural_clarity", label: "Structure" },
    { key: "authority", label: "Authority" },
    { key: "technical_health", label: "Tech Health" },
  ];

  const cx = 120,
    cy = 120,
    R = 90;
  const n = axes.length;
  const angleStep = (2 * Math.PI) / n;

  const point = (i, val) => {
    const a = angleStep * i - Math.PI / 2;
    const rr = (val / 10) * R;
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  };

  const gridLevels = [2, 4, 6, 8, 10];

  return (
    <div className={styles.radarCard}>
      <svg width="240" height="260" viewBox="0 0 240 260">
        {/* Grid polygons */}
        {gridLevels.map((lv) => (
          <polygon
            key={lv}
            points={axes.map((_, i) => point(i, lv).join(",")).join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}
        {/* Axis lines */}
        {axes.map((_, i) => {
          const [px, py] = point(i, 10);
          return (
            <line
              key={i}
              x1={cx} y1={cy} x2={px} y2={py}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1"
            />
          );
        })}
        {/* Data polygon */}
        <polygon
          points={axes.map((a, i) => point(i, data[a.key] ?? 0).join(",")).join(" ")}
          fill="rgba(108,92,231,0.18)"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Data points */}
        {axes.map((a, i) => {
          const [px, py] = point(i, data[a.key] ?? 0);
          return <circle key={i} cx={px} cy={py} r="3.5" fill="var(--primary)" />;
        })}
        {/* Labels */}
        {axes.map((a, i) => {
          const [px, py] = point(i, 12);
          return (
            <text
              key={i}
              x={px} y={py}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--text-muted)"
              fontSize="10"
              fontFamily="var(--font)"
            >
              {a.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/** Horizontal animated bars for semantic intent + signal-to-noise */
function IntentBars({ intent, signalToNoise }) {
  if (!intent) return null;

  const bars = [
    { label: "Informacional", value: intent.informational ?? 0, color: "var(--primary)" },
    { label: "Comercial", value: intent.commercial ?? 0, color: "var(--accent)" },
    { label: "Transaccional", value: intent.transactional ?? 0, color: "var(--warning)" },
  ];

  const sn = signalToNoise ?? 0;
  const snColor =
    sn >= 0.7 ? "var(--success)" : sn >= 0.4 ? "var(--warning)" : "var(--danger)";

  return (
    <div className={styles.intentCard}>
      {bars.map((b) => (
        <div key={b.label} className={styles.barRow}>
          <div className={styles.barLabel}>
            <span>{b.label}</span>
            <span>{Math.round(b.value * 100)}%</span>
          </div>
          <div className={styles.barBg}>
            <div
              className={styles.barFill}
              style={{
                width: `${Math.round(b.value * 100)}%`,
                background: b.color,
              }}
            />
          </div>
        </div>
      ))}
      <div className={styles.noiseIndicator}>
        <div className={styles.noiseHeader}>
          <span><Waves size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />Señal/Ruido</span>
          <span className={styles.noiseValue} style={{ color: snColor }}>
            {(sn * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

/** Status icon: green check, red X, yellow warning */
function StatusIcon({ status }) {
  if (status === "good" || status === true) {
    return (
      <span className={`${styles.statusIcon} ${styles.statusGood}`}>
        <CheckCircle2 size={16} />
      </span>
    );
  }
  if (status === "warn" || status === "warning") {
    return (
      <span className={`${styles.statusIcon} ${styles.statusWarn}`}>
        <AlertTriangle size={16} />
      </span>
    );
  }
  return (
    <span className={`${styles.statusIcon} ${styles.statusError}`}>
      <XCircle size={16} />
    </span>
  );
}

/** Metric row: label + value + status icon */
function MetricRow({ label, value, status, icon: Icon, tooltip }) {
  return (
    <div className={styles.metricRow}>
      <span className={styles.metricLabel}>
        {Icon && <Icon size={15} />}
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </span>
      <span className={styles.metricValue}>
        {value}
        {status !== undefined && <StatusIcon status={status} />}
      </span>
    </div>
  );
}

/** Info-icon with hover tooltip */
function Tooltip({ text }) {
  return (
    <span className={styles.tooltipContainer}>
      <Info size={13} className={styles.infoIcon} />
      <span className={styles.tooltipText}>{text}</span>
    </span>
  );
}

/** Collapsible card wrapper */
function Card({ title, icon: Icon, children, defaultOpen = true, badge }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader} onClick={() => setOpen((o) => !o)}>
        <span className={styles.cardHeaderIconGroup}>
          {Icon && <Icon size={18} />}
          {title}
          {badge}
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      <div className={`${styles.cardContent} ${open ? styles.cardContentExpanded : ""}`}>
        {children}
      </div>
    </div>
  );
}

/** Character length pill */
function LengthPill({ length, status }) {
  const cls =
    status === "good"
      ? styles.lengthGood
      : status === "warn"
      ? styles.lengthWarn
      : styles.lengthError;
  return (
    <span className={`${styles.lengthIndicator} ${cls}`}>
      {length} chars
    </span>
  );
}

/* ──────────────────────────────────────────────
   ACTION PLAN GENERATOR
   ────────────────────────────────────────────── */

function generateActionPlan(data) {
  const steps = [];
  const t = data.technical || {};
  const c = data.content || {};
  const m = data.metrics2026 || {};
  const meta = c.meta || {};
  const acc = data.accessibility || {};
  const perf = data.performance || {};

  // Technical
  if (!t.robotsTxt) {
    steps.push({
      title: "Crear robots.txt",
      desc: "No se detectó archivo robots.txt. Crea uno que permita a los crawlers de IA acceder al sitio.",
      icon: FileSearch,
      priority: "alta",
    });
  } else if (t.robotsTxtDetails && !t.robotsTxtDetails.allowsAIBots) {
    steps.push({
      title: "Permitir bots de IA en robots.txt",
      desc: `Bots bloqueados: ${(t.robotsTxtDetails.blockedBots || []).join(", ") || "varios"}. Revisa si realmente quieres bloquearlos.`,
      icon: Bot,
      priority: "alta",
    });
  }

  if (!t.llmsTxt) {
    steps.push({
      title: "Crear archivo llms.txt",
      desc: "Añade un archivo llms.txt para guiar a los modelos de IA sobre la estructura y propósito de tu sitio.",
      icon: FileText,
      priority: "media",
    });
  } else if (t.llmsTxtQuality && t.llmsTxtQuality !== "good") {
    steps.push({
      title: "Mejorar calidad de llms.txt",
      desc: `La calidad actual es "${t.llmsTxtQuality}". Revisa que incluya secciones claras y datos estructurados.`,
      icon: FileText,
      priority: "media",
    });
  }

  if (!t.sitemapXml) {
    steps.push({
      title: "Crear sitemap.xml",
      desc: "No se encontró un sitemap. Genera uno que incluya todas las páginas importantes para facilitar la indexación.",
      icon: Globe,
      priority: "alta",
    });
  }

  if (t.schemasFound === 0) {
    steps.push({
      title: "Añadir datos estructurados (JSON-LD)",
      desc: "No se encontraron schemas. Implementa al menos Organization, WebSite, y los schemas relevantes para tu contenido.",
      icon: Hash,
      priority: "alta",
    });
  }

  if (!t.hasGoodHierarchy) {
    steps.push({
      title: "Corregir jerarquía de encabezados",
      desc: `H1: ${t.h1Count ?? 0}, H2: ${t.h2Count ?? 0}, H3: ${t.h3Count ?? 0}. Asegura un H1 único y una estructura lógica de H2/H3.`,
      icon: Type,
      priority: "media",
    });
  }

  if (!t.isSSR) {
    steps.push({
      title: "Implementar renderizado del lado del servidor (SSR)",
      desc: "El contenido parece renderizarse en el cliente. Los crawlers de IA y SEO requieren HTML pre-renderizado.",
      icon: Monitor,
      priority: "alta",
    });
  }

  if (!t.https) {
    steps.push({
      title: "Migrar a HTTPS",
      desc: "El sitio no usa HTTPS. Instala un certificado SSL/TLS para seguridad y SEO.",
      icon: Shield,
      priority: "crítica",
    });
  }

  // Security headers
  const sec = t.securityHeaders || {};
  const missingHeaders = [];
  if (!sec.hsts) missingHeaders.push("HSTS");
  if (!sec.csp) missingHeaders.push("CSP");
  if (!sec.xFrameOptions) missingHeaders.push("X-Frame-Options");
  if (!sec.xContentTypeOptions) missingHeaders.push("X-Content-Type-Options");
  if (missingHeaders.length > 0) {
    steps.push({
      title: "Configurar cabeceras de seguridad",
      desc: `Falta${missingHeaders.length > 1 ? "n" : ""}: ${missingHeaders.join(", ")}. Configúralas en tu servidor.`,
      icon: Shield,
      priority: "media",
    });
  }

  if (t.latencyMs > 2000) {
    steps.push({
      title: "Reducir latencia del servidor",
      desc: `El tiempo de respuesta es ${t.latencyMs}ms. Objetivo: <500ms. Optimiza el backend, usa caching o un CDN.`,
      icon: Clock,
      priority: "alta",
    });
  }

  // Meta tags
  if (meta.titleStatus === "error" || !meta.title) {
    steps.push({
      title: "Optimizar etiqueta <title>",
      desc: meta.title
        ? `Longitud actual: ${meta.titleLength} chars. Objetivo: 50-60 caracteres.`
        : "No se encontró etiqueta <title>. Es esencial para SEO y IA.",
      icon: Type,
      priority: "alta",
    });
  }

  if (meta.descriptionStatus === "error" || !meta.description) {
    steps.push({
      title: "Mejorar meta description",
      desc: meta.description
        ? `Longitud actual: ${meta.descriptionLength} chars. Objetivo: 150-160 caracteres.`
        : "No se encontró meta description. Crucial para CTR y GEO.",
      icon: FileText,
      priority: "alta",
    });
  }

  if (!meta.hasOgTags) {
    steps.push({
      title: "Añadir Open Graph tags",
      desc: "Sin tags OG, las previsualizaciones en redes sociales y plataformas de IA serán pobres.",
      icon: Globe,
      priority: "media",
    });
  }

  if (!meta.hasTwitterCards) {
    steps.push({
      title: "Añadir Twitter Cards",
      desc: "Implementa meta tags de Twitter Cards para mejor presentación en redes sociales.",
      icon: Globe,
      priority: "baja",
    });
  }

  if (!meta.hasCanonical) {
    steps.push({
      title: "Definir URL canónica",
      desc: "Sin canonical, los motores pueden indexar duplicados. Añade <link rel='canonical'>.",
      icon: Globe,
      priority: "media",
    });
  }

  // Content
  if (c.blufScore !== undefined && c.blufScore < 5) {
    steps.push({
      title: "Mejorar estructura BLUF",
      desc: "Coloca la conclusión o respuesta principal en el primer párrafo (Bottom Line Up Front).",
      icon: Target,
      priority: "alta",
    });
  }

  if (c.wordCount !== undefined && c.wordCount < 300) {
    steps.push({
      title: "Ampliar contenido",
      desc: `Solo ${c.wordCount} palabras. Los motores de IA prefieren contenido sustancial (>300 palabras).`,
      icon: BookOpen,
      priority: "media",
    });
  }

  if (!c.hasAuthor) {
    steps.push({
      title: "Agregar señales de autoría (E-E-A-T)",
      desc: "Incluye nombre del autor, bio y credenciales para mejorar la autoridad del contenido.",
      icon: Eye,
      priority: "media",
    });
  }

  // Accessibility
  if (acc.imagesWithoutAlt > 0) {
    steps.push({
      title: "Añadir texto alt a imágenes",
      desc: `${acc.imagesWithoutAlt} de ${acc.imagesTotal} imágenes sin alt text. El alt es esencial para accesibilidad y SEO.`,
      icon: Image,
      priority: "alta",
    });
  }

  if (!acc.hasSkipLink) {
    steps.push({
      title: "Añadir enlace skip-to-content",
      desc: "Facilita la navegación por teclado con un enlace de salto al contenido principal.",
      icon: Accessibility,
      priority: "baja",
    });
  }

  if (acc.formsTotal > 0 && acc.formsWithLabels < acc.formsTotal) {
    steps.push({
      title: "Etiquetar formularios correctamente",
      desc: `${acc.formsTotal - acc.formsWithLabels} formulario(s) sin labels. Los labels mejoran accesibilidad y UX.`,
      icon: ListChecks,
      priority: "media",
    });
  }

  // Performance
  if (perf.available) {
    if (perf.lcp != null && perf.lcp > 4000) {
      steps.push({
        title: "Reducir LCP (Largest Contentful Paint)",
        desc: `LCP: ${perf.lcp}ms (pobre). Optimiza imágenes, usa lazy loading y CDN. Objetivo: <2500ms.`,
        icon: Gauge,
        priority: "alta",
      });
    }
    if (perf.cls != null && perf.cls > 0.25) {
      steps.push({
        title: "Corregir CLS (Cumulative Layout Shift)",
        desc: `CLS: ${perf.cls} (pobre). Define dimensiones en imágenes/ads y evita inserciones dinámicas.`,
        icon: Activity,
        priority: "alta",
      });
    }
    if (perf.tbt != null && perf.tbt > 600) {
      steps.push({
        title: "Reducir TBT (Total Blocking Time)",
        desc: `TBT: ${perf.tbt}ms (pobre). Divide JavaScript largo en tareas menores y usa code-splitting.`,
        icon: Zap,
        priority: "alta",
      });
    }
    if (perf.ttfb != null && perf.ttfb > 1800) {
      steps.push({
        title: "Optimizar TTFB",
        desc: `TTFB: ${perf.ttfb}ms. Mejora tiempos del servidor con caching, CDN y optimización de queries.`,
        icon: Clock,
        priority: "alta",
      });
    }
    if (perf.performanceScore != null && perf.performanceScore < 50) {
      steps.push({
        title: "Mejorar score de Performance",
        desc: `Score actual: ${perf.performanceScore}/100. Revisa LCP, TBT y CLS como prioridad.`,
        icon: Gauge,
        priority: "alta",
      });
    }
  }

  // GEO metrics
  if (m.geoAlignment) {
    const geo = m.geoAlignment;
    if (geo.directness < 5) {
      steps.push({
        title: "Mejorar directness del contenido",
        desc: "El contenido debe responder preguntas de forma directa, sin rodeos.",
        icon: Target,
        priority: "media",
      });
    }
    if (geo.fact_density < 5) {
      steps.push({
        title: "Incrementar densidad de hechos",
        desc: "Añade datos concretos, estadísticas y cifras verificables.",
        icon: BarChart3,
        priority: "media",
      });
    }
  }

  // Sort by priority
  const priorityOrder = { crítica: 0, alta: 1, media: 2, baja: 3 };
  steps.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));

  return steps;
}

/* ──────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────── */

export default function AnalysisReport({ data }) {
  if (!data) return null;

  const t = data.technical || {};
  const c = data.content || {};
  const meta = c.meta || {};
  const m = data.metrics2026 || {};
  const geo = m.geoAlignment || {};
  const intent = m.semanticIntent || {};
  const acc = data.accessibility || {};
  const perf = data.performance || {};
  const sec = t.securityHeaders || {};

  const actionPlan = generateActionPlan(data);

  return (
    <div className={styles.reportGrid}>
      {/* ─── 1. OVERALL SCORE ─── */}
      <div className={`${styles.card}`}>
        <div className={styles.overallScore}>
          <div className={styles.scoreColumn}>
            <AuditModeBadge isAI={data.isAI} aiError={data.aiError} />
            <ScoreDonut score={data.overallScore} />
            <span className={styles.scoreColumnLabel}>Score Global</span>
          </div>

          <div className={styles.scoreSectionColumns}>
            <div className={styles.scoreColumn}>
              <RadarChart data={geo} />
              <span className={styles.scoreColumnLabel}>GEO Alignment</span>
            </div>
            <div className={styles.scoreColumn}>
              <IntentBars intent={intent} signalToNoise={m.signalToNoise} />
              <span className={styles.scoreColumnLabel}>Intent & Señal</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. AUDITORÍA TÉCNICA ─── */}
      <Card title="Auditoría Técnica (LLM Crawling)" icon={Bot}>
        <MetricRow
          label="robots.txt"
          icon={FileSearch}
          value={t.robotsTxt ? "Detectado" : "No encontrado"}
          status={t.robotsTxt}
          tooltip="Archivo que controla el acceso de crawlers"
        />
        {t.robotsTxt && t.robotsTxtDetails && (
          <MetricRow
            label="Permite bots de IA"
            icon={Bot}
            value={
              t.robotsTxtDetails.allowsAIBots
                ? "Sí"
                : `Bloqueados: ${(t.robotsTxtDetails.blockedBots || []).join(", ") || "—"}`
            }
            status={t.robotsTxtDetails.allowsAIBots}
          />
        )}

        <MetricRow
          label="llms.txt"
          icon={FileText}
          value={
            t.llmsTxt
              ? t.llmsTxtQuality
                ? `Detectado (${t.llmsTxtQuality})`
                : "Detectado"
              : "No encontrado"
          }
          status={t.llmsTxt ? (t.llmsTxtQuality === "good" ? "good" : "warn") : false}
          tooltip="Archivo guía para modelos de lenguaje"
        />

        <MetricRow
          label="sitemap.xml"
          icon={Globe}
          value={
            t.sitemapXml
              ? `Detectado (${t.sitemapUrlCount ?? 0} URLs)`
              : "No encontrado"
          }
          status={t.sitemapXml}
        />

        <MetricRow
          label="JSON-LD Schemas"
          icon={Hash}
          value={
            t.schemasFound > 0
              ? `${t.schemasFound} (${(t.schemaTypes || []).join(", ")})`
              : "Ninguno"
          }
          status={t.schemasFound > 0}
          tooltip="Datos estructurados para Google y IA"
        />

        <MetricRow
          label="Jerarquía de encabezados"
          icon={Type}
          value={`H1:${t.h1Count ?? 0} H2:${t.h2Count ?? 0} H3:${t.h3Count ?? 0}`}
          status={t.hasGoodHierarchy ? "good" : "warn"}
          tooltip="Debe haber 1 H1 y estructura lógica"
        />

        <MetricRow
          label="Server-Side Rendering"
          icon={Monitor}
          value={t.isSSR ? "Sí" : "No (Client-side)"}
          status={t.isSSR}
          tooltip="SSR mejora indexación por crawlers de IA"
        />

        <MetricRow
          label="HTTPS"
          icon={Shield}
          value={t.https ? "Activo" : "No detectado"}
          status={t.https}
        />

        {/* Security headers grid */}
        <div style={{ padding: "0.5rem 0" }}>
          <span className={styles.metricLabel} style={{ marginBottom: "0.5rem", display: "block" }}>
            <Shield size={15} /> Cabeceras de Seguridad
          </span>
          <div className={styles.securityGrid}>
            <div className={styles.securityItem}>
              <StatusIcon status={sec.hsts} />
              <span>HSTS</span>
            </div>
            <div className={styles.securityItem}>
              <StatusIcon status={sec.csp} />
              <span>CSP</span>
            </div>
            <div className={styles.securityItem}>
              <StatusIcon status={sec.xFrameOptions} />
              <span>X-Frame-Options</span>
            </div>
            <div className={styles.securityItem}>
              <StatusIcon status={sec.xContentTypeOptions} />
              <span>X-Content-Type</span>
            </div>
          </div>
        </div>

        <MetricRow
          label="Latencia de respuesta"
          icon={Clock}
          value={`${t.latencyMs ?? "—"}ms`}
          status={
            t.latencyMs == null
              ? "warn"
              : t.latencyMs < 500
              ? "good"
              : t.latencyMs < 2000
              ? "warn"
              : false
          }
          tooltip="Tiempo de respuesta del servidor"
        />
      </Card>

      {/* ─── 3. SEO ON-PAGE & META TAGS ─── */}
      <Card title="SEO On-Page & Meta Tags" icon={Search}>
        {/* Title */}
        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>
            <Type size={15} /> Title tag
            <Tooltip text="Ideal: 50-60 caracteres" />
          </span>
          <span className={styles.metricValue}>
            <LengthPill length={meta.titleLength ?? 0} status={meta.titleStatus ?? "error"} />
            <StatusIcon status={meta.titleStatus ?? "error"} />
          </span>
        </div>
        {meta.title && <div className={styles.tagPreview}>{meta.title}</div>}

        {/* Description */}
        <div className={styles.metricRow} style={{ marginTop: "0.5rem" }}>
          <span className={styles.metricLabel}>
            <FileText size={15} /> Meta Description
            <Tooltip text="Ideal: 150-160 caracteres" />
          </span>
          <span className={styles.metricValue}>
            <LengthPill
              length={meta.descriptionLength ?? 0}
              status={meta.descriptionStatus ?? "error"}
            />
            <StatusIcon status={meta.descriptionStatus ?? "error"} />
          </span>
        </div>
        {meta.description && (
          <div className={styles.tagPreview}>{meta.description}</div>
        )}

        <div style={{ height: "0.5rem" }} />

        <div className={styles.metaTagGrid}>
          <MetricRow
            label="Canonical URL"
            icon={Globe}
            value={meta.hasCanonical ? "Definida" : "Ausente"}
            status={meta.hasCanonical}
          />
          <MetricRow
            label="Viewport"
            icon={Monitor}
            value={meta.hasViewport ? "Configurado" : "Ausente"}
            status={meta.hasViewport}
          />
          <MetricRow
            label="Open Graph"
            icon={Globe}
            value={
              meta.hasOgTags
                ? `${(meta.ogTagsList || []).length} tags`
                : "No detectado"
            }
            status={meta.hasOgTags}
          />
          <MetricRow
            label="Twitter Cards"
            icon={Globe}
            value={meta.hasTwitterCards ? "Configurado" : "No detectado"}
            status={meta.hasTwitterCards}
          />
          <MetricRow
            label="Atributo lang"
            icon={Globe}
            value={
              meta.hasLang
                ? meta.langValue || "Sí"
                : "Ausente"
            }
            status={meta.hasLang}
          />
        </div>

        {meta.hasOgTags && (meta.ogTagsList || []).length > 0 && (
          <div style={{ marginTop: "0.5rem" }}>
            <span
              className={styles.metricLabel}
              style={{ display: "block", marginBottom: "0.3rem" }}
            >
              OG Tags detectados:
            </span>
            <div className={styles.tagPreview}>
              {(meta.ogTagsList || []).join(" · ")}
            </div>
          </div>
        )}
      </Card>

      {/* ─── 4. ESTRUCTURA DE CONTENIDO ─── */}
      <Card title="Estructura de Contenido" icon={BookOpen}>
        <MetricRow
          label="BLUF Score"
          icon={Target}
          value={c.blufScore ?? "—"}
          status={
            c.blufScore == null
              ? "warn"
              : c.blufScore >= 7
              ? "good"
              : c.blufScore >= 4
              ? "warn"
              : false
          }
          tooltip="Bottom Line Up Front — respuesta directa en primer párrafo"
        />
        <MetricRow
          label="BLUF Detectado"
          icon={Eye}
          value={c.blufDetected ? "Sí" : "No"}
          status={c.blufDetected}
        />
        <MetricRow
          label="Datos/Estadísticas"
          icon={BarChart3}
          value={c.statsCount ?? 0}
          status={(c.statsCount ?? 0) > 0}
          tooltip="Cifras, porcentajes y datos verificables encontrados"
        />
        <MetricRow
          label="Escaneabilidad"
          icon={ListChecks}
          value={c.isScannable ? "Alta" : "Baja"}
          status={c.isScannable}
          tooltip="Uso de listas, subtítulos y párrafos cortos"
        />
        <MetricRow
          label="Autoría (E-E-A-T)"
          icon={Eye}
          value={c.hasAuthor ? "Detectada" : "No detectada"}
          status={c.hasAuthor}
          tooltip="Señales de Experience, Expertise, Authority, Trust"
        />
        <MetricRow
          label="Conteo de palabras"
          icon={BookOpen}
          value={c.wordCount ?? 0}
          status={
            (c.wordCount ?? 0) >= 300 ? "good" : "warn"
          }
          tooltip="Mínimo recomendado: 300 palabras"
        />
      </Card>

      {/* ─── 5. ACCESIBILIDAD WEB ─── */}
      <Card title="Accesibilidad Web" icon={Accessibility}>
        <MetricRow
          label="Imágenes con alt text"
          icon={Image}
          value={`${(acc.imagesTotal ?? 0) - (acc.imagesWithoutAlt ?? 0)} de ${acc.imagesTotal ?? 0}`}
          status={
            acc.imagesTotal === 0 || acc.imagesWithoutAlt === 0
              ? "good"
              : acc.imagesWithoutAlt <= 2
              ? "warn"
              : false
          }
          tooltip="Todas las imágenes deben tener texto alternativo"
        />
        <MetricRow
          label="Atributo lang en HTML"
          icon={Globe}
          value={acc.hasLangAttribute ? "Presente" : "Ausente"}
          status={acc.hasLangAttribute}
        />
        <MetricRow
          label="Enlace skip-to-content"
          icon={Zap}
          value={acc.hasSkipLink ? "Presente" : "Ausente"}
          status={acc.hasSkipLink ? "good" : "warn"}
        />
        <MetricRow
          label="Forms con labels"
          icon={ListChecks}
          value={
            acc.formsTotal === 0
              ? "Sin formularios"
              : `${acc.formsWithLabels ?? 0} de ${acc.formsTotal}`
          }
          status={
            acc.formsTotal === 0
              ? "good"
              : acc.formsWithLabels >= acc.formsTotal
              ? "good"
              : "warn"
          }
        />
        <MetricRow
          label="Score de Accesibilidad"
          icon={Gauge}
          value={acc.score != null ? `${acc.score}/100` : "—"}
          status={
            acc.score == null
              ? "warn"
              : acc.score >= 80
              ? "good"
              : acc.score >= 50
              ? "warn"
              : false
          }
        />
        {acc.score != null && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: "0.5rem" }}>
            <PerformanceGauge
              value={acc.score}
              max={100}
              thresholds={[50, 80]}
              label="A11Y"
              unit=""
            />
          </div>
        )}
      </Card>

      {/* ─── 6. PERFORMANCE & CORE WEB VITALS ─── */}
      {perf.available && (
        <Card title="Performance & Core Web Vitals" icon={Gauge}>
          {perf.performanceScore != null && (
            <MetricRow
              label="Performance Score"
              icon={Gauge}
              value={`${perf.performanceScore}/100`}
              status={
                perf.performanceScore >= 90
                  ? "good"
                  : perf.performanceScore >= 50
                  ? "warn"
                  : false
              }
            />
          )}

          <div className={styles.cwvGaugeGrid}>
            <PerformanceGauge
              value={perf.lcp}
              max={6000}
              thresholds={[2500, 4000]}
              label="LCP"
              unit="ms"
            />
            <PerformanceGauge
              value={perf.cls}
              max={0.5}
              thresholds={[0.1, 0.25]}
              label="CLS"
              unit=""
            />
            <PerformanceGauge
              value={perf.tbt}
              max={1000}
              thresholds={[200, 600]}
              label="TBT"
              unit="ms"
            />
            <PerformanceGauge
              value={perf.ttfb}
              max={3000}
              thresholds={[800, 1800]}
              label="TTFB"
              unit="ms"
            />
            <PerformanceGauge
              value={perf.speedIndex}
              max={8000}
              thresholds={[3400, 5800]}
              label="Speed Idx"
              unit="ms"
            />
          </div>
        </Card>
      )}

      {/* ─── 7. MÉTRICAS GEO / AEO ─── */}
      <Card title="Métricas GEO / AEO 2026" icon={BarChart3}>
        <div className={styles.extraMetricsGrid}>
          <MetricRow
            label="SoM Simulation"
            icon={Target}
            value={
              m.somSimulation != null
                ? `${(m.somSimulation * 100).toFixed(1)}%`
                : "—"
            }
            status={
              m.somSimulation == null
                ? "warn"
                : m.somSimulation >= 0.3
                ? "good"
                : m.somSimulation >= 0.1
                ? "warn"
                : false
            }
            tooltip="Share-of-Model simulado"
          />
          <MetricRow
            label="RAG Probability"
            icon={Sparkles}
            value={m.ragProbability ?? "—"}
            status={
              m.ragProbability === "Alta"
                ? "good"
                : m.ragProbability === "Media"
                ? "warn"
                : m.ragProbability
                ? false
                : "warn"
            }
            tooltip="Probabilidad de ser seleccionado en RAG"
          />
          <MetricRow
            label="Sentiment Score"
            icon={Waves}
            value={m.sentimentScore ?? "—"}
            status={
              m.sentimentScore === "Positivo"
                ? "good"
                : m.sentimentScore === "Neutro"
                ? "warn"
                : m.sentimentScore
                ? false
                : "warn"
            }
            tooltip="Tono general del contenido"
          />
        </div>
      </Card>

      {/* ─── 8. HALLAZGOS CRÍTICOS DE IA ─── */}
      {(m.criticalFindings || []).length > 0 && (
        <div className={styles.findingsCard}>
          <div className={styles.cardHeaderIconGroup} style={{ marginBottom: "1rem" }}>
            <AlertOctagon size={18} style={{ color: "var(--warning)" }} />
            <span style={{ fontWeight: 600 }}>Hallazgos Críticos de IA</span>
          </div>
          {m.criticalFindings.map((finding, i) => (
            <div key={i} className={styles.findingItem}>
              <span className={styles.findingNumber}>{i + 1}</span>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.5 }}>
                {finding}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ─── 9. PLAN DE ACCIÓN ─── */}
      {actionPlan.length > 0 && (
        <div className={styles.actionPlanCard}>
          <div className={styles.cardHeaderIconGroup} style={{ marginBottom: "1rem" }}>
            <ListChecks size={18} style={{ color: "var(--primary)" }} />
            <span style={{ fontWeight: 600 }}>Plan de Acción ({actionPlan.length} pasos)</span>
          </div>
          {actionPlan.map((step, i) => {
            const Icon = step.icon || Zap;
            const priorityColors = {
              crítica: "var(--danger)",
              alta: "var(--warning)",
              media: "var(--accent)",
              baja: "var(--text-muted)",
            };
            return (
              <div key={i} className={styles.actionStep}>
                <Icon
                  size={20}
                  style={{
                    color: priorityColors[step.priority] || "var(--primary)",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
                <div>
                  <div className={styles.actionStepTitle}>
                    {step.title}
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        color: priorityColors[step.priority] || "var(--text-muted)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {step.priority}
                    </span>
                  </div>
                  <div className={styles.actionStepDesc}>{step.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
