import { useState, useEffect } from 'react'
import { supabase } from './supabase.js'
import InvitePage from './components/InvitePage.jsx'
import SetPasswordPage from './components/SetPasswordPage.jsx'
import DashboardPage from './components/DashboardPage.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'

export default function App() {
  const [appState, setAppState] = useState('loading') // loading | invite | set-password | dashboard | error
  const [session, setSession] = useState(null)
  const [inviteToken, setInviteToken] = useState(null)
  const [inviteData, setInviteData] = useState(null) // { caseId, email, role, address }
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    // Check for existing session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session)
        setAppState('dashboard')
        return
      }

      // No session — check for invite token in URL
      if (token) {
        setInviteToken(token)
        validateToken(token)
        return
      }

      // No session, no token — show error
      setErrorMsg('No invite link found. Please check your email for your portal invite.')
      setAppState('error')
    })

    // Listen for auth changes (e.g. after setting password)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session)
        setAppState('dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const validateToken = async (token) => {
    try {
      const { data, error } = await supabase
        .from('portal_invites')
        .select('case_id, email, role, expires_at, accepted_at')
        .eq('token', token)
        .single()

      if (error || !data) {
        setErrorMsg('This invite link is invalid or has expired.')
        setAppState('error')
        return
      }

      if (new Date(data.expires_at) < new Date()) {
        setErrorMsg('This invite link has expired. Please contact your agent for a new one.')
        setAppState('error')
        return
      }

      // Valid token — fetch the case address for display
      const { data: caseRow } = await supabase
        .from('cases')
        .select('data')
        .eq('id', data.case_id)
        .single()

      const caseData = caseRow?.data || {}
      const address = caseData.address ||
        [caseData.addressLine1, caseData.town, caseData.postcode].filter(Boolean).join(', ')

      setInviteData({
        caseId: data.case_id,
        email: data.email,
        role: data.role,
        address,
        token,
      })

      // If already accepted, go straight to set-password (they may be re-clicking)
      setAppState('invite')
    } catch (err) {
      setErrorMsg('Something went wrong validating your invite. Please try again.')
      setAppState('error')
    }
  }

  const handleInviteAccepted = () => {
    setAppState('set-password')
  }

  if (appState === 'loading') return <LoadingScreen />

  if (appState === 'error') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: '#1a1a2e', marginBottom: 12 }}>
          Access Required
        </div>
        <div style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6 }}>{errorMsg}</div>
      </div>
    </div>
  )

  if (appState === 'invite') return (
    <InvitePage inviteData={inviteData} onAccept={handleInviteAccepted} />
  )

  if (appState === 'set-password') return (
    <SetPasswordPage inviteData={inviteData} />
  )

  if (appState === 'dashboard') return (
    <DashboardPage session={session} />
  )

  return null
}
