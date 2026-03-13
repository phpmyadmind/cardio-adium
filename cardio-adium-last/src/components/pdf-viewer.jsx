import { useState, useEffect } from 'react';

export function PDFViewer({ pdfUrl, title, className = '', height, hideTitle }) {
  const [viewerHeight, setViewerHeight] = useState('800px');

  useEffect(() => {
    const calculateHeight = () => {
      if (typeof window === 'undefined') return;
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      if (windowWidth < 640) {
        // Móvil: usar más del viewport para enfatizar el PDF
        const mobileHeight = Math.max(450, windowHeight * 0.75);
        setViewerHeight(`${mobileHeight}px`);
      } else if (windowWidth < 768) {
        const tabletHeight = Math.max(550, windowHeight * 0.78);
        setViewerHeight(`${tabletHeight}px`);
      } else if (windowWidth < 1024) {
        setViewerHeight('700px');
      } else {
        setViewerHeight(height || '800px');
      }
    };
    calculateHeight();
    const handleResize = () => calculateHeight();
    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 150);
    };
    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, [height]);

  const fullPdfUrl = pdfUrl.startsWith('/') ? pdfUrl : `/${pdfUrl}`;

  return (
    <div className={`w-full ${className}`}>
      {title && !hideTitle && (
        <div className="mb-4">
          <h3 className="text-lg sm:text-xl font-bold">{title}</h3>
        </div>
      )}
      <div
        className="w-full border-0 sm:border border-gray-200 rounded-none sm:rounded-lg overflow-hidden"
        style={{ height: viewerHeight, minHeight: '450px', maxHeight: '90vh' }}
      >
        <iframe
          src={`${fullPdfUrl}#toolbar=1`}
          title={title || 'PDF'}
          className="w-full h-full"
          style={{ border: 'none' }}
        />
      </div>
    </div>
  );
}
