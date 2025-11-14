"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Download } from "lucide-react";
import QRCode from "qrcode";

interface QRCodeViewerProps {
  viewName: "agenda" | "speakers" | "preguntas" | "encuestas" | "estadisticas";
  label: string;
}

export function QRCodeViewer({ viewName, label }: QRCodeViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mapear nombres de vista a rutas
  const statsToken = process.env.NEXT_PUBLIC_QR_STATS_TOKEN || "stats-access";

  const routeMap: Record<"agenda" | "speakers" | "preguntas" | "encuestas" | "estadisticas", string> = useMemo(
    () => ({
      agenda: "/dashboard/agenda",
      speakers: "/dashboard/speakers",
      preguntas: "/dashboard/preguntas",
      encuestas: "/dashboard/encuestas",
      estadisticas: `/estatistics?qr_key=${encodeURIComponent(statsToken)}`,
    }),
    [statsToken]
  );

  // Asegurar que el componente esté montado antes de generar la URL
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Generar URL cuando el componente esté montado y cuando se abra el modal
  useEffect(() => {
    if (isMounted && typeof window !== "undefined") {
      const baseUrl = window.location.origin;
      const route = routeMap[viewName];
      const url = `${baseUrl}${route}`;
      setQrUrl(url);
    }
  }, [isMounted, viewName, routeMap, isOpen]);

  // Generar QR cuando la URL esté lista
  useEffect(() => {
    if (qrUrl && isMounted && typeof window !== "undefined") {
      QRCode.toDataURL(qrUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((dataUrl) => {
          setQrDataUrl(dataUrl);
        })
        .catch((error) => {
          console.error("Error al generar QR:", error);
        });
    }
  }, [qrUrl, isMounted]);

  // Generar QR en canvas también para descarga
  useEffect(() => {
    if (qrUrl && canvasRef.current && isMounted && typeof window !== "undefined") {
      QRCode.toCanvas(canvasRef.current, qrUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      }).catch((error) => {
        console.error("Error al generar QR en canvas:", error);
      });
    }
  }, [qrUrl, isMounted]);

  const handleDownload = async () => {
    if (!canvasRef.current) return;

    try {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `QR-${label.replace(/\s+/g, "-")}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, "image/png");
    } catch (error) {
      console.error("Error al descargar QR:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="h-10 w-10 p-0"
          title={`Ver código QR para ${label}`}
        >
          <QrCode className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Código QR - {label}</DialogTitle>
          <DialogDescription>
            Escanee este código para acceder directamente a la sección de {label.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-4">
          {isMounted && qrUrl && qrDataUrl ? (
            <>
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <img
                  src={qrDataUrl}
                  alt={`Código QR para ${label}`}
                  className="w-64 h-64"
                />
                {/* Canvas oculto para descarga */}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="text-center space-y-2 w-full">
                <p className="text-sm text-muted-foreground break-all px-2">
                  {qrUrl}
                </p>
                <Button 
                  onClick={handleDownload}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar QR
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-64 h-64 bg-gray-100 animate-pulse rounded-lg mx-auto" />
              <p className="text-sm text-muted-foreground mt-4">Cargando código QR...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

