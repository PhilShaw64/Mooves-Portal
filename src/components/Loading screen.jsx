export default function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8f7f4',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '3px solid #e5e7eb',
          borderTopColor: '#0f2952',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <div style={{ fontSize: 14, color: '#9ca3af', fontWeight: 500 }}>Loading your portal…</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
