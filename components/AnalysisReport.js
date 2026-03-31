"use client";

import { useState, useEffect } from 'react';
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
  Info
} from 'lucide-react';
import styles from '../app/page.module.css';

const RadarChart = ({ scores }) => {
  const size = 380;
  const center = size / 2;
  const maxRadius = 120;
  const axes = [
    { label: 'Directness', key: 'directness' },
    { label: 'Facts', key: 'fact_density' },
    { label: 'Structure', key: 'structural_clarity' },
    { label: 'Authority', key: 'authority' },
    { label: 'Tech', key: 'technical_health' }
  ];

  const points = axes.map((axis, i) => {
    const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    const value = Number(scores[axis.key]) || 0;
    const r = (value / 100) * maxRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, label: axis.label, angle };
  });

  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className={`${styles.card} ${styles.glass} ${styles.radarCard}`}>
      <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Target size={14} /> Alineación GEO 2026
      </h3>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {[25, 50, 75, 100].map(val => (
          <polygon
            key={val}
            points={axes.map((_, i) => {
              const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
              const r = (val / 100) * maxRadius;
              return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
            }).join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
          />
        ))}
        {axes.map((_, i) => {
          const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + maxRadius * Math.cos(angle)}
              y2={center + maxRadius * Math.sin(angle)}
              stroke="rgba(255,255,255,0.05)"
            />
          );
        })}
        <polygon
          points={polygonPoints}
          fill="rgba(139, 92, 246, 0.2)"
          stroke="#8b5cf6"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <text
            key={i}
            x={center + (maxRadius + 35) * Math.cos(p.angle)}
            y={center + (maxRadius + 20) * Math.sin(p.angle)}
            fill="#94a3b8"
            fontSize="11"
            fontWeight="700"
            textAnchor="middle"
            style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
};

const IntentBars = ({ intent, signalToNoise }) => {
  const bars = [
    { label: 'Informacional', value: intent.informational, color: '#3b82f6', icon: <BookOpen size={14} /> },
    { label: 'Comercial', value: intent.commercial, color: '#8b5cf6', icon: <Search size={14} /> },
    { label: 'Transaccional', value: intent.transactional, color: '#f59e0b', icon: <Zap size={14} /> }
  ];

  return (
    <div className={`${styles.card} ${styles.glass} ${styles.intentCard}`}>
      <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <BarChart3 size={14} /> Pulso Semántico
      </h3>
      {bars.map(bar => (
        <div key={bar.label} className={styles.barRow}>
          <div className={styles.barLabel}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {bar.icon} {bar.label}
            </span>
            <span>{bar.value}%</span>
          </div>
          <div className={styles.barBg}>
            <div 
              className={styles.barFill} 
              style={{ width: `${bar.value}%`, backgroundColor: bar.color }}
            />
          </div>
        </div>
      ))}
      
      <div className={styles.noiseIndicator}>
        <div className={styles.noiseHeader}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Waves size={14} /> Señal vs Ruido (LLM Efficiency)
          </span>
        </div>
        <div className={styles.noiseValue}>{signalToNoise}%</div>
        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
          Eficiencia del contenido para ser extraído por RAG.
        </div>
      </div>
    </div>
  );
};

const StatusIcon = ({ status }) => {
  if (status === 'good') return <CheckCircle2 className={`${styles.statusIcon} ${styles.statusGood}`} />;
  if (status === 'error') return <XCircle className={`${styles.statusIcon} ${styles.statusError}`} />;
  if (status === 'warn') return <AlertTriangle className={`${styles.statusIcon} ${styles.statusWarn}`} />;
  return null;
};

const MetricRow = ({ label, value, status }) => (
  <div className={styles.metricRow}>
    <span className={styles.metricLabel}>{label}</span>
    <span className={styles.metricValue}>
      {value} <StatusIcon status={status} />
    </span>
  </div>
);

const Tooltip = ({ text }) => (
  <div className={styles.tooltipContainer}>
    <Info size={16} className={styles.infoIcon} />
    <div className={styles.tooltipText}>
      <strong>Importancia:</strong><br/>
      {text}
    </div>
  </div>
);

