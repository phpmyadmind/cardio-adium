import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { QrCode, Download } from 'lucide-react';

export function QRCodeViewer({ viewName, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const canvasRef = useRef(null);

  const statsToken = process.env.REACT_APP_QR_STATS_TOKEN || 'stats-access';

  const routeMap = useMemo(
    () => ({
      agenda: '/dashboard/agenda',
      speakers: '/dashboard/speakers',
      preguntas: '/dashboard/preguntas',
      encuestas: '/dashboard/encuestas',
      estadisticas: `/estatistics?qr_key=${encodeURIComponent(statsToken)}`,
    }),
    [statsToken]
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      const route = routeMap[viewName];
      const url = `${baseUrl}${route}`;
      setQrUrl(url);
    }
  }, [isMounted, viewName, isOpen, routeMap]);

  useEffect(() => {
    if (qrUrl && isMounted && typeof window !== 'undefined') {
      import('qrcode').then((QRCode) => {
        QRCode.default
          .toDataURL(qrUrl, {
            width: 256,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' },
          })
          .then(setQrDataUrl)
          .catch(console.error);
      });
    }
  }, [qrUrl, isMounted]);

  useEffect(() => {
    if (qrUrl && canvasRef.current && isMounted && typeof window !== 'undefined') {
      import('qrcode').then((QRCode) => {
        QRCode.default.toCanvas(canvasRef.current, qrUrl, {
          width: 256,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' },
        }).catch(console.error);
      });
    }
  }, [qrUrl, isMounted]);

  const handleDownload = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `QR-${label.replace(/\s+/g, '-')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error al descargar QR:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 w-10 p-0" title={`Ver código QR para ${label}`}>
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
                <img src={qrDataUrl} alt={`Código QR para ${label}`} className="w-64 h-64" />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="text-center space-y-2 w-full">
                <p className="text-sm text-muted-foreground break-all px-2">{qrUrl}</p>
                <Button onClick={handleDownload} variant="outline" className="w-full">
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
