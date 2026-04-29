'use client';

import { useEffect, useRef } from 'react';

export default function ColorExtractor({ imageUrl }: { imageUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      try {
        // Average sampling of center portion
        const startX = Math.floor(img.width * 0.2);
        const startY = Math.floor(img.height * 0.2);
        const endX = Math.floor(img.width * 0.8);
        const endY = Math.floor(img.height * 0.8);
        
        const width = endX - startX;
        const height = endY - startY;
        
        if (width <= 0 || height <= 0) return;
        
        const data = ctx.getImageData(startX, startY, width, height).data;
        
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) { 
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        // Boost vibrancy for darker images
        const max = Math.max(r, g, b);
        if (max > 0 && max < 150) {
          const factor = 180 / max;
          r = Math.min(255, Math.floor(r * factor));
          g = Math.min(255, Math.floor(g * factor));
          b = Math.min(255, Math.floor(b * factor));
        }

        // Avoid completely grayscale colors
        const diff = Math.max(Math.abs(r-g), Math.abs(g-b), Math.abs(b-r));
        if (diff < 20) {
           return; // Keep default purple if it's too gray
        }

        const rgb = `${r}, ${g}, ${b}`;
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        
        // Generate an accent that is distinctly lighter
        const ar = Math.min(255, r + 70);
        const ag = Math.min(255, g + 70);
        const ab = Math.min(255, b + 70);
        const accent = `#${ar.toString(16).padStart(2, '0')}${ag.toString(16).padStart(2, '0')}${ab.toString(16).padStart(2, '0')}`;

        document.documentElement.style.setProperty('--primary', hex);
        document.documentElement.style.setProperty('--primary-glow', `rgba(${rgb}, 0.5)`);
        document.documentElement.style.setProperty('--accent', accent);
      } catch (e) {
        console.warn('Canvas color extraction blocked or failed:', e);
      }
    };

    return () => {
      // Revert styles on unmount
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--primary-glow');
      document.documentElement.style.removeProperty('--accent');
    }
  }, [imageUrl]);

  return <canvas ref={canvasRef} style={{ display: 'none' }} />;
}
