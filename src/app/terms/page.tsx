"use client";

import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Nombre del archivo PDF
const PDF_FILE_NAME = "Adium_Colombia_Politica_de_Privacidad.pdf";

export default function TermsPage() {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [width, setWidth] = useState<number | undefined>(undefined);
  const [pdfUrl, setPdfUrl] = useState<string>("");

  useEffect(() => {
    // Configurar el worker de PDF.js usando la versión correcta
    const pdfjsVersion = pdfjs.version || "3.11.174";
    const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    console.log("PDF.js Worker configurado:", workerSrc);
    console.log("Versión de PDF.js:", pdfjsVersion);
    
    // Configurar la URL del PDF correctamente
    if (typeof window !== "undefined") {
      // Prioridad 1: Usar la ruta API (más confiable para caracteres especiales)
      const apiUrl = "/api/pdf/terms";
      // Prioridad 2: Ruta directa del archivo estático
      const staticUrl = `/${encodeURIComponent(PDF_FILE_NAME)}`;
      
      // Intentar primero con la API
      fetch(apiUrl, { method: "HEAD" })
        .then((response) => {
          if (response.ok) {
            console.log("✓ PDF encontrado en ruta API:", apiUrl);
            setPdfUrl(apiUrl);
            return null; // No continuar con el siguiente paso
          } else {
            console.warn("⚠ API no disponible, intentando ruta estática...");
            // Intentar con la ruta estática
            return fetch(staticUrl, { method: "HEAD" });
          }
        })
        .then((response) => {
          if (response) {
            if (response.ok) {
              console.log("✓ PDF encontrado en ruta estática:", staticUrl);
              setPdfUrl(staticUrl);
            } else {
              // Último intento: ruta directa sin codificar
              const directUrl = `/${PDF_FILE_NAME}`;
              console.log("⚠ Intentando ruta directa:", directUrl);
              setPdfUrl(directUrl);
            }
          }
        })
        .catch((err) => {
          console.error("Error al verificar el PDF:", err);
          // Usar ruta API por defecto (debería funcionar)
          setPdfUrl(apiUrl);
        });
      
      // Función para calcular el ancho responsivo
      const calculateWidth = () => {
        const windowWidth = window.innerWidth;
        if (windowWidth < 640) {
          // Móvil: usar el ancho completo menos padding
          return windowWidth - 32; // 16px padding a cada lado
        } else if (windowWidth < 768) {
          // Tablet pequeña
          return windowWidth - 64;
        } else if (windowWidth < 1024) {
          // Tablet
          return 700;
        } else {
          // Desktop
          return 800;
        }
      };
      
      // Configurar el ancho inicial
      setWidth(calculateWidth());
      
      // Actualizar el ancho cuando cambie el tamaño de la ventana
      const handleResize = () => {
        setWidth(calculateWidth());
      };
      
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    console.log("PDF cargado exitosamente. Número de páginas:", numPages);
    setNumPages(numPages);
    setLoading(false);
    setError(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error("Error loading PDF:", error);
    console.error("Detalles del error:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    setLoading(false);
    setError(true);
    setErrorMessage(error.message || "Error desconocido al cargar el PDF");
  }

  function goToPrevPage() {
    setPageNumber((prev) => Math.max(1, prev - 1));
  }

  function goToNextPage() {
    setPageNumber((prev) => Math.min(numPages, prev + 1));
  }

  function zoomIn() {
    setScale((prev) => Math.min(3.0, prev + 0.2));
  }

  function zoomOut() {
    setScale((prev) => Math.max(0.5, prev - 0.2));
  }

  function downloadPDF() {
    const link = document.createElement("a");
    link.href = pdfUrl || `/${PDF_FILE_NAME}`;
    link.download = PDF_FILE_NAME;
    link.click();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8 px-2 sm:px-4 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">
            Política de Privacidad
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Adium Colombia - Términos y Condiciones
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mb-4 sm:mb-6">
          {/* Navegación de páginas */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-0">
            <Button
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0"
            >
              <ChevronLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
            <span className="text-xs sm:text-sm text-gray-700 px-2 sm:px-4 whitespace-nowrap">
              Página {pageNumber} de {numPages || "..."}
            </span>
            <Button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="h-4 w-4 sm:ml-1" />
            </Button>
          </div>

          {/* Controles de zoom y descarga */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 border-t pt-3 sm:border-t-0 sm:pt-0">
            <Button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              variant="outline"
              size="sm"
              className="min-h-[44px] sm:min-h-0"
              aria-label="Alejar"
            >
              <ZoomOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <span className="text-xs sm:text-sm text-gray-700 px-2 sm:px-3 min-w-[50px] sm:min-w-[60px] text-center font-medium">
              {Math.round(scale * 100)}%
            </span>
            <Button
              onClick={zoomIn}
              disabled={scale >= 3.0}
              variant="outline"
              size="sm"
              className="min-h-[44px] sm:min-h-0"
              aria-label="Acercar"
            >
              <ZoomIn className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              onClick={downloadPDF}
              variant="outline"
              size="sm"
              className="min-h-[44px] sm:min-h-0 ml-2"
            >
              <Download className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Descargar</span>
            </Button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="bg-white rounded-lg shadow-md p-2 sm:p-4 lg:p-6 flex justify-center overflow-x-auto overflow-y-auto min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] max-h-[calc(100vh-300px)] sm:max-h-[calc(100vh-350px)]">
          {error ? (
            <div className="flex flex-col items-center justify-center py-10 sm:py-20 px-4">
              <div className="text-red-600 mb-4 text-center">
                <p className="font-semibold mb-2 text-sm sm:text-base">Error al cargar el documento PDF</p>
                <p className="text-xs sm:text-sm text-gray-600 mb-4">
                  {errorMessage || "Por favor, intente descargar el documento o recargar la página."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => {
                    setError(false);
                    setLoading(true);
                    window.location.reload();
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  Recargar
                </Button>
                <Button
                  onClick={downloadPDF}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Descargar PDF
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              {pdfUrl ? (
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center py-10 sm:py-20">
                    <div className="text-sm sm:text-base text-gray-600">Cargando documento...</div>
                  </div>
                }
                error={
                  <div className="flex flex-col items-center justify-center py-10 sm:py-20 px-4">
                    <div className="text-red-600 mb-4 text-center">
                      <p className="font-semibold mb-2 text-sm sm:text-base">Error al cargar el documento</p>
                      <p className="text-xs sm:text-sm text-gray-600">{errorMessage}</p>
                    </div>
                  </div>
                }
                options={{
                  cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || "3.11.174"}/cmaps/`,
                  cMapPacked: true,
                  standardFontDataUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || "3.11.174"}/standard_fonts/`,
                }}
              >
                {numPages > 0 && (
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    className="shadow-lg max-w-full"
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    width={width}
                    onRenderError={(error) => {
                      console.error("Error al renderizar la página:", error);
                    }}
                  />
                )}
                </Document>
              ) : (
                <div className="flex items-center justify-center py-10 sm:py-20">
                  <div className="text-sm sm:text-base text-gray-600">Preparando documento...</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {numPages > 1 && (
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mt-4 sm:mt-6 flex justify-center">
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0"
              >
                <ChevronLeft className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Anterior</span>
              </Button>
              <span className="text-xs sm:text-sm text-gray-700 px-2 sm:px-4 whitespace-nowrap">
                Página {pageNumber} de {numPages}
              </span>
              <Button
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="h-4 w-4 sm:ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


