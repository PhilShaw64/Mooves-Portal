import { useState } from 'react'
import { supabase } from '../supabase.js'

export default function InvitePage({ inviteData, onAccept }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAccept = async () => {
    setLoading(true)
    setError('')
    try {
      // Mark the invite as accepted
      await supabase
        .from('portal_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('token', inviteData.token)

      onAccept()
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const roleLabel = inviteData?.role === 'vendor' ? 'Vendor' : 'Buyer'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0f2952 0%, #1e3a6e 50%, #0f2952 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background texture */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <div style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.97)',
        borderRadius: 24,
        padding: '48px 40px',
        maxWidth: 460,
        width: '100%',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
      }}>
        {/* Logo mark */}
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'linear-gradient(135deg, #0f2952, #1e3a6e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 28, fontSize: 24,
        }}>🏡</div>

        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6366f1', marginBottom: 10 }}>
          You're invited
        </div>

        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 30, lineHeight: 1.2,
          color: '#0f172a', marginBottom: 8,
        }}>
          Track your property sale online
        </h1>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#f1f5f9', borderRadius: 8,
          padding: '6px 12px', marginBottom: 20,
          fontSize: 13, color: '#475569', fontWeight: 500,
        }}>
          📍 {inviteData?.address || 'Your property'}
        </div>

        <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.7, marginBottom: 28 }}>
          You've been invited as the <strong>{roleLabel}</strong> to access your personalised sale portal — see live progress, key contacts, and your sale timeline all in one place.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {['📊 Live sale progress timeline', '📋 Key milestones & next steps', '📞 Your agent & solicitor contacts'].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#374151' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f0fdf4', border: '1.5px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>✓</div>
              {item}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleAccept}
          disabled={loading}
          style={{
            width: '100%', padding: '15px 24px',
            background: loading ? '#9ca3af' : 'linear-gradient(135deg, #0f2952, #1e3a6e)',
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: loading ? 'none' : '0 4px 16px rgba(15,41,82,0.35)',
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Setting up…' : 'Access My Portal →'}
        </button>

        <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 16 }}>
          Powered by Mooves • Northwood UK
        </div>
      </div>
    </div>
  )
}
