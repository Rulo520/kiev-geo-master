"use client";
import { useState } from "react";
import {
  CheckCircle2, XCircle, AlertTriangle, Activity, Search, FileText, Bot, Zap,
  BookOpen, ListChecks, Target, BarChart3, Waves, Info, Shield, Globe, Image,
  Type, Hash, Clock, Gauge, Eye, Accessibility, FileSearch, AlertOctagon,
  Monitor, ChevronDown, ChevronUp, Link2, ImageIcon, Languages,
  Share2, Heart, Smartphone, Palette, Tag
} from "lucide-react";
import styles from "../app/page.module.css";

// ─── Helper Functions ───────────────────────────────────────────────────────

function getScoreColor(score) {
  if (score > 70) return "#22c55e";
  if (score > 40) return "#eab308";
  return "#ef4444";
}

function getScoreGrade(score) {
  if (score >= 90) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "F";
}

function getGradeColor(grade) {
  switch (grade) {
    case "A": return "#22c55e";
    case "B": return "#4ade80";
    case "C": return "#eab308";
    case "D": return "#f97316";
    case "F": return "#ef4444";
    default: return "#6b7280";
  }
}

function getCWVColor(metric, value) {
  if (value == null || value === undefined) return "#6b7280";
  switch (metric) {
    case "lcp":
      if (value < 2500) return "#22c55e";
      if (value < 4000) return "#eab308";
      return "#ef4444";
    case "cls":
      if (value < 0.1) return "#22c55e";
      if (value < 0.25) return "#eab308";
      return "#ef4444";
    case "tbt":
      if (value < 200) return "#22c55e";
      if (value < 600) return "#eab308";
      return "#ef4444";
    case "speedIndex":
      if (value < 3400) return "#22c55e";
      if (value < 5800) return "#eab308";
      return "#ef4444";
    case "ttfb":
      if (value < 800) return "#22c55e";
      if (value < 1800) return "#eab308";
      return "#ef4444";
    default:
      return "#6b7280";
  }
}

function getCWVLabel(metric, value) {
  if (value == null || value === undefined) return "N/A";
  const color = getCWVColor(metric, value);
  if (color === "#22c55e") return "Bueno";
  if (color === "#eab308") return "Necesita mejora";
  return "Deficiente";
}

function formatLCP(ms) {
  if (ms == null) return "N/A";
  return (ms / 1000).toFixed(1) + "s";
}

function formatCLS(val) {
  if (val == null) return "N/A";
  return val.toFixed(3);
}

function formatMs(val) {
  if (val == null) return "N/A";
  return Math.round(val) + "ms";
}

function formatDate(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("es-ES", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

function getRagColor(prob) {
  switch (prob) {
    case "Alta": return "#22c55e";
    case "Media": return "#eab308";
    case "Baja": return "#ef4444";
    default: return "#6b7280";
  }
}

function getRiskLevelColor(level) {
  if (!level) return "#6b7280";
  const l = level.toLowerCase();
  if (l === "bajo" || l === "low") return "#22c55e";
  if (l === "medio" || l === "medium") return "#eab308";
  return "#ef4444";
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function BooleanIndicator({ value, labelTrue, labelFalse }) {
  return value ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#22c55e" }}>
      <CheckCircle2 size={16} /> {labelTrue || "Sí"}
    </span>
  ) : (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#ef4444" }}>
      <XCircle size={16} /> {labelFalse || "No"}
    </span>
  );
}

function StatusBadge({ label, color, icon: Icon }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: color + "18", color, border: `1px solid ${color}40`,
      borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 600,
      letterSpacing: 0.3,
    }}>
      {Icon && <Icon size={14} />}
      {label}
    </span>
  );
}

function ScoreCircle({ score, size = 120, strokeWidth = 8, label }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = clamp(score, 0, 100);
  const offset = circumference - (progress / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }} />
      </svg>
      <div style={{
        position: "relative", marginTop: -size + 10, height: size - 20,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: size * 0.32, fontWeight: 800, color, lineHeight: 1 }}>
          {Math.round(score)}
        </span>
        {label && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{label}</span>
        )}
      </div>
    </div>
  );
}

function AnimatedBar({ value, max = 100, color, label, showValue = true, height = 10 }) {
  const pct = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
          <span style={{ color: "rgba(255,255,255,0.8)" }}>{label}</span>
          {showValue && <span style={{ color, fontWeight: 600 }}>{typeof value === "number" ? value.toFixed(1) : value}</span>}
        </div>
      )}
      <div style={{
        width: "100%", height, background: "rgba(255,255,255,0.06)",
        borderRadius: height / 2, overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%", background: color || getScoreColor(pct),
          borderRadius: height / 2,
          transition: "width 1s ease-out",
        }} />
      </div>
    </div>
  );
}

function AuditModeBadge() {
  return <StatusBadge label="Auditoría Inteligente" color="#a78bfa" icon={Zap} />;
}

function MetricCard({ icon: Icon, label, value, unit, color }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6,
      minWidth: 130,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
        {Icon && <Icon size={14} />}
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || "#fff" }}>
        {value}
        {unit && <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 2 }}>{unit}</span>}
      </div>
    </div>
  );
}

