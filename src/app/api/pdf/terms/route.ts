import { NextResponse } from "next/server";
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const PDF_FILE_NAME = "Adium_Colombia_Politica_de_Privacidad.pdf";

// Función para encontrar el archivo ignorando diferencias de codificación
async function findPdfFile(publicDir: string, fileName: string): Promise<string | null> {
  try {
    // Primero intentar con el nombre exacto
    const exactPath = join(publicDir, fileName);
    if (existsSync(exactPath)) {
      return exactPath;
    }
    
    // Si no se encuentra, buscar en el directorio
    const files = await readdir(publicDir);
    const normalizedFileName = fileName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    for (const file of files) {
      const normalizedFile = file.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalizedFile === normalizedFileName || file.includes("Politica") || file.includes("Privacidad")) {
        return join(publicDir, file);
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error al buscar el archivo:", error);
    return null;
  }
}

export async function GET() {
  try {
    const publicDir = join(process.cwd(), "public");
    const filePath = await findPdfFile(publicDir, PDF_FILE_NAME);
    
    if (!filePath) {
      console.error(`Archivo no encontrado en: ${publicDir}`);
      return NextResponse.json(
        { error: "El archivo PDF no se encontró en el servidor" },
        { status: 404 }
      );
    }
    
    const fileBuffer = await readFile(filePath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${PDF_FILE_NAME}"; filename*=UTF-8''${encodeURIComponent(PDF_FILE_NAME)}`,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error al leer el archivo PDF:", error);
    return NextResponse.json(
      { 
        error: "No se pudo cargar el archivo PDF",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}

