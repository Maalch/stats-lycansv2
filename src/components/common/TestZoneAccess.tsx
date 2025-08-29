// Development helper component for accessing TestZone

// Use hash-based navigation directly for TestZone

export function TestZoneAccess() {
  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px', 
      zIndex: 9999,
      backgroundColor: 'rgba(0,0,0,0.7)',
      color: 'white',
      padding: '5px 10px',
      borderRadius: '5px',
      fontSize: '12px'
    }}>
      <button 
        onClick={() => { window.location.hash = '#/TestZone'; }}
        style={{
          background: 'transparent',
          border: '1px solid #666',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '3px',
          cursor: 'pointer',
          fontSize: '11px'
        }}
        title="Accès à la zone de test (développement uniquement)"
      >
        🧪 TestZone
      </button>
    </div>
  );
}