function ChecklistItem({ checked, label, detail }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}>
      {checked ? (
        <CheckCircle2 size={18} style={{ color: "#22c55e", flexShrink: 0, marginTop: 1 }} />
      ) : (
        <XCircle size={18} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
      )}
      <div style={{ flex: 1 }}>
        <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 14 }}>{label}</span>
        {detail && (
          <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginLeft: 8 }}>{detail}</span>
        )}
      </div>
    </div>
  );
}

function GridStat({ label, value, icon: Icon, color }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", borderRadius: 10,
      padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      {Icon && <Icon size={18} style={{ color: color || "rgba(255,255,255,0.4)", flexShrink: 0 }} />}
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: color || "#fff" }}>{value}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Section Wrapper ────────────────────────────────────────────────────────

function Section({ title, icon: Icon, iconColor, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16, overflow: "hidden", marginBottom: 16,
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", background: "rgba(255,255,255,0.03)", border: "none",
          cursor: "pointer", color: "#fff", fontSize: 15, fontWeight: 700,
          borderBottom: open ? "1px solid rgba(255,255,255,0.06)" : "none",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {Icon && <Icon size={18} style={{ color: iconColor || "#a78bfa" }} />}
          {title}
        </span>
        {open ? <ChevronUp size={18} style={{ color: "rgba(255,255,255,0.4)" }} /> : <ChevronDown size={18} style={{ color: "rgba(255,255,255,0.4)" }} />}
      </button>
      {open && (
        <div style={{ padding: "20px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Action Plan Generator ──────────────────────────────────────────────────

function generateActionPlan(data) {
  const steps = [];
  const { technical, content, accessibility, metrics2026, performance, social } = data;

  // PRIORIDAD 1: Críticos — impacto directo en visibilidad
  if (content?.meta?.titleStatus !== "good") {
    steps.push({
      priority: "alta",
      category: "SEO On-Page",
      action: `Optimizar el meta título (actualmente ${content?.meta?.titleLength || 0} caracteres)`,
      detail: "El título es el factor SEO #1 más importante. Debe tener entre 50-60 caracteres, incluir la keyword principal al inicio y ser único. Google lo usa como headline en los resultados de búsqueda.",
      impact: "Mejora directa en CTR y posicionamiento orgánico",
    });
  }

  if (content?.meta?.descriptionStatus !== "good") {
    steps.push({
      priority: "alta",
      category: "SEO On-Page",
      action: `Reescribir la meta descripción (actualmente ${content?.meta?.descriptionLength || 0} caracteres)`,
      detail: "La meta descripción debe tener 120-160 caracteres, incluir un call-to-action y la propuesta de valor. Aunque no es un factor de ranking directo, afecta significativamente el CTR.",
      impact: "Incremento estimado de 15-30% en CTR orgánico",
    });
  }

  if (!technical?.robotsTxtDetails?.allowsAIBots) {
    steps.push({
      priority: "alta",
      category: "GEO/AEO",
      action: "Permitir acceso a bots de IA en robots.txt",
      detail: "Si los bots de IA (GPTBot, ClaudeBot, Google-Extended) están bloqueados, tu contenido no será indexado ni citado por motores generativos como ChatGPT, Perplexity o Gemini.",
      impact: "Habilitación de visibilidad en respuestas de IA generativa",
    });
  }

  if (technical?.schemasFound === 0) {
    steps.push({
      priority: "alta",
      category: "Datos Estructurados",
      action: "Implementar schema.org (JSON-LD)",
      detail: "Agregar marcado estructurado (Article, Organization, FAQPage o HowTo según el tipo de contenido). Los datos estructurados aumentan la probabilidad de rich snippets en Google y son clave para que las IAs comprendan tu contenido.",
      impact: "Hasta 30% más visibilidad en SERPs con rich snippets",
    });
  }

  // PRIORIDAD 2: Importante — mejora significativa
  if (content?.wordCount < 500) {
    steps.push({
      priority: "media",
      category: "Contenido",
      action: `Ampliar el contenido (actualmente ${content?.wordCount || 0} palabras)`,
      detail: "El contenido con menos de 500 palabras tiene poca probabilidad de rankear para consultas informacionales. Objetivo: 800-1500 palabras de contenido sustancial con datos, ejemplos y estructura clara.",
      impact: "Mayor relevancia para consultas long-tail y citas en IA",
    });
  }

  if (!content?.blufDetected) {
    steps.push({
      priority: "media",
      category: "GEO/AEO",
      action: "Aplicar el patrón BLUF (Bottom Line Up Front)",
      detail: "Reformular el primer párrafo para responder directamente la consulta del usuario en las primeras 2 oraciones. Las IAs generativas priorizan contenido que responde sin rodeos. Ejemplo: 'El costo promedio de X es $Y según [fuente]' en vez de 'En este artículo exploraremos...'",
      impact: "Mayor probabilidad de ser citado como fuente en respuestas de IA",
    });
  }

  if (!content?.hasAuthor) {
    steps.push({
      priority: "media",
      category: "E-E-A-T",
      action: "Agregar señales de autoría verificable",
      detail: "Incluir nombre del autor, bio profesional, foto y links a perfiles (LinkedIn, Twitter). Google E-E-A-T (Experience, Expertise, Authoritativeness, Trust) pondera la autoría como señal de calidad. Esto es especialmente crítico para contenido YMYL.",
      impact: "Mejora en autoridad percibida por Google y motores de IA",
    });
  }

  if (performance?.available && performance.performanceScore < 60) {
    steps.push({
      priority: "media",
      category: "Performance",
      action: `Mejorar Core Web Vitals (PageSpeed: ${performance.performanceScore}/100)`,
      detail: "Optimizar LCP (carga del contenido principal), CLS (estabilidad visual) y TBT/INP (interactividad). Acciones: comprimir imágenes a WebP/AVIF, implementar lazy loading, minimizar CSS/JS, y usar CDN.",
      impact: "Factor de ranking confirmado por Google desde 2021",
    });
  }

  const imgOpt = technical?.imageOptimization;
  if (imgOpt && imgOpt.totalImages > 0 && imgOpt.modernFormatCount < imgOpt.totalImages) {
    steps.push({
      priority: "media",
      category: "Performance",
      action: `Migrar ${imgOpt.totalImages - imgOpt.modernFormatCount} imágenes a formatos modernos`,
      detail: "Convertir imágenes de JPG/PNG a WebP o AVIF. Estos formatos reducen el peso entre 25-50% sin pérdida visual perceptible. Usar el atributo <picture> con fallback para navegadores legacy.",
      impact: "Reducción de ~30% en peso de página y mejora en LCP",
    });
  }

  if (accessibility?.imagesWithoutAlt > 0) {
    steps.push({
      priority: "media",
      category: "Accesibilidad",
      action: `Agregar alt text a ${accessibility.imagesWithoutAlt} imagen(es)`,
      detail: "El atributo alt es obligatorio para accesibilidad (WCAG 2.1) y ayuda a los motores de búsqueda a entender el contenido de las imágenes. Escribir descripciones concisas y relevantes, no keywords stuffing.",
      impact: "Cumplimiento WCAG + mejor indexación de imágenes",
    });
  }

  // PRIORIDAD 3: Optimizaciones adicionales
  if (!content?.meta?.hasCanonical) {
    steps.push({
      priority: "baja",
      category: "SEO Técnico",
      action: "Agregar tag canonical",
      detail: "Incluir <link rel='canonical' href='URL'> en el <head> para indicar la versión preferida de la página. Previene problemas de contenido duplicado y consolida la autoridad de la URL.",
      impact: "Consolidación de señales SEO y prevención de canibalización",
    });
  }

  if (!technical?.llmsTxt) {
    steps.push({
      priority: "baja",
      category: "GEO/AEO",
      action: "Crear archivo llms.txt",
      detail: "El archivo llms.txt (similar a robots.txt pero para IAs) permite describir tu sitio, su propósito y contenido clave para que los modelos de lenguaje lo comprendan mejor. Es un estándar emergente para GEO.",
      impact: "Mejor comprensión del sitio por parte de modelos de IA",
    });
  }

  if (!content?.meta?.hasOgTags) {
    steps.push({
      priority: "baja",
      category: "Social & Compartibilidad",
      action: "Implementar Open Graph tags",
      detail: "Agregar og:title, og:description, og:image y og:url. Cuando alguien comparte tu URL en redes sociales o chats, estos tags controlan cómo se ve la preview. Sin ellos, la preview es genérica o fea.",
      impact: "Mejor presentación al compartir + más tráfico social",
    });
  }

  if (!technical?.sitemapXml) {
    steps.push({
      priority: "baja",
      category: "SEO Técnico",
      action: "Crear sitemap.xml",
      detail: "Un sitemap XML le dice a los motores de búsqueda exactamente qué páginas indexar y con qué frecuencia se actualizan. Esencial para sitios con más de 10 páginas.",
      impact: "Indexación más rápida y completa del sitio",
    });
  }

  return steps;
}

function ActionPlan({ data }) {
  const steps = generateActionPlan(data);

  if (steps.length === 0) {
    return (
      <div style={{
        textAlign: "center", padding: "24px", color: "rgba(255,255,255,0.6)",
        background: "rgba(34, 197, 94, 0.06)", borderRadius: 12,
        border: "1px solid rgba(34, 197, 94, 0.15)",
      }}>
        <CheckCircle2 size={32} style={{ color: "#22c55e", marginBottom: 8 }} />
        <p style={{ fontSize: 16, fontWeight: 600, color: "#22c55e" }}>¡Excelente! No se detectaron problemas críticos.</p>
        <p style={{ fontSize: 13 }}>Tu sitio cumple con las mejores prácticas actuales de SEO y GEO.</p>
      </div>
    );
  }

  const priorityConfig = {
    alta: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.06)", border: "rgba(239, 68, 68, 0.2)", label: "PRIORIDAD ALTA" },
    media: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.06)", border: "rgba(245, 158, 11, 0.2)", label: "PRIORIDAD MEDIA" },
    baja: { color: "#06b6d4", bg: "rgba(6, 182, 212, 0.06)", border: "rgba(6, 182, 212, 0.2)", label: "OPTIMIZACIÓN" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 4, lineHeight: 1.5 }}>
        En base al análisis realizado, estos son los pasos recomendados ordenados por impacto.
        Cada acción incluye el por qué es importante y el impacto esperado.
      </p>
      {steps.map((step, i) => {
        const config = priorityConfig[step.priority];
        return (
          <div key={i} style={{
            background: config.bg, border: `1px solid ${config.border}`,
            borderRadius: 12, padding: "16px 20px", borderLeft: `4px solid ${config.color}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: config.color,
                background: `${config.color}15`, padding: "2px 8px", borderRadius: 4,
                letterSpacing: "0.5px", textTransform: "uppercase",
              }}>{config.label}</span>
              <span style={{
                fontSize: 10, color: "rgba(255,255,255,0.4)",
                background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 4,
              }}>{step.category}</span>
            </div>
            <h4 style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.95)", margin: "0 0 6px" }}>
              {i + 1}. {step.action}
            </h4>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: "0 0 8px" }}>
              {step.detail}
            </p>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, color: config.color, fontWeight: 500,
            }}>
              <Target size={14} />
              <span>{step.impact}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AnalysisReport({ data }) {
  if (!data || !data.success) {
    return (
      <div className={styles.reportContainer} style={{
        padding: 40, textAlign: "center", color: "rgba(255,255,255,0.5)",
      }}>
        <AlertOctagon size={40} style={{ margin: "0 auto 16px", display: "block", color: "#ef4444" }} />
        <p style={{ fontSize: 16, fontWeight: 600, color: "#ef4444" }}>No se pudo completar el análisis</p>
        <p style={{ fontSize: 13, marginTop: 8 }}>Verifica la URL e intenta de nuevo.</p>
      </div>
    );
  }

  const { technical, content, accessibility, metrics2026, performance, social } = data;
  const meta = content?.meta || {};
  const keywords = content?.keywords || {};
  const internalLinks = technical?.internalLinks || {};
  const imageOpt = technical?.imageOptimization || {};
  const hreflang = technical?.hreflang || {};
  const cwv = technical?.cwvEstimate || null;
  const secHeaders = technical?.securityHeaders || {};
  const geoAlign = metrics2026?.geoAlignment || {};
  const semanticIntent = metrics2026?.semanticIntent || {};
  const grade = getScoreGrade(data.overallScore);

  return (
    <div className={styles.reportContainer} style={{ maxWidth: 860, margin: "0 auto" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        textAlign: "center", padding: "30px 20px 10px", marginBottom: 10,
      }}>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
          Análisis realizado el {formatDate(data.analyzedAt)}
        </p>
        <p style={{
          fontSize: 14, color: "rgba(255,255,255,0.6)", wordBreak: "break-all",
          fontFamily: "monospace", marginBottom: 0,
        }}>
          {data.url}
        </p>
      </div>

      {/* ── 1. Score Overview ──────────────────────────────────────────── */}
      <Section title="Puntuación General" icon={Target} iconColor="#a78bfa" defaultOpen={true}>
        <div style={{
          display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 30,
          marginBottom: 20,
        }}>
          {/* Big score circle */}
          <div style={{ textAlign: "center" }}>
            <ScoreCircle score={data.overallScore} size={140} strokeWidth={10} />
            <div style={{
              marginTop: 12, fontSize: 32, fontWeight: 900,
              color: getGradeColor(grade), letterSpacing: 2,
            }}>
              {grade}
            </div>
          </div>

          {/* Badges */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 200 }}>
            <AuditModeBadge />

            {metrics2026?.ragProbability && (
              <StatusBadge
                label={`Prob. RAG: ${metrics2026.ragProbability}`}
                color={getRagColor(metrics2026.ragProbability)}
                icon={Zap}
              />
            )}

            <StatusBadge
              label={`Grado: ${grade}`}
              color={getGradeColor(grade)}
              icon={BarChart3}
            />
          </div>
        </div>
      </Section>

      {/* ── 2. GEO/AEO Score ──────────────────────────────────────────── */}
      <Section title="GEO / AEO Score" icon={Activity} iconColor="#06b6d4">
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12, marginBottom: 24,
        }}>
          <MetricCard icon={Waves} label="SoM Simulación"
            value={metrics2026?.somSimulation != null ? metrics2026.somSimulation.toFixed(1) : "—"}
            unit="%" color="#06b6d4" />
          <MetricCard icon={Zap} label="Prob. RAG"
            value={metrics2026?.ragProbability || "—"}
            color={getRagColor(metrics2026?.ragProbability)} />
          <MetricCard icon={Heart} label="Sentimiento"
            value={metrics2026?.sentimentScore || "—"}
            color="#a78bfa" />
          <MetricCard icon={Gauge} label="Señal/Ruido"
            value={metrics2026?.signalToNoise != null ? metrics2026.signalToNoise.toFixed(1) : "—"}
            unit="%" color="#f59e0b" />
        </div>

        {/* GEO Alignment Bars */}
        <h4 style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
          Alineación GEO
        </h4>
        <AnimatedBar value={geoAlign.directness ?? 0} max={100} color="#06b6d4" label="Directness" />
        <AnimatedBar value={geoAlign.fact_density ?? 0} max={100} color="#8b5cf6" label="Densidad de datos" />
        <AnimatedBar value={geoAlign.structural_clarity ?? 0} max={100} color="#22c55e" label="Claridad estructural" />
        <AnimatedBar value={geoAlign.authority ?? 0} max={100} color="#f59e0b" label="Autoridad" />
        <AnimatedBar value={geoAlign.technical_health ?? 0} max={100} color="#ef4444" label="Salud técnica" />

        {/* Semantic Intent */}
        <h4 style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 24, marginBottom: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
          Intención Semántica
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "Informacional", value: semanticIntent.informational, color: "#06b6d4" },
            { label: "Comercial", value: semanticIntent.commercial, color: "#f59e0b" },
            { label: "Transaccional", value: semanticIntent.transactional, color: "#22c55e" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: color + "10", border: `1px solid ${color}30`, borderRadius: 12,
              padding: "18px 14px", textAlign: "center",
            }}>
              <div style={{ fontSize: 26, fontWeight: 800, color }}>{value != null ? `${Math.round(value)}%` : "—"}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 3. Hallazgos Críticos ─────────────────────────────────────── */}
      {metrics2026?.criticalFindings && metrics2026.criticalFindings.length > 0 && (
        <Section title="Hallazgos Críticos" icon={AlertOctagon} iconColor="#ef4444">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {metrics2026.criticalFindings.map((finding, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.15)",
                borderRadius: 10, padding: "12px 16px",
              }}>
                <AlertTriangle size={18} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
                <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.5 }}>
                  {finding}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── 4. Infraestructura Técnica ────────────────────────────────── */}
      <Section title="Infraestructura Técnica" icon={Shield} iconColor="#22c55e">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {/* Left column */}
          <div>
            <ChecklistItem checked={technical?.robotsTxt} label="robots.txt"
              detail={technical?.robotsTxtDetails?.allowsAIBots
                ? "Permite bots IA"
                : technical?.robotsTxtDetails?.blockedBots?.length
                  ? `Bloquea: ${technical.robotsTxtDetails.blockedBots.join(", ")}`
                  : null
              } />
            <ChecklistItem checked={technical?.llmsTxt} label="llms.txt"
              detail={technical?.llmsTxtQuality ? `Calidad: ${technical.llmsTxtQuality}` : null} />
            <ChecklistItem checked={technical?.sitemapXml} label="sitemap.xml"
              detail={technical?.sitemapUrlCount ? `${technical.sitemapUrlCount} URLs` : null} />
            <ChecklistItem checked={technical?.schemasFound > 0} label="Schema.org"
              detail={technical?.schemasFound
                ? `${technical.schemasFound} esquema${technical.schemasFound !== 1 ? "s" : ""}: ${(technical.schemaTypes || []).join(", ")}`
                : "No encontrado"
              } />
            <ChecklistItem checked={technical?.hasGoodHierarchy} label="Jerarquía de encabezados"
              detail={`H1: ${technical?.h1Count ?? 0} · H2: ${technical?.h2Count ?? 0} · H3: ${technical?.h3Count ?? 0}`} />
          </div>
          {/* Right column */}
          <div>
            <ChecklistItem checked={technical?.isSSR} label="Server-Side Rendering (SSR)" />
            <ChecklistItem checked={technical?.https} label="HTTPS" />
            <ChecklistItem checked={secHeaders.hsts} label="HSTS" detail="Seguridad de transporte" />
            <ChecklistItem checked={secHeaders.csp} label="Content Security Policy" />
            <ChecklistItem checked={secHeaders.xFrameOptions} label="X-Frame-Options" />
            <ChecklistItem checked={secHeaders.xContentTypeOptions} label="X-Content-Type-Options" />
          </div>
        </div>

        {/* Latency */}
        {technical?.latencyMs != null && (
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <Clock size={16} style={{ color: "rgba(255,255,255,0.4)" }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Latencia:</span>
            <span style={{
              fontSize: 14, fontWeight: 700,
              color: technical.latencyMs < 500 ? "#22c55e" : technical.latencyMs < 1500 ? "#eab308" : "#ef4444",
            }}>
              {formatMs(technical.latencyMs)}
            </span>
          </div>
        )}
      </Section>

      {/* ── 5. Links Internos y Externos (v3) ─────────────────────────── */}
      <Section title="Links Internos y Externos" icon={Link2} iconColor="#60a5fa">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
          <GridStat label="Total de enlaces" value={internalLinks.totalLinks ?? 0} icon={Link2} color="#60a5fa" />
          <GridStat label="Internos" value={internalLinks.internalCount ?? 0} icon={Link2} color="#22c55e" />
          <GridStat label="Externos" value={internalLinks.externalCount ?? 0} icon={Globe} color="#a78bfa" />
          <GridStat label="Href vacíos" value={internalLinks.emptyHrefCount ?? 0} icon={AlertTriangle}
            color={(internalLinks.emptyHrefCount ?? 0) > 0 ? "#ef4444" : "#22c55e"} />
          <GridStat label="Anchors genéricos" value={internalLinks.genericAnchorCount ?? 0} icon={Type}
            color={(internalLinks.genericAnchorCount ?? 0) > 0 ? "#f97316" : "#22c55e"} />
          <GridStat label="Nofollow" value={internalLinks.nofollowCount ?? 0} icon={Eye} color="#eab308" />
          <GridStat label="Externos sin noopener" value={internalLinks.externalWithoutNoopener ?? 0} icon={Shield}
            color={(internalLinks.externalWithoutNoopener ?? 0) > 0 ? "#ef4444" : "#22c55e"} />
        </div>
      </Section>

      {/* ── 6. Optimización de Imágenes (v3) ──────────────────────────── */}
      <Section title="Optimización de Imágenes" icon={ImageIcon} iconColor="#f59e0b">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24, marginBottom: 20 }}>
          <ScoreCircle score={imageOpt.score ?? 0} size={90} strokeWidth={7} label="Imágenes" />
          <MetricCard icon={ImageIcon} label="Total imágenes" value={imageOpt.totalImages ?? 0} color="#f59e0b" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <GridStat label="Sin carga diferida" value={imageOpt.withoutLazy ?? 0} icon={Eye}
            color={(imageOpt.withoutLazy ?? 0) > 0 ? "#f97316" : "#22c55e"} />
          <GridStat label="Formato legado" value={imageOpt.legacyFormatCount ?? 0} icon={ImageIcon}
            color={(imageOpt.legacyFormatCount ?? 0) > 0 ? "#f97316" : "#22c55e"} />
          <GridStat label="Sin dimensiones" value={imageOpt.withoutDimensions ?? 0} icon={Hash}
            color={(imageOpt.withoutDimensions ?? 0) > 0 ? "#eab308" : "#22c55e"} />
          <GridStat label="Sin srcset" value={imageOpt.withoutSrcset ?? 0} icon={Smartphone}
            color={(imageOpt.withoutSrcset ?? 0) > 0 ? "#eab308" : "#22c55e"} />
        </div>
      </Section>

      {/* ── 7. Contenido y SEO ────────────────────────────────────────── */}
      <Section title="Contenido y SEO" icon={FileText} iconColor="#f59e0b">
        {/* Meta tags */}
        <h4 style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
          Meta Tags
        </h4>

        {/* Title */}
        <div style={{
          background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 16px",
          marginBottom: 10, border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Title</span>
            <StatusBadge
              label={`${meta.titleLength ?? 0} chars — ${meta.titleStatus || "N/A"}`}
              color={meta.titleStatus === "OK" || meta.titleStatus === "Óptimo" ? "#22c55e" : meta.titleStatus === "Corto" ? "#eab308" : "#f97316"}
            />
          </div>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", margin: 0, wordBreak: "break-word" }}>
            {meta.title || "—"}
          </p>
        </div>

        {/* Description */}
        <div style={{
          background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 16px",
          marginBottom: 16, border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Description</span>
            <StatusBadge
              label={`${meta.descriptionLength ?? 0} chars — ${meta.descriptionStatus || "N/A"}`}
              color={meta.descriptionStatus === "OK" || meta.descriptionStatus === "Óptima" ? "#22c55e" : meta.descriptionStatus === "Corta" ? "#eab308" : "#f97316"}
            />
          </div>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", margin: 0, wordBreak: "break-word" }}>
            {meta.description || "—"}
          </p>
        </div>

        {/* Other meta checks */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 6 }}>
          <ChecklistItem checked={meta.hasCanonical} label="Canonical URL" />
          <ChecklistItem checked={meta.hasOgTags} label="Open Graph Tags"
            detail={meta.ogTagsList?.length ? meta.ogTagsList.join(", ") : null} />
          <ChecklistItem checked={meta.hasTwitterCards} label="Twitter Cards" />
          <ChecklistItem checked={meta.hasLang} label="Atributo lang"
            detail={meta.langValue ? `(${meta.langValue})` : null} />
          <ChecklistItem checked={meta.hasViewport} label="Meta viewport" />
        </div>

        {/* Content metrics */}
        <h4 style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 24, marginBottom: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
          Métricas de Contenido
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <MetricCard icon={BookOpen} label="Palabras" value={content?.wordCount ?? 0} color="#60a5fa" />
          <MetricCard icon={Target} label="BLUF Score" value={content?.blufScore != null ? content.blufScore.toFixed(0) : "—"} color={getScoreColor(content?.blufScore ?? 0)} />
          <MetricCard icon={Hash} label="Estadísticas" value={content?.statsCount ?? 0} color="#a78bfa" />
          <MetricCard icon={ListChecks} label="Escaneabilidad" value={content?.isScannable ? "Sí" : "No"} color={content?.isScannable ? "#22c55e" : "#ef4444"} />
          <MetricCard icon={FileSearch} label="Autoría" value={content?.hasAuthor ? "Sí" : "No"} color={content?.hasAuthor ? "#22c55e" : "#ef4444"} />
          <MetricCard icon={Eye} label="BLUF Detectado" value={content?.blufDetected ? "Sí" : "No"} color={content?.blufDetected ? "#22c55e" : "#eab308"} />
        </div>
      </Section>

      {/* ── 8. Keywords (v3) ──────────────────────────────────────────── */}
      <Section title="Keywords" icon={Tag} iconColor="#a78bfa">
        {/* Top Keywords */}
        {keywords.topKeywords && keywords.topKeywords.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
              Palabras clave principales
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {keywords.topKeywords.map((kw, i) => (
                <span key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "rgba(167, 139, 250, 0.12)", border: "1px solid rgba(167, 139, 250, 0.25)",
                  borderRadius: 20, padding: "5px 14px", fontSize: 13,
                }}>
                  <span style={{ color: "rgba(255,255,255,0.85)" }}>{kw.word}</span>
                  <span style={{
                    background: "rgba(167, 139, 250, 0.3)", borderRadius: 10,
                    padding: "1px 8px", fontSize: 11, fontWeight: 700, color: "#a78bfa",
                  }}>
                    {kw.count}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Top Bigrams */}
        {keywords.topBigrams && keywords.topBigrams.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
              Bigramas principales
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {keywords.topBigrams.map((bg, i) => (
                <span key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "rgba(6, 182, 212, 0.10)", border: "1px solid rgba(6, 182, 212, 0.22)",
                  borderRadius: 20, padding: "5px 14px", fontSize: 13,
                }}>
                  <span style={{ color: "rgba(255,255,255,0.85)" }}>{bg.phrase}</span>
                  <span style={{
                    background: "rgba(6, 182, 212, 0.3)", borderRadius: 10,
                    padding: "1px 8px", fontSize: 11, fontWeight: 700, color: "#06b6d4",
                  }}>
                    {bg.count}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Title Alignment */}
        {keywords.titleAlignmentScore != null && (
          <div>
            <h4 style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
              Alineación con el título
            </h4>
            <AnimatedBar
              value={keywords.titleAlignmentScore} max={100}
              color={getScoreColor(keywords.titleAlignmentScore)}
              label="Score de alineación"
              height={12}
            />
          </div>
        )}
      </Section>

      {/* ── 9. Hreflang / i18n (v3) ──────────────────────────────────── */}
      <Section title="Hreflang / i18n" icon={Languages} iconColor="#06b6d4">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
          <ChecklistItem checked={hreflang.present} label="Hreflang presente" />
          <ChecklistItem checked={hreflang.hasXDefault} label="x-default definido" />
          <ChecklistItem checked={hreflang.isValid} label="Configuración válida" />
        </div>

        {hreflang.count != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Globe size={16} style={{ color: "rgba(255,255,255,0.4)" }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
              Total de etiquetas hreflang: <strong style={{ color: "#06b6d4" }}>{hreflang.count}</strong>
            </span>
          </div>
        )}

        {hreflang.languages && hreflang.languages.length > 0 && (
          <div>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8, display: "block" }}>
              Idiomas detectados:
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {hreflang.languages.map((lang, i) => (
                <span key={i} style={{
                  background: "rgba(6, 182, 212, 0.12)", border: "1px solid rgba(6, 182, 212, 0.25)",
                  borderRadius: 8, padding: "4px 12px", fontSize: 13, color: "#06b6d4", fontWeight: 600,
                }}>
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ── 10. Accesibilidad ─────────────────────────────────────────── */}
      <Section title="Accesibilidad" icon={Accessibility} iconColor="#f472b6">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24, marginBottom: 20 }}>
          <ScoreCircle score={accessibility?.score ?? 0} size={100} strokeWidth={7} label="a11y" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, flex: 1 }}>
            <MetricCard icon={ImageIcon} label="Imágenes totales" value={accessibility?.imagesTotal ?? 0} color="#60a5fa" />
            <MetricCard icon={AlertTriangle} label="Sin alt text"
              value={accessibility?.imagesWithoutAlt ?? 0}
              color={(accessibility?.imagesWithoutAlt ?? 0) > 0 ? "#ef4444" : "#22c55e"} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 6 }}>
          <ChecklistItem checked={accessibility?.hasLangAttribute} label="Atributo lang en HTML" />
          <ChecklistItem checked={accessibility?.hasSkipLink} label="Enlace skip-to-content" />
          <ChecklistItem checked={accessibility?.formsTotal > 0 && accessibility?.formsWithLabels === accessibility?.formsTotal}
            label="Formularios con labels"
            detail={accessibility?.formsTotal > 0 ? `${accessibility.formsWithLabels ?? 0}/${accessibility.formsTotal}` : "Sin formularios"} />
        </div>
      </Section>

      {/* ── 11. Rendimiento (Core Web Vitals) ─────────────────────────── */}
      <Section title="Rendimiento (Core Web Vitals)" icon={Gauge} iconColor="#06b6d4">
        {performance?.available ? (
          <>
            {/* Performance Score */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24, marginBottom: 24 }}>
              <ScoreCircle score={performance.performanceScore ?? 0} size={100} strokeWidth={7} label="Performance" />
            </div>

            {/* CWV Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
              {/* LCP */}
              <div style={{
                background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "16px",
                border: `1px solid ${getCWVColor("lcp", performance.lcp)}30`,
              }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>LCP</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: getCWVColor("lcp", performance.lcp) }}>
                  {formatLCP(performance.lcp)}
                </div>
                <div style={{ fontSize: 11, color: getCWVColor("lcp", performance.lcp), marginTop: 4 }}>
                  {getCWVLabel("lcp", performance.lcp)}
                </div>
              </div>

              {/* CLS */}
              <div style={{
                background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "16px",
                border: `1px solid ${getCWVColor("cls", performance.cls)}30`,
              }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>CLS</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: getCWVColor("cls", performance.cls) }}>
                  {formatCLS(performance.cls)}
                </div>
                <div style={{ fontSize: 11, color: getCWVColor("cls", performance.cls), marginTop: 4 }}>
                  {getCWVLabel("cls", performance.cls)}
                </div>
              </div>

              {/* TBT */}
              <div style={{
                background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "16px",
                border: `1px solid ${getCWVColor("tbt", performance.tbt)}30`,
              }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>TBT</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: getCWVColor("tbt", performance.tbt) }}>
                  {formatMs(performance.tbt)}
                </div>
                <div style={{ fontSize: 11, color: getCWVColor("tbt", performance.tbt), marginTop: 4 }}>
                  {getCWVLabel("tbt", performance.tbt)}
                </div>
              </div>

              {/* Speed Index */}
              <div style={{
                background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "16px",
                border: `1px solid ${getCWVColor("speedIndex", performance.speedIndex)}30`,
              }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Speed Index</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: getCWVColor("speedIndex", performance.speedIndex) }}>
                  {formatMs(performance.speedIndex)}
                </div>
                <div style={{ fontSize: 11, color: getCWVColor("speedIndex", performance.speedIndex), marginTop: 4 }}>
                  {getCWVLabel("speedIndex", performance.speedIndex)}
                </div>
              </div>

              {/* TTFB */}
              <div style={{
                background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "16px",
                border: `1px solid ${getCWVColor("ttfb", performance.ttfb)}30`,
              }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>TTFB</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: getCWVColor("ttfb", performance.ttfb) }}>
                  {formatMs(performance.ttfb)}
                </div>
                <div style={{ fontSize: 11, color: getCWVColor("ttfb", performance.ttfb), marginTop: 4 }}>
                  {getCWVLabel("ttfb", performance.ttfb)}
                </div>
              </div>
            </div>
          </>
        ) : cwv ? (
          /* CWV Estimate fallback */
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <Info size={16} style={{ color: "#60a5fa" }} />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                PageSpeed no disponible. Estimación basada en análisis del código fuente.
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <StatusBadge
                label={`Nivel de riesgo: ${cwv.riskLevel || "Desconocido"}`}
                color={getRiskLevelColor(cwv.riskLevel)}
                icon={AlertTriangle}
              />
            </div>

            {cwv.risks && cwv.risks.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cwv.risks.map((risk, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "rgba(249, 115, 22, 0.06)", border: "1px solid rgba(249, 115, 22, 0.15)",
                    borderRadius: 8, padding: "10px 14px",
                  }}>
                    <AlertTriangle size={14} style={{ color: "#f97316", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{risk}</span>
                  </div>
                ))}
              </div>
            )}

            {/* CWV Estimate details */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 16 }}>
              <ChecklistItem checked={cwv.hasLazyImages} label="Imágenes con lazy loading" />
              <ChecklistItem checked={cwv.hasFontDisplaySwap} label="font-display: swap" />
              <ChecklistItem checked={cwv.hasPreconnect} label="Preconnect configurado" />
              <ChecklistItem checked={cwv.hasPreload} label="Preload configurado" />
              <ChecklistItem checked={cwv.renderBlockingScripts === 0} label="Sin scripts bloqueantes"
                detail={cwv.renderBlockingScripts > 0 ? `${cwv.renderBlockingScripts} encontrados` : null} />
              <ChecklistItem checked={cwv.largeInlineStyles === 0} label="Sin estilos inline grandes"
                detail={cwv.largeInlineStyles > 0 ? `${cwv.largeInlineStyles} encontrados` : null} />
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.4)" }}>
            <Gauge size={32} style={{ margin: "0 auto 12px", display: "block" }} />
            <p style={{ fontSize: 14 }}>Datos de rendimiento no disponibles para esta URL.</p>
          </div>
        )}
      </Section>

      {/* ── 12. Social Readiness (v3) ─────────────────────────────────── */}
      <Section title="Social Readiness" icon={Share2} iconColor="#f472b6">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24, marginBottom: 20 }}>
          <ScoreCircle score={social?.score ?? 0} size={90} strokeWidth={7} label="Social" />
        </div>

        {/* OG Image Preview */}
        {social?.ogImage && (
          <div style={{
            marginBottom: 20, borderRadius: 12, overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)", maxWidth: 400,
          }}>
            <img
              src={social.ogImage}
              alt="Open Graph preview"
              style={{
                width: "100%", height: "auto", display: "block",
                maxHeight: 220, objectFit: "cover",
              }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
            {(social.ogImageWidth || social.ogImageHeight) && (
              <div style={{
                padding: "8px 12px", background: "rgba(255,255,255,0.03)",
                fontSize: 11, color: "rgba(255,255,255,0.4)",
              }}>
                {social.ogImageWidth}×{social.ogImageHeight}px
              </div>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 6 }}>
          <ChecklistItem checked={!!social?.ogImage} label="Imagen Open Graph" />
          <ChecklistItem checked={!!social?.twitterCardType} label="Twitter Card"
            detail={social?.twitterCardType ? `Tipo: ${social.twitterCardType}` : null} />
          <ChecklistItem checked={social?.hasFavicon} label="Favicon" />
          <ChecklistItem checked={social?.hasAppleTouchIcon} label="Apple Touch Icon" />
          <ChecklistItem checked={social?.hasManifest} label="Web App Manifest" />
          <ChecklistItem checked={social?.hasThemeColor} label="Theme Color" />
        </div>
      </Section>

      {/* ── Plan de Acción ─────────────────────────────────────────────── */}
      <Section title="Plan de Acción — Próximos Pasos" icon={ListChecks} iconColor="#22c55e" defaultOpen={true}>
        <ActionPlan data={data} />
      </Section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div style={{
        textAlign: "center", padding: "20px 0 10px",
        borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 8,
      }}>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
          Kiev GEO Master v3.2 — Análisis GEO/AEO avanzado
        </p>
      </div>
    </div>
  );
}
