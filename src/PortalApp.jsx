import { useState, useEffect } from 'react'
import { supabase } from './supabase.js'
import InvitePage from './components/InvitePage.jsx'
import SetPasswordPage from './components/SetPasswordPage.jsx'
import DashboardPage from './components/DashboardPage.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import { InstructPage } from './components/InstructPage.jsx'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getFirstName(fullName) {
  if (!fullName) return ''
  return fullName.trim().split(' ')[0]
}

function getStageLabel(caseData) {
  if (!caseData) return 'Unknown'
  if (caseData.completed) return 'Completed'
  const tasks = caseData.tasks || {}
  const stages = [
    { id: 'instruction', label: 'Instructed', tasks: ['ID to Solicitor', 'Welcome Pack Received', 'Welcome Pack Completed and Sent to Solicitor'] },
    { id: 'preExchange', label: 'Legal', tasks: ['Draft Contract to Buyers Solicitor', 'Draft Contract Received', 'Search Money Received', 'Searches Due Back', 'Searches Received', 'Searches Paid', 'Mortgage Offer Received', 'Submit Mortgage Application', 'Homebuyers Booked', 'Homebuyers Report Received', 'Enquiries Resolved'] },
    { id: 'exchange', label: 'Exchange Ready', tasks: ['Contracts Exchanged'] },
    { id: 'completion', label: 'Completion', tasks: ['Funds Received', 'Pick Up Keys'] },
  ]
  for (const stage of stages) {
    const doneCount = stage.tasks.filter(taskName => {
      const suffix = '__' + taskName
      return Object.keys(tasks).some(k => k.startsWith(stage.id + '__') && k.endsWith(suffix) && tasks[k].done)
    }).length
    if (doneCount < stage.tasks.length) return stage.label
  }
  return 'Completion'
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [showReset, setShowReset] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) {
      setError('Incorrect email or password. Please try again.')
    } else {
      onLogin(data.session)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (!email.trim()) { setError('Enter your email address first.'); return }
    setLoading(true)
    setError('')
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/?reset=1',
    })
    setLoading(false)
    setResetSent(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(150deg, #071527 0%, #0d2044 45%, #0f2952 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; }
        .login-input { width: 100%; background: rgba(255,255,255,0.07); border: 1.5px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 14px 16px; color: #fff; fontSize: 16px; fontFamily: Inter, sans-serif; outline: none; transition: border-color 0.15s; }
        .login-input::placeholder { color: rgba(255,255,255,0.3); }
        .login-input:focus { border-color: rgba(99,102,241,0.7); }
        .login-btn { width: 100%; background: #0F766E; border: none; border-radius: 12px; padding: 15px; color: #fff; fontSize: 15px; fontWeight: 700; fontFamily: Inter, sans-serif; cursor: pointer; transition: background 0.15s; }
        .login-btn:hover { background: #0d6560; }
        .login-btn:disabled { background: rgba(255,255,255,0.1); cursor: default; }
      `}</style>

      <div style={{ position: 'absolute', top: -80, right: -60, width: 340, height: 340, background: 'radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -40, width: 260, height: 260, background: 'radial-gradient(circle, rgba(15,118,110,0.15) 0%, transparent 65%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, justifyContent: 'center' }}>
          <div style={{ width: 36, height: 36, background: '#0F766E', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#fff' }}>M</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.9)', lineHeight: 1.1 }}>Mooves</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Sale Tracker</div>
          </div>
        </div>

        <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 30, color: '#fff', textAlign: 'center', marginBottom: 8 }}>
          {showReset ? 'Reset password' : 'Welcome back'}
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 32 }}>
          {showReset ? "Enter your email and we'll send a reset link." : 'Sign in to track your sale progress.'}
        </div>

        {resetSent ? (
          <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
              Check your email for a password reset link. It may take a minute to arrive.
            </div>
            <button onClick={() => { setShowReset(false); setResetSent(false) }} style={{ marginTop: 14, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={showReset ? handleReset : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              className="login-input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              style={{ fontSize: 16 }}
            />
            {!showReset && (
              <input
                className="login-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ fontSize: 16 }}
              />
            )}

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? 'Please wait…' : showReset ? 'Send reset link' : 'Sign in'}
            </button>

            <button
              type="button"
              onClick={() => { setShowReset(!showReset); setError('') }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', textAlign: 'center', padding: '4px 0' }}
            >
              {showReset ? '← Back to sign in' : 'Forgot your password?'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function CasePickerPage({ session, onSelectCase }) {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [branchNames, setBranchNames] = useState({})

  useEffect(() => { loadCases() }, [session])

  const loadCases = async () => {
    try {
      const email = session.user.email
      const { data: allData } = await supabase.from('cases').select('id, data')
      const matched = (allData || []).filter(row => {
        const d = row.data || {}
        return (d.vendor && d.vendor.email === email) || (d.buyer && d.buyer.email === email)
      })
      setCases(matched)
      const branchIds = [...new Set(matched.map(r => r.data && r.data.branch_id).filter(Boolean))]
      if (branchIds.length > 0) {
        const { data: branches } = await supabase.from('branches').select('id, name').in('id', branchIds)
        const map = {}
        ;(branches || []).forEach(b => { map[b.id] = b.name })
        setBranchNames(map)
      }
    } catch (err) {
      console.error('Error loading cases:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const vendorName = session.user.user_metadata && session.user.user_metadata.vendor_name
  const firstName = getFirstName(vendorName || session.user.email)
  const greeting = getGreeting()

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#0f2952', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 14, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>Loading your sales...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
        .case-card { background: #fff; border-radius: 16px; border: 1.5px solid #e5e7eb; padding: 20px; cursor: pointer; transition: all 0.15s; }
        .case-card:hover { border-color: #a5b4fc; box-shadow: 0 4px 20px rgba(99,102,241,0.1); transform: translateY(-1px); }
        .case-card:active { transform: translateY(0); }
      `}</style>

      <div style={{ background: 'linear-gradient(150deg, #071527 0%, #0d2044 45%, #0f2952 100%)', padding: '20px 20px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -60, width: 280, height: 280, background: 'radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 30, height: 30, background: '#0F766E', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff', flexShrink: 0 }}>M</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.1 }}>Northwood</div>
                <div style={{ fontWeight: 400, fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Sale Tracker</div>
              </div>
            </div>
            <button onClick={handleSignOut} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 14px', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>Sign out</button>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '5px 12px 5px 9px', marginBottom: 14 }}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>👋</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.65)' }}>{greeting}{firstName ? `, ${firstName}` : ''}</span>
          </div>
          <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 26, color: '#fff', lineHeight: 1.2, marginBottom: 6 }}>Your Properties</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
            {cases.length === 1 ? 'You have 1 active sale being tracked.' : `You have ${cases.length} sales being tracked. Select one to view progress.`}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
        {cases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏡</div>
            <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 20, color: '#1e293b', marginBottom: 8 }}>No cases found</div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>We could not find any cases linked to your email address. Please contact your agent.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cases.map(row => {
              const d = row.data || {}
              const address = d.address || [d.addressLine1, d.town, d.postcode].filter(Boolean).join(', ') || 'Unknown address'
              const email = session.user.email
              const isVendor = d.vendor && d.vendor.email === email
              const role = isVendor ? 'Sale' : 'Purchase'
              const roleColor = isVendor ? '#0f2952' : '#0f766e'
              const roleBg = isVendor ? '#eef2ff' : '#f0fdf4'
              const stage = getStageLabel(d)
              const isCompleted = d.completed
              const branchName = (d.branch_id && branchNames[d.branch_id]) || 'Northwood'
              return (
                <div key={row.id} className="case-card" onClick={() => onSelectCase(row.id, d)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', lineHeight: 1.3, marginBottom: 4 }}>{address}</div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>{branchName}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: roleColor, background: roleBg, borderRadius: 20, padding: '3px 10px' }}>{role}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: isCompleted ? '#22c55e' : '#818cf8', boxShadow: '0 0 5px ' + (isCompleted ? 'rgba(34,197,94,0.6)' : 'rgba(129,140,248,0.6)'), flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{stage}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#6366f1' }}>View &rarr;</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [appState, setAppState] = useState('loading')
  const [session, setSession] = useState(null)
  const [inviteToken, setInviteToken] = useState(null)
  const [inviteData, setInviteData] = useState(null)
  const [instructToken, setInstructToken] = useState(null)
  const [selectedCaseId, setSelectedCaseId] = useState(null)
  const [allCases, setAllCases] = useState([])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    // Detect instruct URL: /instruct/:token or ?instruct=token
    const pathMatch = window.location.pathname.match(/^\/instruct\/([a-zA-Z0-9_-]+)$/)
    const instructTok = pathMatch?.[1] || params.get('instruct')
    if (instructTok) {
      setInstructToken(instructTok)
      setAppState('instruct')
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session)
        checkCases(session)
        return
      }
      if (token) {
        setInviteToken(token)
        validateToken(token)
        return
      }
      setAppState('login')
    }).catch(() => {
      setAppState('login')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session)
        checkCases(session)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const checkCases = async (session) => {
    try {
      const email = session.user.email
      const { data: allData } = await supabase.from('cases').select('id, data')
      const matched = (allData || []).filter(row => {
        const d = row.data || {}
        return (d.vendor && d.vendor.email === email) || (d.buyer && d.buyer.email === email)
      })
      setAllCases(matched)
      if (matched.length === 1) {
        setSelectedCaseId(matched[0].id)
        setAppState('dashboard')
      } else if (matched.length > 1) {
        setAppState('case-picker')
      } else {
        setSelectedCaseId(session.user.user_metadata && session.user.user_metadata.case_id)
        setAppState('dashboard')
      }
    } catch (err) {
      setSelectedCaseId(session.user.user_metadata && session.user.user_metadata.case_id)
      setAppState('dashboard')
    }
  }

  const validateToken = async (token) => {
    try {
      const { data, error } = await supabase
        .from('portal_invites')
        .select('case_id, email, role, expires_at, accepted_at')
        .eq('token', token)
        .single()
      if (error || !data) { setAppState('login'); return }
      if (new Date(data.expires_at) < new Date()) { setAppState('login'); return }
      const { data: caseRow } = await supabase.from('cases').select('data').eq('id', data.case_id).single()
      const caseData = caseRow?.data || {}
      const address = caseData.address || [caseData.addressLine1, caseData.town, caseData.postcode].filter(Boolean).join(', ')
      setInviteData({ caseId: data.case_id, email: data.email, role: data.role, address, token })
      setAppState('invite')
    } catch (err) {
      setAppState('login')
    }
  }

  const handleInviteAccepted = () => setAppState('set-password')
  const handleSelectCase = (caseId) => { setSelectedCaseId(caseId); setAppState('dashboard') }
  const handleBackToPicker = () => setAppState('case-picker')
  const handleLogin = (session) => { setSession(session); checkCases(session) }

  if (appState === 'loading') return <LoadingScreen />
  if (appState === 'login') return <LoginPage onLogin={handleLogin} />
  if (appState === 'invite') return <InvitePage inviteData={inviteData} onAccept={handleInviteAccepted} />
  if (appState === 'set-password') return <SetPasswordPage inviteData={inviteData} />
  if (appState === 'instruct') return <InstructPage token={instructToken} />
  if (appState === 'case-picker') return <CasePickerPage session={session} onSelectCase={handleSelectCase} />
  if (appState === 'dashboard') return (
    <DashboardPage
      session={session}
      caseId={selectedCaseId}
      showBack={allCases.length > 1}
      onBack={handleBackToPicker}
    />
  )
  return null
}
