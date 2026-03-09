import { useState } from 'react'
import { supabase } from '../supabase.js'

export default function SetPasswordPage({ inviteData }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      // Sign up the user with their invite email
      const { error: signUpError } = await supabase.auth.signUp({
        email: inviteData.email,
        password,
        options: {
          data: {
            source: 'portal',
            role: 'client',
            case_id: inviteData.caseId,
            portal_role: inviteData.role, // 'vendor' or 'buyer'
          }
        }
      })

      if (signUpError) {
        // If they already have an account, sign them in instead
        if (signUpError.message.includes('already registered')) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: inviteData.email,
            password,
          })
          if (signInError) throw signInError
        } else {
          throw signUpError
        }
      }
      // Auth state change in App.jsx will handle redirect to dashboard
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '13px 16px',
    border: '2px solid #e5e7eb', borderRadius: 10,
    fontSize: 15, fontFamily: "'DM Sans', sans-serif",
    color: '#1a1a2e', outline: 'none', background: '#fff',
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0f2952 0%, #1e3a6e 50%, #0f2952 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.97)',
        borderRadius: 24, padding: '48px 40px',
        maxWidth: 420, width: '100%',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
      }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #0f2952, #1e3a6e)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, fontSize: 24 }}>🔑</div>

        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6366f1', marginBottom: 10 }}>
          Almost there
        </div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: '#0f172a', marginBottom: 8 }}>
          Create your password
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28, lineHeight: 1.6 }}>
          Set a password for <strong>{inviteData?.email}</strong> to access your portal.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !password || !confirm}
          style={{
            width: '100%', padding: '15px 24px',
            background: (loading || !password || !confirm) ? '#9ca3af' : 'linear-gradient(135deg, #0f2952, #1e3a6e)',
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 16, fontWeight: 700,
            cursor: (loading || !password || !confirm) ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: (loading || !password || !confirm) ? 'none' : '0 4px 16px rgba(15,41,82,0.35)',
          }}
        >
          {loading ? 'Creating account…' : 'Enter My Portal →'}
        </button>
      </div>
    </div>
  )
}
