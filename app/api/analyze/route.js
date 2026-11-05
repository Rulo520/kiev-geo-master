import { NextResponse } from "next/server";
import { analyzeWebsite } from "@/utils/analyzer";

// Timeout máximo para la función serverless (60 segundos)
export const maxDuration = 60;

export async function POST(request) {
  try {
    const { url } = await request.json();

    // Validar que se proporcionó una URL
    if (!url) {
      return NextResponse.json(
        { error: "URL requerida" },
        { status: 400 }
      );
    }

    // Normalizar URL: agregar protocolo si falta
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    // Validar formato de URL
    try {
      new URL(targetUrl);
    } catch {
      return NextResponse.json(
        { error: "URL inválida" },
        { status: 400 }
      );
    }

    // Ejecutar análisis completo
    const results = await analyzeWebsite(targetUrl);
    return NextResponse.json(results);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
