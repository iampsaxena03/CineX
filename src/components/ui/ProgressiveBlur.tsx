import React from "react";

/**
 * Optimized ProgressiveBlur: Uses 3 distinct layers that create a 
 * smooth feathered blur at the viewport edges without GPU overload.
 */
const ProgressiveBlur = () => {
  return (
    <div className="progressive-blur-container">
      {/* Top Edge Progressive Blur */}
      <div className="progressive-blur-top">
        <div className="blur-layer layer-1" />
        <div className="blur-layer layer-2" />
        <div className="blur-layer layer-3" />
      </div>

      {/* Bottom Edge Progressive Blur */}
      <div className="progressive-blur-bottom">
        <div className="blur-layer layer-1" />
        <div className="blur-layer layer-2" />
        <div className="blur-layer layer-3" />
      </div>
    </div>
  );
};

export default ProgressiveBlur;
