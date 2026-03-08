import { useState, useEffect } from 'react'
import { supabase } from './supabase.js'
import InvitePage from './components/InvitePage.jsx'
import SetPasswordPage from './components/SetPasswordPage.jsx'
import DashboardPage from './components/DashboardPage.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'

export default function App() {
  const [appState, setAppState] = useState('loading')
  const [session, setSession] = useState(null)
  const [inviteToken, setInviteToken] = useState(null)
  const [inviteData, setInviteData] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [logs, setLogs] = useState([])

  const log = (msg) => {
    console.log(msg)
    setLogs(prev => [...prev, `${new Date().toISOString().slice(11,19)} ${msg}`])
  }

  useEffect(() => {
    log('App started')
    log(`SUPABASE_URL: ${import.meta.env.VITE_SUPABASE_URL ? 'set' : 'MISSING'}`)
    log(`SUPABASE_KEY: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? 'set' : 'MISSING'}`)

    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    log(`Token in URL: ${token ? token.slice(0, 10) + '...' : 'none'}`)

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) { log(`getSession error: ${error.message}`); }
      log(`Session: ${session ? 'exists' : 'none'}`)

      if (session) {
        setSession(session)
        setAppState('dashboard')
        return
      }

      if (token) {
        setInviteToken(token)
        validateToken(token)
        return
      }

      setErrorMsg('No invite link found. Please check your email for your portal invite.')
      setAppState('error')
    }).catch(err => {
      log(`getSession threw: ${err.message}`)
      setErrorMsg('Failed to initialise. Please try again.')
      setAppState('error')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      log(`Auth change: ${_event}`)
      if (session) {
        setSession(session)
        setAppState('dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const validateToken = async (token) => {
    log('Validating token...')
    try {
      const { data, error } = await supabase
        .from('portal_invites')
        .select('case_id, email, role, expires_at, accepted_at')
        .eq('token', token)
        .single()

      if (error) { log(`portal_invites error: ${error.message}`); }
      log(`Invite data: ${data ? 'found' : 'not found'}`)

      if (error || !data) {
        setErrorMsg('This invite link is invalid or has expired.')
        setAppState('error')
        return
      }

      if (new Date(data.expires_at) < new Date()) {
        log('Token expired')
        setErrorMsg('This invite link has expired. Please contact your agent for a new one.')
        setAppState('error')
        return
      }

      log(`Fetching case: ${data.case_id}`)
      const { data: caseRow, error: caseErr } = await supabase
        .from('cases')
        .select('data')
        .eq('id', data.case_id)
        .single()

      if (caseErr) log(`cases error: ${caseErr.message}`)
      log(`Case row: ${caseRow ? 'found' : 'not found'}`)

      const caseData = caseRow?.data || {}
      const address = caseData.address ||
        [caseData.addressLine1, caseData.town, caseData.postcode].filter(Boolean).join(', ')

      setInviteData({ caseId: data.case_id, email: data.email, role: data.role, address, token })
      setAppState('invite')
    } catch (err) {
      log(`validateToken threw: ${err.message}`)
      setErrorMsg('Something went wrong validating your invite. Please try again.')
      setAppState('error')
    }
  }

  const handleInviteAccepted = () => setAppState('set-password')

  const DebugPanel = () => (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: '#0f172a', color: '#86efac', fontFamily: 'monospace',
      fontSize: 11, padding: '8px 12px', maxHeight: 180, overflowY: 'auto',
      borderTop: '2px solid #1e293b',
    }}>
      <div style={{ color: '#64748b', marginBottom: 4, fontSize: 10 }}>DEBUG LOG</div>
      {logs.map((l, i) => <div key={i}>{l}</div>)}
      {logs.length === 0 && <div style={{ color: '#475569' }}>No logs yet...</div>}
    </div>
  )

  if (appState === 'loading') return <><LoadingScreen /><DebugPanel /></>

  if (appState === 'error') return (
    <>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, paddingBottom: 200 }}>
        <div style={{ maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: '#1a1a2e', marginBottom: 12 }}>Access Required</div>
          <div style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6 }}>{errorMsg}</div>
        </div>
      </div>
      <DebugPanel />
    </>
  )

  if (appState === 'invite') return <><InvitePage inviteData={inviteData} onAccept={handleInviteAccepted} /><DebugPanel /></>
  if (appState === 'set-password') return <><SetPasswordPage inviteData={inviteData} /><DebugPanel /></>
  if (appState === 'dashboard') return <><DashboardPage session={session} /><DebugPanel /></>

  return <DebugPanel />
}
