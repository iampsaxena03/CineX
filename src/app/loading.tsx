import React from 'react';

export default function Loading() {
  return (
    <div className="page-wrapper container">
      {/* Skeleton for Header/Title */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div className="skeleton skeleton-title" style={{ width: '40%', height: '3rem', marginBottom: '1rem' }} />
        <div className="skeleton skeleton-text" style={{ width: '25%' }} />
      </div>

      {/* Skeletons for Grid Cards */}
      <div className="grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="card" style={{ border: 'none', background: 'transparent' }}>
            <div className="card-image-wrapper skeleton" style={{ borderRadius: '12px' }} />
            <div className="card-info" style={{ padding: '0.75rem 0' }}>
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
