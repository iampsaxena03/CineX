'use client';

import { useEffect, useState } from 'react';

const gradients = [
  // 1. Current (Purple)
  "radial-gradient(ellipse at top, #6c1b9b 0%, #1c0436 40%, #04010a 100%)",
  // 2. Cosmic Blue
  "radial-gradient(ellipse at top, #1b3b9b 0%, #041236 40%, #04010a 100%)",
  // 3. Emerald Dark
  "radial-gradient(ellipse at top, #0f5c35 0%, #042416 40%, #04010a 100%)",
  // 4. Crimson Night
  "radial-gradient(ellipse at top, #8a131c 0%, #2e0508 40%, #04010a 100%)",
  // 5. Deep Teal
  "radial-gradient(ellipse at top, #146b6e 0%, #042b2e 40%, #04010a 100%)",
  // 6. Midnight Violet
  "radial-gradient(ellipse at top, #48148c 0%, #180533 40%, #04010a 100%)",
  // 7. Sunset Orange Dark
  "radial-gradient(ellipse at top, #8c4114 0%, #301303 40%, #04010a 100%)",
  // 8. Galactic Magenta
  "radial-gradient(ellipse at top, #8c146e 0%, #2e0524 40%, #04010a 100%)",
  // 9. Abyssal Blue
  "radial-gradient(ellipse at top, #122147 0%, #050b1a 40%, #04010a 100%)",
  // 10. Phantom Green
  "radial-gradient(ellipse at top, #184712 0%, #071705 40%, #04010a 100%)",
];

export default function BackgroundGradient() {
  const [gradient, setGradient] = useState(gradients[0]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateGradient = () => {
      // Calculate an index that changes every 8 hours
      // 8 hours = 8 * 60 * 60 * 1000 = 28800000 ms
      const epoch8Hour = Math.floor(Date.now() / 28800000);
      
      // We want to use epoch8Hour as a pseudo-random seed so it feels randomized
      // but stays consistent for the 8 hour period across all tabs
      // A simple hash function
      let hash = 0;
      const str = epoch8Hour.toString();
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash = hash & hash;
      }
      
      const index = Math.abs(hash) % gradients.length;
      setGradient(gradients[index]);
    };

    updateGradient();
    
    // Check every minute if the 8-hour window has rolled over
    const interval = setInterval(updateGradient, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    // Return a default background during SSR to prevent hydration mismatch,
    // we use the current one as fallback
    return (
      <div 
        style={{ 
          position: "fixed", 
          inset: 0, 
          zIndex: 0, 
          pointerEvents: "none", 
          background: gradients[0]
        }} 
      />
    );
  }

  return (
    <div 
      style={{ 
        position: "fixed", 
        inset: 0, 
        zIndex: 0, 
        pointerEvents: "none", 
        background: gradient,
        transition: "background 2s ease-in-out" 
      }} 
    />
  );
}
