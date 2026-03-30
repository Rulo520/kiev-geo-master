import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Activity, 
  Search, 
  FileText, 
  Bot,
  Zap,
  BookOpen
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
  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div className={`${styles.glass} ${styles.overallScore}`}>
        <div className={styles.scoreCircle}>
          {data.overallScore || 0}
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Score KIev GEO Master</h2>
        <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
          Basado en auditoría "Answer-First", estructuración para LLMs y Performance Técnica.
        </p>
      </div>

      <div className={styles.reportGrid}>
        {/* Pilar 1: Auditoría Técnica */}
        <div className={`${styles.card} ${styles.glass}`}>
          <div className={styles.cardHeader}>
            <Bot color="var(--primary)" />
            Auditoría Técnica (LLM Crawling)
          </div>
          <div className={styles.cardContent}>
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
            <FileText color="var(--secondary)" />
            Estructura de Contenido (On-Page)
          </div>
          <div className={styles.cardContent}>
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
            <Activity color="var(--accent)" />
            Métricas GEO / AEO 2026
          </div>
          <div className={styles.cardContent}>
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
          </div>
        </div>

      </div>
    </div>
  );
}
