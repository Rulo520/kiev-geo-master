"use client";
import { useState } from "react";
import { Search, Loader2, Clock, Globe } from "lucide-react";
import styles from "./page.module.css";
import AnalysisReport from "@/components/AnalysisReport";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loadingStep, setLoadingStep] = useState("");

  const analyzeUrl = async (e) => {
    e.preventDefault();
    if (!url) return;

    try {
      setLoading(true);
      setError(null);
      setResults(null);
      setLoadingStep("Conectando con el servidor...");

      let targetUrl = url;
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = "https://" + targetUrl;
        setUrl(targetUrl);
      }

      const steps = [
        "Descargando HTML y recursos técnicos...",
        "Analizando estructura semántica y meta tags...",
        "Evaluando accesibilidad y seguridad...",
        "Ejecutando auditoría de IA con Gemini...",
        "Midiendo Core Web Vitals...",
        "Calculando scores finales...",
      ];
      let stepIndex = 0;
      const stepInterval = setInterval(() => {
        stepIndex = Math.min(stepIndex + 1, steps.length - 1);
        setLoadingStep(steps[stepIndex]);
      }, 3000);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Error analizando la URL");
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Análisis fallido");
      setResults(data);
    } catch (err) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  return (
    <main className={styles.container}>
      <div className={`${styles.hero}`}>
        <h1 className={styles.title}>
          Kiev <span className="gradient-text">GEO Master</span>
        </h1>
        <p className={styles.subtitle}>
          Motor de auditoría integral para SEO, AEO y GEO. Análisis técnico
          avanzado, Core Web Vitals, accesibilidad y cumplimiento de directrices
          &quot;Answer-First&quot; para dominancia en motores generativos de IA.
        </p>
        <p className={styles.version}>v2.0 — Noviembre 2026</p>

        <form onSubmit={analyzeUrl} className={styles.searchContainer}>
          <input
            type="text"
            className={styles.input}
            placeholder="Ingresa la URL a analizar (ej. https://tudominio.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            type="submit"
            className={styles.button}
            disabled={loading || !url}
          >
            {loading ? (
              <Loader2 className={styles.loadingSpinner} />
            ) : (
              <Search />
            )}
            {loading ? "Analizando..." : "Auditar"}
          </button>
        </form>

        {loading && (
          <div className={styles.loadingProgress}>
            <div className={styles.progressDots}>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p className={styles.loadingStep} key={loadingStep}>
              {loadingStep}
            </p>
          </div>
        )}
        {error && (
          <p style={{ color: "var(--danger)", marginTop: "1rem" }}>{error}</p>
        )}
      </div>

      {results && (
        <div className={styles.reportContainer}>
          <div className={styles.reportHeader}>
            <div className={styles.reportHeaderInfo}>
              <Globe size={16} />
              <span>{results.url}</span>
            </div>
            <div className={styles.reportHeaderInfo}>
              <Clock size={16} />
              <span>
                {new Date(results.analyzedAt).toLocaleString("es-AR")}
              </span>
            </div>
          </div>
          <AnalysisReport data={results} />
        </div>
      )}

      <footer className={styles.footer}>
        <p>
          powered by{" "}
          <span style={{ fontWeight: 600, color: "var(--primary)" }}>
            Kiev.Agency
          </span>
        </p>
      </footer>
    </main>
  );
}
