"use client";

import { useState } from 'react';
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
  ChevronDown,
  ListChecks
} from 'lucide-react';
import styles from '../app/page.module.css';

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

export default function AnalysisReport({ data }) {
  const [expandedCard, setExpandedCard] = useState(null);

  if (!data) return null;

  const toggleCard = (index) => {
    setExpandedCard(expandedCard === index ? null : index);
  };

  // SVG Donut calculation
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (data.overallScore / 100) * circumference;

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
    if (data.metrics2026.somSimulation < 70) {
      steps.push({
        phase: "Fase 4: Optimización GEO",
        title: "Aumentar Share of Model (SoM)",
        desc: `El SoM simulado actualmente es del ${data.metrics2026.somSimulation}%. Necesitas menciones de terceros en foros, Reddit, Quora y PR digital para que la nube de IA te recomiende más.`
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
              style={{ strokeDashoffset }}
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
      </div>

      <div className={styles.reportGrid}>
        {/* Pilar 1: Auditoría Técnica */}
        <div 
          className={`${styles.card} ${styles.glass}`} 
          onClick={() => toggleCard(1)}
        >
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderIconGroup}>
              <Bot color="var(--primary)" />
              Auditoría Técnica (LLM Crawling)
            </div>
            <ChevronDown className={`${styles.chevronIcon} ${expandedCard === 1 ? styles.chevronExpanded : ''}`} />
          </div>
          <div className={`${styles.cardContent} ${expandedCard === 1 ? styles.cardContentExpanded : ''}`}>
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
            {expandedCard === 1 && (
              <div className={styles.accordionExtraText}>
                <strong>¿Por qué importa esto en tu sitio?</strong><br/>
                La auditoría técnica para IA no trata sobre velocidad, sino sobre accesibilidad de datos brutos. Si tu sitio carece de <em>schemas</em> ({data.technical.schemasFound} detectados) o renderiza por cliente ({data.technical.isSSR ? 'excelente que uses SSR' : 'cuidado, usas CSR'}), los bots de OpenAI y Google no entenderán correctamente de qué trata tu web o directamente recibirán una página en blanco. 
              </div>
            )}
          </div>
        </div>

        {/* Pilar 2: Estructura de Contenido */}
        <div 
          className={`${styles.card} ${styles.glass}`}
          onClick={() => toggleCard(2)}
        >
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderIconGroup}>
              <FileText color="var(--secondary)" />
              Estructura de Contenido (On-Page)
            </div>
            <ChevronDown className={`${styles.chevronIcon} ${expandedCard === 2 ? styles.chevronExpanded : ''}`} />
          </div>
          <div className={`${styles.cardContent} ${expandedCard === 2 ? styles.cardContentExpanded : ''}`}>
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
            {expandedCard === 2 && (
              <div className={styles.accordionExtraText}>
                <strong>¿Por qué importa esto en tu sitio?</strong><br/>
                Los motores generativos necesitan extraer bloques de texto cortos y verificables. Tienes un score BLUF de {data.content.blufScore}/10 y {data.content.statsCount} datos duros. Para dominar AEO, el contenido &quot;paja&quot; comercial debe reemplazarse por respuestas directas bajo tus subtítulos y contener citas estadísticas que le den confianza al LLM para elegirte como fuente.
              </div>
            )}
          </div>
        </div>

        {/* Pilar 3: Métricas 2026 */}
        <div 
          className={`${styles.card} ${styles.glass}`}
          onClick={() => toggleCard(3)}
        >
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderIconGroup}>
              <Activity color="var(--accent)" />
              Métricas GEO / AEO 2026
            </div>
            <ChevronDown className={`${styles.chevronIcon} ${expandedCard === 3 ? styles.chevronExpanded : ''}`} />
          </div>
          <div className={`${styles.cardContent} ${expandedCard === 3 ? styles.cardContentExpanded : ''}`}>
            <MetricRow 
              label="Share of Model (SoM) Simulado" 
              value={`${data.metrics2026.somSimulation}%`} 
              status={data.metrics2026.somSimulation > 50 ? "good" : "warn"} 
            />
            <MetricRow 
              label="Probabilidad de Recuperación (RAG)" 
              value={data.metrics2026.ragProbability} 
              status={data.metrics2026.ragProbability === "Alta" ? "good" : (data.metrics2026.ragProbability === "Media" ? "warn" : "error")} 
            />
            <MetricRow 
              label="Sentiment Score de Citación" 
              value={data.metrics2026.sentiment} 
              status={data.metrics2026.sentiment.includes("Positivo") ? "good" : "warn"} 
            />
            {expandedCard === 3 && (
              <div className={styles.accordionExtraText}>
                <strong>¿Por qué importa esto en tu sitio?</strong><br/>
                Para el 2026, lo que importará es el &quot;Share of Model&quot;. Con un SoM de {data.metrics2026.somSimulation}%, y probabilidad de RAG {data.metrics2026.ragProbability}, la IA de Google y ChatGPT te considerarán {data.metrics2026.ragProbability === 'Alta' ? 'una fuente primaria confiable' : 'una fuente secundaria que podría ser omitida'} en sus respuestas generativas directas.
              </div>
            )}
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
