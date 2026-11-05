"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Loader2,
  Clock,
  Globe,
  Sun,
  Moon,
  Download,
  Share2,
  GitCompareArrows,
  History,
  Trash2,
} from "lucide-react";
import styles from "./page.module.css";
import AnalysisReport from "@/components/AnalysisReport";
import { useTheme } from "@/components/ThemeProvider";

const HISTORY_KEY = "kievGeoHistory";
const MAX_HISTORY = 10;

const LOADING_STEPS = [
  "Conectando con el servidor...",
  "Analizando estructura del sitio...",
  "Evaluando factores on-page...",
  "Revisando rendimiento y velocidad...",
  "Verificando datos estructurados...",
  "Analizando perfil de enlaces...",
  "Evaluando experiencia de usuario...",
  "Generando reporte final...",
];

function getScoreColor(score) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function HomePage() {
  const { theme, toggleTheme } = useTheme();

  // --- Core analysis state ---
  const [url, setUrl] = useState("");
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);

  // --- Comparison mode state ---
  const [comparisonMode, setComparisonMode] = useState(false);
  const [urlB, setUrlB] = useState("");
  const [analysisDataB, setAnalysisDataB] = useState(null);
  const [loadingB, setLoadingB] = useState(false);
  const [errorB, setErrorB] = useState(null);

  // --- History state ---
  const [history, setHistory] = useState([]);

  // --- Share toast state ---
  const [showToast, setShowToast] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Persist history to localStorage
  const persistHistory = useCallback((items) => {
    setHistory(items);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    } catch {
      // ignore quota errors
    }
  }, []);

  // Save a completed analysis to history
  const saveToHistory = useCallback(
    (analysisUrl, data) => {
      const entry = {
        url: analysisUrl,
        overallScore: data?.overallScore ?? data?.score ?? null,
        analyzedAt: new Date().toISOString(),
        data,
      };
      const updated = [entry, ...history.filter((h) => h.url !== analysisUrl)].slice(0, MAX_HISTORY);
      persistHistory(updated);
    },
    [history, persistHistory]
  );

  // Delete a single history item
  const deleteHistoryItem = useCallback(
    (index) => {
      const updated = history.filter((_, i) => i !== index);
      persistHistory(updated);
    },
    [history, persistHistory]
  );

  // Clear all history
  const clearHistory = useCallback(() => {
    persistHistory([]);
  }, [persistHistory]);

  // Reload analysis from history
  const loadFromHistory = useCallback((entry) => {
    setUrl(entry.url);
    setAnalysisData(entry.data);
    setError(null);
    setComparisonMode(false);
    setAnalysisDataB(null);
  }, []);

  // --- Loading step animation ---
  useEffect(() => {
    if (!loading && !loadingB) {
      setLoadingStep(0);
      return;
    }
    if (loadingStep >= LOADING_STEPS.length - 1) return;
    const timer = setTimeout(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 1800);
    return () => clearTimeout(timer);
  }, [loading, loadingB, loadingStep]);

  // --- Fetch analysis ---
  const fetchAnalysis = useCallback(async (targetUrl) => {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: targetUrl }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Error del servidor (${res.status})`);
    }
    return res.json();
  }, []);

  // --- Submit handler ---
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!url.trim()) return;

      setError(null);
      setErrorB(null);
      setAnalysisData(null);
      setAnalysisDataB(null);
      setLoading(true);
      setLoadingStep(0);

      if (comparisonMode && urlB.trim()) {
        setLoadingB(true);
      }

      try {
        const data = await fetchAnalysis(url.trim());
        setAnalysisData(data);
        saveToHistory(url.trim(), data);
      } catch (err) {
        setError(err.message || "Error al analizar la URL.");
      } finally {
        setLoading(false);
      }

      if (comparisonMode && urlB.trim()) {
        try {
          const dataB = await fetchAnalysis(urlB.trim());
          setAnalysisDataB(dataB);
          saveToHistory(urlB.trim(), dataB);
        } catch (err) {
          setErrorB(err.message || "Error al analizar la segunda URL.");
        } finally {
          setLoadingB(false);
        }
      }
    },
    [url, urlB, comparisonMode, fetchAnalysis, saveToHistory]
  );

  // --- Share results ---
  const handleShare = useCallback(async () => {
    if (!analysisData) return;
    const score = analysisData.overallScore ?? analysisData.score ?? "N/A";
    const summary = [
      `🔍 Kiev GEO Master — Análisis SEO`,
      `URL: ${url}`,
      `Puntuación: ${score}/100`,
      `Fecha: ${formatDate(new Date().toISOString())}`,
      `---`,
      `Generado con Kiev GEO Master v3.2`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = summary;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  }, [analysisData, url]);

  // --- PDF export ---
  const handleExportPDF = useCallback(() => {
    window.print();
  }, []);

  const isLoading = loading || loadingB;
  const hasResults = !!analysisData;

  return (
    <main className={styles.container}>
      {/* ============ Theme Toggle ============ */}
      <button
        className={styles.themeToggle}
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
        style={
          !styles.themeToggle
            ? {
                position: "fixed",
                top: "1.25rem",
                right: "1.25rem",
                zIndex: 1000,
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "50%",
                width: 44,
                height: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "inherit",
                backdropFilter: "blur(10px)",
                transition: "all 0.3s ease",
              }
            : undefined
        }
      >
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* ============ Hero Section ============ */}
      <section className={styles.hero}>
        <h1 className={styles.title}>
          <span style={{
            color: theme === "dark" ? "#ffffff" : "#000000",
            WebkitTextFillColor: theme === "dark" ? "#ffffff" : "#000000",
          }}>Kiev</span>{" "}
          <span style={{
            background: "linear-gradient(135deg, #06b6d4 0%, #22c55e 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>GEO Master</span>
        </h1>
        <p className={styles.subtitle}>
          Auditoría SEO + GEO para dominar buscadores e IAs generativas
        </p>
        <span className={styles.version}>v3.2 — Noviembre 2026</span>
      </section>

      {/* ============ Toolbar ============ */}
      <div
        className={styles.toolbar}
        style={
          !styles.toolbar
            ? {
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
                flexWrap: "wrap",
                marginBottom: "1.5rem",
              }
            : undefined
        }
      >
        <button
          onClick={() => {
            setComparisonMode((v) => !v);
            if (comparisonMode) {
              setUrlB("");
              setAnalysisDataB(null);
              setErrorB(null);
            }
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "0.5rem 1rem",
            borderRadius: 8,
            border: comparisonMode
              ? "1px solid #6366f1"
              : "1px solid rgba(255,255,255,0.15)",
            background: comparisonMode
              ? "rgba(99,102,241,0.2)"
              : "rgba(255,255,255,0.05)",
            color: comparisonMode ? "#a5b4fc" : "inherit",
            cursor: "pointer",
            fontSize: "0.875rem",
            transition: "all 0.3s ease",
          }}
        >
          <GitCompareArrows size={16} />
          Modo Comparación
        </button>

        {hasResults && (
          <>
            <button
              onClick={handleShare}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "0.5rem 1rem",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)",
                color: "inherit",
                cursor: "pointer",
                fontSize: "0.875rem",
                transition: "all 0.3s ease",
              }}
            >
              <Share2 size={16} />
              Compartir
            </button>

            <button
              onClick={handleExportPDF}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "0.5rem 1rem",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)",
                color: "inherit",
                cursor: "pointer",
                fontSize: "0.875rem",
                transition: "all 0.3s ease",
              }}
            >
              <Download size={16} />
              Exportar PDF
            </button>
          </>
        )}
      </div>

      {/* ============ Search Form ============ */}
      <form onSubmit={handleSubmit} className={styles.searchContainer}>
        <div
          className={comparisonMode ? styles.comparisonContainer : undefined}
          style={
            comparisonMode
              ? {
                  display: "flex",
                  gap: "1rem",
                  width: "100%",
                  flexWrap: "wrap",
                }
              : { display: "flex", width: "100%", gap: 0 }
          }
        >
          {/* Primary URL input */}
          <div
            className={comparisonMode ? styles.comparisonColumn : undefined}
            style={
              comparisonMode
                ? { flex: 1, minWidth: 220, display: "flex" }
                : { flex: 1, display: "flex" }
            }
          >
            <input
              type="url"
              className={styles.input}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                comparisonMode
                  ? "URL principal — ejemplo: https://tusitio.com"
                  : "Ingresa la URL a analizar — ejemplo: https://tusitio.com"
              }
              required
              disabled={isLoading}
              style={{ flex: 1 }}
            />
          </div>

          {/* Secondary URL input (comparison mode) */}
          {comparisonMode && (
            <div
              className={styles.comparisonColumn}
              style={{ flex: 1, minWidth: 220, display: "flex" }}
            >
              <input
                type="url"
                className={styles.input}
                value={urlB}
                onChange={(e) => setUrlB(e.target.value)}
                placeholder="URL competidor — ejemplo: https://competidor.com"
                required
                disabled={isLoading}
                style={{ flex: 1 }}
              />
            </div>
          )}

          <button
            type="submit"
            className={styles.button}
            disabled={isLoading}
            style={{ flexShrink: 0 }}
          >
            {isLoading ? (
              <Loader2 size={20} className={styles.loadingSpinner} />
            ) : (
              <Search size={20} />
            )}
            <span style={{ marginLeft: 8 }}>
              {isLoading
                ? "Analizando..."
                : comparisonMode
                ? "Comparar"
                : "Analizar"}
            </span>
          </button>
        </div>
      </form>

      {/* ============ Loading Animation ============ */}
      {isLoading && (
        <div className={styles.loadingProgress}>
          <div className={styles.progressDots}>
            {LOADING_STEPS.map((step, i) => (
              <div
                key={i}
                className={styles.loadingStep}
                style={{
                  opacity: i <= loadingStep ? 1 : 0.3,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0.4rem 0",
                  fontSize: "0.9rem",
                  transition: "opacity 0.4s ease",
                }}
              >
                {i < loadingStep ? (
                  <span style={{ color: "#22c55e" }}>✓</span>
                ) : i === loadingStep ? (
                  <Loader2
                    size={14}
                    className={styles.loadingSpinner}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                ) : (
                  <Clock size={14} style={{ opacity: 0.4 }} />
                )}
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ Error Display ============ */}
      {error && (
        <div
          role="alert"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 12,
            padding: "1rem 1.5rem",
            marginBottom: "1.5rem",
            color: "#fca5a5",
            textAlign: "center",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}
      {errorB && (
        <div
          role="alert"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 12,
            padding: "1rem 1.5rem",
            marginBottom: "1.5rem",
            color: "#fca5a5",
            textAlign: "center",
          }}
        >
          <strong>Error (Competidor):</strong> {errorB}
        </div>
      )}

      {/* ============ History Panel ============ */}
      {history.length > 0 && !isLoading && (
        <section
          className={styles.historyPanel}
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: "1.25rem",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h3
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                margin: 0,
                fontSize: "1rem",
                fontWeight: 600,
              }}
            >
              <History size={18} />
              Historial de Análisis
            </h3>
            <button
              onClick={clearHistory}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "0.35rem 0.75rem",
                borderRadius: 8,
                border: "1px solid rgba(239,68,68,0.3)",
                background: "rgba(239,68,68,0.1)",
                color: "#fca5a5",
                cursor: "pointer",
                fontSize: "0.8rem",
                transition: "all 0.3s ease",
              }}
            >
              <Trash2 size={14} />
              Limpiar historial
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {history.map((item, idx) => (
              <div
                key={`${item.url}-${item.analyzedAt}`}
                className={styles.historyItem}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.65rem 1rem",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => loadFromHistory(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") loadFromHistory(item);
                }}
                tabIndex={0}
                role="button"
                aria-label={`Cargar análisis de ${item.url}`}
              >
                <Globe size={16} style={{ flexShrink: 0, opacity: 0.6 }} />
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: "0.875rem",
                  }}
                >
                  {item.url}
                </span>
                {item.overallScore != null && (
                  <span
                    className={styles.historyScore}
                    style={{
                      flexShrink: 0,
                      padding: "0.15rem 0.6rem",
                      borderRadius: 6,
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "#fff",
                      background: getScoreColor(item.overallScore),
                    }}
                  >
                    {item.overallScore}
                  </span>
                )}
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: "0.75rem",
                    opacity: 0.5,
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatDate(item.analyzedAt)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteHistoryItem(idx);
                  }}
                  aria-label={`Eliminar análisis de ${item.url}`}
                  style={{
                    flexShrink: 0,
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.35)",
                    cursor: "pointer",
                    padding: 4,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    transition: "color 0.2s ease",
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============ Results ============ */}
      {hasResults && !isLoading && (
        <div
          style={
            comparisonMode && analysisDataB
              ? {
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1.5rem",
                  width: "100%",
                }
              : undefined
          }
        >
          {/* Primary result */}
          <div className={styles.reportContainer}>
            <div className={styles.reportHeader}>
              <div className={styles.reportHeaderInfo}>
                <Globe size={20} />
                <span>{url}</span>
              </div>
              {comparisonMode && analysisDataB && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.2rem 0.6rem",
                    borderRadius: 6,
                    background: "rgba(99,102,241,0.2)",
                    color: "#a5b4fc",
                  }}
                >
                  Principal
                </span>
              )}
            </div>
            <AnalysisReport data={analysisData} />
          </div>

          {/* Comparison result */}
          {comparisonMode && analysisDataB && (
            <div className={styles.reportContainer}>
              <div className={styles.reportHeader}>
                <div className={styles.reportHeaderInfo}>
                  <Globe size={20} />
                  <span>{urlB}</span>
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.2rem 0.6rem",
                    borderRadius: 6,
                    background: "rgba(245,158,11,0.2)",
                    color: "#fcd34d",
                  }}
                >
                  Competidor
                </span>
              </div>
              <AnalysisReport data={analysisDataB} />

              {/* Score diff indicator */}
              {analysisData?.overallScore != null &&
                analysisDataB?.overallScore != null && (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background:
                        analysisData.overallScore > analysisDataB.overallScore
                          ? "rgba(34,197,94,0.2)"
                          : analysisData.overallScore < analysisDataB.overallScore
                          ? "rgba(239,68,68,0.2)"
                          : "rgba(234,179,8,0.2)",
                      border: `1px solid ${
                        analysisData.overallScore > analysisDataB.overallScore
                          ? "rgba(34,197,94,0.4)"
                          : analysisData.overallScore < analysisDataB.overallScore
                          ? "rgba(239,68,68,0.4)"
                          : "rgba(234,179,8,0.4)"
                      }`,
                      borderRadius: 8,
                      padding: "0.25rem 0.75rem",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Δ{" "}
                    {analysisData.overallScore - analysisDataB.overallScore > 0
                      ? "+"
                      : ""}
                    {analysisData.overallScore - analysisDataB.overallScore} pts
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      {/* ============ Footer ============ */}
      <footer className={styles.footer}>
        <p>
          Kiev GEO Master v3.2 — Desarrollado por{" "}
          <a href="https://kiev.agency" target="_blank" rel="noopener noreferrer" style={{
            fontWeight: 700, color: "inherit", textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}>Kiev Agency</a> © {new Date().getFullYear()}
        </p>
      </footer>

      {/* ============ Share Toast ============ */}
      {showToast && (
        <div
          className={styles.toast}
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            background: "rgba(34,197,94,0.9)",
            color: "#fff",
            padding: "0.75rem 1.5rem",
            borderRadius: 12,
            fontSize: "0.9rem",
            fontWeight: 600,
            zIndex: 9999,
            backdropFilter: "blur(10px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            animation: "fadeInUp 0.3s ease",
          }}
        >
          ✓ ¡Copiado!
        </div>
      )}

      {/* Inline keyframes for spinner & toast (safe fallback) */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media print {
          .${styles.themeToggle},
          .${styles.toolbar},
          .${styles.historyPanel},
          .${styles.toast} {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          form .${styles.comparisonContainer} {
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
