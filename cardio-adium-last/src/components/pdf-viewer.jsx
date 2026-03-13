import { useState, useEffect } from 'react';

export function PDFViewer({ pdfUrl, title, className = '', height }) {
  const [viewerHeight, setViewerHeight] = useState('800px');

  useEffect(() => {
    const calculateHeight = () => {
      if (typeof window === 'undefined') return;
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      if (windowWidth < 640) {
        const mobileHeight = Math.max(400, windowHeight * 0.7);
        setViewerHeight(`${mobileHeight}px`);
      } else if (windowWidth < 768) {
        const tabletHeight = Math.max(500, windowHeight * 0.75);
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
      {title && (
        <div className="mb-4">
          <h3 className="text-lg sm:text-xl font-bold">{title}</h3>
        </div>
      )}
      <div
        className="w-full border border-gray-200 rounded-lg overflow-hidden"
        style={{ height: viewerHeight, minHeight: '400px', maxHeight: '90vh' }}
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
