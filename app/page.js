"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import styles from "./page.module.css";
import AnalysisReport from "@/components/AnalysisReport";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const analyzeUrl = async (e) => {
    e.preventDefault();
    if (!url) return;

    try {
      setLoading(true);
      setError(null);
      setResults(null);

      // Validate URL format
      let targetUrl = url;
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
        setUrl(targetUrl);
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Error analizando la URL. Verifica que sea accesible.");
      }

      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={`${styles.hero} animate-fade-in`}>
        <h1 className={styles.title}>
          Kiev <span className="gradient-text">GEO Master</span>
        </h1>
        <p className={styles.subtitle}>
          Analizador absoluto de métricas para SEO, AEO y GEO. 
          Auditoría técnica avanzada y cumplimiento de directrices &quot;Answer-First&quot; para dominancia en inteligencia artificial y motores generativos.
        </p>
        
        <form onSubmit={analyzeUrl} className={styles.searchContainer}>
          <input
            type="text"
            className={styles.input}
            placeholder="Ingresa la URL a analizar (ej. https://tudominio.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit" className={styles.button} disabled={loading || !url}>
            {loading ? <Loader2 className={styles.loadingSpinner} /> : <Search />}
            {loading ? "Analizando..." : "Auditar"}
          </button>
        </form>
        {error && <p style={{ color: "var(--danger)", marginTop: "1rem" }}>{error}</p>}
      </div>

      {results && (
        <div className={styles.reportContainer}>
          <AnalysisReport data={results} url={url} />
        </div>
      )}

      <footer className={styles.footer}>
        <p>powered by <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Kiev.Agency</span></p>
      </footer>
    </main>
  );
}
