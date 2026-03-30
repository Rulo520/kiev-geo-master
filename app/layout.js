import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata = {
  title: "KIev GEO Master | Análisis AEO, GEO y SEO",
  description: "Plataforma de auditoría técnica Answer-First para optimización en motores generativos de inteligencia artificial. Desarrollada por The Kiev Platform.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={outfit.variable}>
      <body>{children}</body>
    </html>
  );
}
