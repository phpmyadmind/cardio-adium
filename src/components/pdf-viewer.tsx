"use client";

import { useState, useEffect } from "react";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

interface PDFViewerProps {
  pdfUrl: string;
  title?: string;
  className?: string;
  height?: string;
}

export function PDFViewer({ 
  pdfUrl, 
  title,
  className = "",
  height
}: PDFViewerProps) {
  const [viewerHeight, setViewerHeight] = useState<string>("800px");

  // Calcular altura responsiva según el tamaño de pantalla
  useEffect(() => {
    const calculateHeight = () => {
      if (typeof window === 'undefined') return;
      
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      
      if (windowWidth < 640) {
        // Móvil: usar altura de viewport menos espacio para header y padding
        // Aproximadamente 70vh para dejar espacio para otros elementos
        const mobileHeight = Math.max(400, windowHeight * 0.7);
        setViewerHeight(`${mobileHeight}px`);
      } else if (windowWidth < 768) {
        // Tablet pequeña
        const tabletHeight = Math.max(500, windowHeight * 0.75);
        setViewerHeight(`${tabletHeight}px`);
      } else if (windowWidth < 1024) {
        // Tablet
        setViewerHeight("700px");
      } else {
        // Desktop
        setViewerHeight(height || "800px");
      }
    };

    // Calcular altura inicial
    calculateHeight();

    // Actualizar altura cuando cambie el tamaño de la ventana
    const handleResize = () => {
      calculateHeight();
    };

    // Usar debounce para mejorar el rendimiento
    let resizeTimeout: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 150);
    };

    window.addEventListener("resize", debouncedResize);
    return () => {
      window.removeEventListener("resize", debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, [height]);

  // Configurar el plugin de layout por defecto
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [
      defaultTabs[0], // Tab de marcadores
      defaultTabs[1], // Tab de miniaturas
    ],
  });

  // Construir la URL completa del PDF
  const fullPdfUrl = pdfUrl.startsWith('/') ? pdfUrl : `/${pdfUrl}`;

  return (
    <div className={`w-full ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg sm:text-xl font-bold">{title}</h3>
        </div>
      )}
      <div 
        className="w-full border border-gray-200 rounded-lg overflow-hidden"
        style={{ 
          height: viewerHeight,
          minHeight: "400px",
          maxHeight: "90vh"
        }}
      >
        <Worker workerUrl="https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js">
          <Viewer
            fileUrl={fullPdfUrl}
            plugins={[defaultLayoutPluginInstance]}
          />
        </Worker>
      </div>
    </div>
  );
}

