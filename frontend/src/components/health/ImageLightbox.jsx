import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink, Loader2 } from 'lucide-react';

function isTiff(url) {
  const lower = url.toLowerCase().split('?')[0];
  return lower.endsWith('.tif') || lower.endsWith('.tiff');
}

function TiffViewer({ url }) {
  const [loading, setLoading] = useState(true);
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div className="relative w-[85vw] h-[85vh]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      )}
      <iframe
        src={viewerUrl}
        className="w-full h-full rounded shadow-2xl bg-white"
        onLoad={() => setLoading(false)}
        title="TIFF Viewer"
      />
    </div>
  );
}

export default function ImageLightbox({ images, initialIndex = 0, onClose }) {
  const [current, setCurrent] = useState(initialIndex);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrent(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setCurrent(i => Math.min(images.length - 1, i + 1));
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [images.length, onClose]);

  const currentUrl = images[current];

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center" onClick={onClose}>
      {/* Controls */}
      <div className="absolute top-4 right-4 flex gap-2 z-10" onClick={e => e.stopPropagation()}>
        <a href={currentUrl} target="_blank" rel="noreferrer"
          className="bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors" title="Open in new tab">
          <ExternalLink className="w-5 h-5" />
        </a>
        <button onClick={onClose} className="bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Prev */}
      {images.length > 1 && current > 0 && (
        <button className="absolute left-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors z-10"
          onClick={e => { e.stopPropagation(); setCurrent(i => i - 1); }}>
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Image */}
      <div className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
        {isTiff(currentUrl) ? (
          <TiffViewer key={currentUrl} url={currentUrl} />
        ) : (
          <img
            src={currentUrl}
            alt={`image-${current + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded shadow-2xl"
          />
        )}
      </div>

      {/* Next */}
      {images.length > 1 && current < images.length - 1 && (
        <button className="absolute right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors z-10"
          onClick={e => { e.stopPropagation(); setCurrent(i => i + 1); }}>
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
          {current + 1} / {images.length}
        </div>
      )}
    </div>
  );
}