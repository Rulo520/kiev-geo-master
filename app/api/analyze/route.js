import { NextResponse } from "next/server";
import { analyzeWebsite } from "@/utils/analyzer";

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "Falta proporcionar una URL válida." }, { status: 400 });
    }

    const result = await analyzeWebsite(url);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Error analizando el sitio." }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Ocurrió un error en el servidor." }, { status: 500 });
  }
}
