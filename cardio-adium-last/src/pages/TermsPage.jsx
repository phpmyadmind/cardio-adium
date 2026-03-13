import { useState } from 'react';
import { ZoomIn, ZoomOut, Download } from 'lucide-react';
import { Button } from '../components/ui/button';

const PDF_FILE_NAME = 'Adium_Colombia_Politica_de_Privacidad.pdf';

export default function TermsPage() {
  const [scale, setScale] = useState(1.0);
  const pdfUrl = `/${PDF_FILE_NAME}`;

  const zoomIn = () => setScale((prev) => Math.min(3.0, prev + 0.2));
  const zoomOut = () => setScale((prev) => Math.max(0.5, prev - 0.2));

  const downloadPDF = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = PDF_FILE_NAME;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8 px-2 sm:px-4 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">
            Política de Privacidad
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Adium Colombia - Términos y Condiciones
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            <Button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              variant="outline"
              size="sm"
              className="min-h-[44px] sm:min-h-[36px] w-10 sm:w-auto"
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
              className="min-h-[44px] sm:min-h-[36px] w-10 sm:w-auto"
              aria-label="Acercar"
            >
              <ZoomIn className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              onClick={downloadPDF}
              variant="outline"
              size="sm"
              className="min-h-[44px] sm:min-h-[36px] flex-1 sm:flex-initial text-xs sm:text-sm"
            >
              <Download className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Descargar</span>
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-2 sm:p-4 lg:p-6">
          <div
            className="overflow-auto min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] max-h-[calc(100vh-250px)]"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
          >
            <iframe
              src={`${pdfUrl}#toolbar=1`}
              title="Política de Privacidad"
              className="w-full border-0"
              style={{ minHeight: '800px', height: 'calc(100vh - 200px)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