export default function AnalysisReport({ data }) {
  // SVG Donut calculation
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  
  const [offset, setOffset] = useState(circumference);
  
  const targetOffset = data ? circumference - ((Number(data.overallScore) || 0) / 100) * circumference : circumference;

  useEffect(() => {
    if (!data) return;
    // Animate to target
    const timer = setTimeout(() => {
      setOffset(targetOffset);
    }, 100);
    return () => clearTimeout(timer);
  }, [targetOffset, data]);

  if (!data) return null;

  // Generate Action Plan dynamic steps based on data
  const generateActionPlan = () => {
    const steps = [];

    // Fase 1: Técnica
    if (!data.technical.robotsTxt || data.technical.aiBotsBlocked) {
      steps.push({
        phase: "Fase 1: Infraestructura",
        title: "Desbloquear Rastreadores de IA",
        desc: "Tu sitio actualmente bloquea o carece de validación para bots (robots.txt). Si bloqueas GPTBot, ClaudeBot o Google-Extended, los LLMs no podrán indexar ni citar tu contenido. Urgente reparar tu robots.txt."
      });
    }
    if (data.technical.schemasFound === 0) {
      steps.push({
        phase: "Fase 1: Infraestructura",
        title: "Implementar Schema Markup de Urgencia",
        desc: "La IA no encontró datos estructurados JSON-LD. Debes desplegar schema (Article, FAQPage, Organization) para que las máquinas extraigan tu contexto sin fricción."
      });
    }
    if (!data.technical.llmsTxt) {
      steps.push({
        phase: "Fase 1: Infraestructura",
        title: "Crear archivo llms.txt",
        desc: "Implementa un archivo llms.txt en la raíz de tu web para guiar a los modelos de lenguaje con información directa y sin código basura."
      });
    }
    if (!data.technical.isSSR) {
      steps.push({
        phase: "Fase 1: Infraestructura",
        title: "Resolver renderizado JavaScript (CSR)",
        desc: "Tu web depende demasiado del Client-Side Rendering. Las IAs a veces solo leen el HTML inicial; si tu texto carga por JS, serás invisible. Cambia a SSR (Server-Side Rendering)."
      });
    }

    // Fase 2: Contenido
    if (data.content.blufScore <= 6) {
      steps.push({
        phase: "Fase 2: Contenido",
        title: "Aplicar Estructura Answer-First (BLUF)",
        desc: `Tu nivel BLUF es de ${data.content.blufScore}/10. Edita tus artículos para que debajo de cada H2 haya una respuesta directa y concisa de 40 a 60 palabras, ideal para ser extraída por ChatGPT y AI Overviews.`
      });
    }
    if (data.content.statsCount < 5) {
      steps.push({
        phase: "Fase 2: Contenido",
        title: "Incrementar Densidad de Hechos",
        desc: `Solo detectamos ${data.content.statsCount} datos duros (números/métricas) en la página. La IA favorece las declaraciones objetivas y estadísticamente probadas por sobre el texto comercial.`
      });
    }
    if (!data.content.isScannable) {
      steps.push({
        phase: "Fase 2: Contenido",
        title: "Mejorar la Escaneabilidad",
        desc: "El contenido es un muro de texto. Usa listas con viñetas, pasos numerados y tablas comparativas para facilitarle la extracción a los motores generativos."
      });
    }

    // Fase 3/4: Autoridad y GEO
    if (!data.content.hasAuthor) {
      steps.push({
        phase: "Fase 3: Autoridad",
        title: "Añadir señales E-E-A-T",
        desc: "Tu página es anónima. Añade autores humanos reales con biografías, enlaces a LinkedIn y experiencia demostrada para validar tu prestigio ante la IA."
      });
    }
    if ((data.metrics2026?.somSimulation || 0) < 70) {
      steps.push({
        phase: "Fase 4: Optimización GEO",
        title: "Aumentar Share of Model (SoM)",
        desc: `El SoM simulado actualmente es del ${data.metrics2026?.somSimulation || 0}%. Necesitas menciones de terceros en foros, Reddit, Quora y PR digital para que la nube de IA te recomiende más.`
      });
    }

    if (steps.length === 0) {
      steps.push({
        phase: "Excelencia",
        title: "Mantenimiento Continuo",
        desc: "Tu página está impecable a nivel GEO. Continúa publicando datos frescos cada 3 meses para no perder la prioridad de citación por antigüedad."
      });
    }

    return steps;
  };

  const actionSteps = generateActionPlan();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div className={`${styles.glass} ${styles.overallScore}`}>
        <div className={styles.donutWrapper}>
          <svg className={styles.donutSvg} viewBox="0 0 160 160">
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--secondary)" />
              </linearGradient>
            </defs>
            <circle 
              className={styles.donutBackground}
              cx="80" 
              cy="80" 
              r={radius} 
            />
            <circle 
              className={styles.donutProgress}
              cx="80" 
              cy="80" 
              r={radius} 
              strokeDasharray={circumference}
              style={{ strokeDashoffset: offset }}
            />
          </svg>
          <div className={styles.donutText}>
            {data.overallScore}
          </div>
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Score Kiev GEO Master</h2>
        <p style={{ color: '#94a3b8', marginTop: '0.5rem', maxWidth: '600px' }}>
          Basado en auditoría &quot;Answer-First&quot;, estructuración para LLMs y Performance Técnica.
        </p>

        <div className={styles.extraMetricsGrid}>
          <RadarChart scores={data.metrics2026?.geoAlignment || {}} />
          <IntentBars 
            intent={data.metrics2026?.semanticIntent || { informational: 0, commercial: 0, transactional: 0 }} 
            signalToNoise={data.metrics2026?.signalToNoise || 0} 
          />
        </div>
      </div>

      <div className={styles.reportGrid}>
        {/* Pilar 1: Auditoría Técnica */}
        <div className={`${styles.card} ${styles.glass}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderIconGroup}>
              <Bot color="var(--primary)" />
              Auditoría Técnica (LLM Crawling)
              <Tooltip text={`La auditoría técnica para IA no trata sobre velocidad, sino sobre accesibilidad de datos brutos. Si tu sitio carece de schemas o renderiza por cliente, los bots de OpenAI y Google no entenderán correctamente de qué trata tu web.`} />
            </div>
          </div>
          <div className={`${styles.cardContent} ${styles.cardContentExpanded}`}>
            <MetricRow 
              label="Archivo robots.txt" 
              value={data.technical.robotsTxt ? "Detectado (OK)" : "Inaccesible"} 
              status={data.technical.robotsTxt ? "good" : "error"} 
            />
            <MetricRow 
              label="Archivo llms.txt (Nuevo estándar)" 
              value={data.technical.llmsTxt ? "Detectado" : "No encontrado"} 
              status={data.technical.llmsTxt ? "good" : "warn"} 
            />
            <MetricRow 
              label="Bloqueos a Bots IA" 
              value={data.technical.aiBotsBlocked ? "Bloqueado" : "Libre"} 
              status={data.technical.aiBotsBlocked ? "error" : "good"} 
            />
            <MetricRow 
              label="JSON-LD Schema Markup" 
              value={`${data.technical.schemasFound} encontrados`} 
              status={data.technical.schemasFound > 0 ? "good" : "error"} 
            />
            <MetricRow 
              label="Jerarquía Semántica (H1-H3)" 
              value={data.technical.hasGoodHierarchy ? "Optimizada" : "Pobre"} 
              status={data.technical.hasGoodHierarchy ? "good" : "warn"} 
            />
            <MetricRow 
              label="Server-Side Rendering" 
              value={data.technical.isSSR ? "Sí" : "CSR Detectado"} 
              status={data.technical.isSSR ? "good" : "warn"} 
            />
          </div>
        </div>

        {/* Pilar 2: Estructura de Contenido */}
        <div className={`${styles.card} ${styles.glass}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderIconGroup}>
              <FileText color="var(--secondary)" />
              Estructura de Contenido (On-Page)
              <Tooltip text={`Los motores generativos necesitan extraer bloques de texto cortos y verificables. El contenido persuasivo comercial debe reemplazarse por respuestas directas bajo tus subtítulos y contener citas estadísticas que le den confianza al LLM.`} />
            </div>
          </div>
          <div className={`${styles.cardContent} ${styles.cardContentExpanded}`}>
            <MetricRow 
              label="Estructura Answer-First (BLUF)" 
              value={data.content.blufScore + "/10"} 
              status={data.content.blufScore > 6 ? "good" : (data.content.blufScore > 3 ? "warn" : "error")} 
            />
            <MetricRow 
              label="Densidad de Hechos (Fact Density)" 
              value={`${data.content.statsCount} datos duros`} 
              status={data.content.statsCount > 2 ? "good" : "warn"} 
            />
            <MetricRow 
              label="Escaneabilidad (Tablas/Listas)" 
              value={data.content.isScannable ? "Alta" : "Baja (Muro de texto)"} 
              status={data.content.isScannable ? "good" : "error"} 
            />
            <MetricRow 
              label="Señales de Autoridad (E-E-A-T)" 
              value={data.content.hasAuthor ? "Detectada" : "Anónima"} 
              status={data.content.hasAuthor ? "good" : "warn"} 
            />
          </div>
        </div>

        {/* Pilar 3: Métricas 2026 */}
        <div className={`${styles.card} ${styles.glass}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderIconGroup}>
              <Activity color="var(--accent)" />
              Métricas GEO / AEO 2026
              <Tooltip text={`Para el 2026, lo que importará es el "Share of Model". La IA te considerará una fuente primaria confiable o una fuente secundaria omitible basándose en tu probabilidad de recuperación RAG.`} />
            </div>
          </div>
          <div className={`${styles.cardContent} ${styles.cardContentExpanded}`}>
            <MetricRow 
              label="Share of Model (SoM) Simulado" 
              value={`${data.metrics2026?.somSimulation || 0}%`} 
              status={(data.metrics2026?.somSimulation || 0) > 50 ? "good" : "warn"} 
            />
            <MetricRow 
              label="Probabilidad de Recuperación (RAG)" 
              value={data.metrics2026?.ragProbability || "Neutral"} 
              status={data.metrics2026?.ragProbability === "Alta" ? "good" : (data.metrics2026?.ragProbability === "Media" ? "warn" : "error")} 
            />
            <MetricRow 
              label="Sentiment Score de Citación" 
              value={data.metrics2026?.sentimentScore || "Neutral"} 
              status={data.metrics2026?.sentimentScore?.includes("Positivo") ? "good" : "warn"} 
            />
          </div>
        </div>

      </div>

      {/* ACTION PLAN MODULE */}
      <div className={`${styles.card} ${styles.glass} ${styles.actionPlanCard}`}>
        <div className={styles.cardHeader} style={{ justifyContent: 'flex-start' }}>
          <ListChecks color="var(--primary)" />
          Plan de Acción Sugerido para Excelencia GEO
        </div>
        <div className={styles.cardContent} style={{ maxHeight: 'none', opacity: 1, padding: '1rem 0' }}>
          <p style={{ color: '#cbd5e1', marginBottom: '1rem', lineHeight: 1.6 }}>
            Basados en la estructura &quot;Answer-First&quot; (BLUF), Fact Density y Crawling IA de tu análisis actual, 
            estos son los pasos exactos a tomar para dominar los motores generativos.
          </p>
          
          {actionSteps.map((step, idx) => (
            <div key={idx} className={styles.actionStep}>
              <div className={styles.actionStepTitle}>
                <Zap size={18} color="var(--accent)" />
                {step.title}
              </div>
              <div className={styles.actionStepDesc}>
                <strong>{step.phase}:</strong> {step.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
