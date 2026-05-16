export default function BackgroundGradient() {
  return (
    <div 
      style={{ 
        position: "fixed", 
        inset: 0, 
        zIndex: -100, 
        pointerEvents: "none", 
        background: "radial-gradient(ellipse at top, rgba(100,27,155,0.45) 0%, rgba(23,5,45,0.56) 32%, #020006 72%)",
      }} 
    />
  );
}
