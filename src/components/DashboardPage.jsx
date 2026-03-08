import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

const STAGES = [
  { id: 'instruction', label: 'Instructed',     icon: '📋' },
  { id: 'preExchange', label: 'Legal',           icon: '⚖️' },
  { id: 'exchange',    label: 'Exchange Ready',  icon: '🤝' },
  { id: 'completion',  label: 'Completion',      icon: '🏡' },
]

// Which tasks are visible to clients (plain English, non-internal)
const CLIENT_VISIBLE_TASKS = {
  instruction: [
    'ID to Solicitor', 'Welcome Pack Received', 'Welcome Pack Completed and Sent to Solicitor',
  ],
  preExchange: [
    'Draft Contract to Buyers Solicitor', 'Draft Contract Received',
    'Search Money Received', 'Searches Due Back', 'Searches Received', 'Searches Paid',
    'Mortgage Offer Received', 'Submit Mortgage Application',
    'Homebuyers Booked', 'Homebuyers Report Received',
    'Enquiries Resolved',
  ],
  exchange: [
    'Contracts Exchanged',
  ],
  completion: [
    'Funds Received', 'Pick Up Keys',
  ],
}

const CLIENT_TASK_LABELS = {
  'ID to Solicitor':                                  'ID verified & sent to solicitor',
  'Welcome Pack Received':                            'Welcome pack received',
  'Welcome Pack Completed and Sent to Solicitor':     'Welcome pack sent to solicitor',
  'Draft Contract to Buyers Solicitor':               'Draft contracts sent',
  'Draft Contract Received':                          'Draft contracts received',
  'Search Money Received':                            'Search fees received',
  'Searches Due Back':                                'Searches ordered',
  'Searches Received':                                'Searches received',
  'Searches Paid':                                    'Searches ordered',
  'Mortgage Offer Received':                          'Mortgage offer received 🎉',
  'Submit Mortgage Application':                      'Mortgage application submitted',
  'Homebuyers Booked':                                'Survey booked',
  'Homebuyers Report Received':                       'Survey report received',
  'Enquiries Resolved':                               'Legal enquiries resolved',
  'Contracts Exchanged':                              'Contracts exchanged 🎉',
  'Funds Received':                                   'Completion funds received',
  'Pick Up Keys':                                     'Keys collected',
}

function fmt(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getStageStatus(tasks, stageId) {
  const visibleTasks = CLIENT_VISIBLE_TASKS[stageId] || []
  const done = visibleTasks.filter(t => {
    const key = Object.keys(tasks || {}).find(k => k.includes(stageId) && k.includes(t.replace(/ /g, '_')) || k.includes(stageId) && k.endsWith('__' + t))
    return key && tasks[key]?.done
  })
  if (done.length === visibleTasks.length && visibleTasks.length > 0) return 'complete'
  if (done.length > 0) return 'active'
  return 'pending'
}

function getTaskDone(tasks, stageId, taskName) {
  if (!tasks) return { done: false, date: null }
  const key = Object.keys(tasks).find(k => k.startsWith(stageId + '__') && k.endsWith('__' + taskName))
  if (!key) return { done: false, date: null }
  return { done: tasks[key]?.done || false, date: tasks[key]?.date || null }
}

function getCurrentStageIndex(tasks, caseData) {
  if (caseData.completed) return 4
  for (let i = STAGES.length - 1; i >= 0; i--) {
    const status = getStageStatus(tasks, STAGES[i].id)
    if (status === 'active' || status === 'complete') return i
  }
  return 0
}

export default function DashboardPage({ session }) {
  const [caseData, setCaseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState('progress') // progress | contacts

  useEffect(() => {
    loadCaseData()
  }, [session])

  const loadCaseData = async () => {
    try {
      const userId = session.user.id
      const caseId = session.user.user_metadata?.case_id

      if (!caseId) {
        setError('No case linked to your account. Please contact your agent.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('cases')
        .select('data')
        .eq('id', caseId)
        .single()

      if (error || !data) throw new Error('Case not found')
      setCaseData(data.data)
    } catch (err) {
      setError('Unable to load your sale details. Please try refreshing.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#0f2952', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 14, color: '#9ca3af' }}>Loading your sale…</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#0f172a', marginBottom: 8 }}>Something went wrong</div>
        <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>{error}</div>
      </div>
    </div>
  )

  const tasks = caseData?.tasks || {}
  const address = caseData?.address || [caseData?.addressLine1, caseData?.town, caseData?.postcode].filter(Boolean).join(', ')
  const currentStageIdx = getCurrentStageIndex(tasks, caseData)
  const isCompleted = caseData?.completed
  const confirmedDate = caseData?.confirmedCompletionDate
  const exchangeDate = Object.entries(tasks).find(([k, v]) => k.includes('Contracts_Exchanged') || k.includes('Contracts Exchanged') ? v?.done && v?.date : false)?.[1]?.date

  // Contacts
  const agencyName = caseData?.agencyName || 'Northwood'
  const agencyPhone = caseData?.agencyPhone || ''
  const agencyEmail = caseData?.agencyEmail || ''
  const vSol = caseData?.vendorSolicitor
  const pSol = caseData?.purchaserSolicitor

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f2952 0%, #1e3a6e 100%)', padding: '24px 20px 20px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#93c5fd', marginBottom: 4 }}>
                {agencyName}
              </div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#fff', lineHeight: 1.3 }}>
                {address || 'Your Property'}
              </div>
            </div>
            <button onClick={handleSignOut} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#93c5fd', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0, marginLeft: 12 }}>
              Sign out
            </button>
          </div>

          {/* Status pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: isCompleted ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)', borderRadius: 20, padding: '5px 12px', border: `1px solid ${isCompleted ? 'rgba(34,197,94,0.4)' : 'rgba(99,102,241,0.4)'}` }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: isCompleted ? '#22c55e' : '#818cf8', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: isCompleted ? '#86efac' : '#c7d2fe' }}>
              {isCompleted ? '✓ Sale Completed' : `Stage ${currentStageIdx + 1} of ${STAGES.length} — ${STAGES[currentStageIdx]?.label}`}
            </span>
          </div>

          {confirmedDate && (
            <div style={{ marginTop: 8, fontSize: 13, color: '#bfdbfe' }}>
              {isCompleted ? `Completed ${fmt(confirmedDate)}` : `Completion date: ${fmt(confirmedDate)}`}
            </div>
          )}
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex' }}>
          {[{ id: 'progress', label: '📊 Progress' }, { id: 'contacts', label: '📞 Contacts' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveSection(tab.id)} style={{
              flex: 1, padding: '14px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
              color: activeSection === tab.id ? '#0f2952' : '#9ca3af',
              borderBottom: `2px solid ${activeSection === tab.id ? '#0f2952' : 'transparent'}`,
              transition: 'all 0.15s',
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>

        {/* PROGRESS TAB */}
        {activeSection === 'progress' && (
          <div>
            {/* Stage progress overview */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 28, overflowX: 'auto', paddingBottom: 4 }}>
              {STAGES.map((stage, i) => {
                const status = isCompleted ? 'complete' : i < currentStageIdx ? 'complete' : i === currentStageIdx ? 'active' : 'pending'
                return (
                  <div key={stage.id} style={{
                    flex: '1 0 80px', textAlign: 'center', padding: '12px 8px',
                    background: status === 'complete' ? '#f0fdf4' : status === 'active' ? '#eef2ff' : '#fff',
                    border: `1.5px solid ${status === 'complete' ? '#86efac' : status === 'active' ? '#a5b4fc' : '#e5e7eb'}`,
                    borderRadius: 12,
                  }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>
                      {status === 'complete' ? '✅' : stage.icon}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: status === 'pending' ? '#9ca3af' : '#1e293b', lineHeight: 1.3 }}>
                      {stage.label}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Key dates */}
            {(caseData?.instructionDate || exchangeDate || confirmedDate) && (
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 14 }}>Key Dates</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {caseData?.instructionDate && <DateRow label="Instructed" date={caseData.instructionDate} color="#f59e0b" />}
                  {exchangeDate && <DateRow label="Exchanged" date={exchangeDate} color="#38bdf8" />}
                  {confirmedDate && <DateRow label={isCompleted ? 'Completed' : 'Completion date'} date={confirmedDate} color={isCompleted ? '#22c55e' : '#6366f1'} />}
                </div>
              </div>
            )}

            {/* Stage detail cards */}
            {STAGES.map((stage, i) => {
              const stageStatus = isCompleted ? 'complete' : i < currentStageIdx ? 'complete' : i === currentStageIdx ? 'active' : 'pending'
              const visibleTasks = CLIENT_VISIBLE_TASKS[stage.id] || []

              return (
                <div key={stage.id} style={{
                  background: '#fff', borderRadius: 14,
                  border: `1.5px solid ${stageStatus === 'active' ? '#a5b4fc' : '#e5e7eb'}`,
                  marginBottom: 12, overflow: 'hidden',
                  opacity: stageStatus === 'pending' ? 0.6 : 1,
                }}>
                  <div style={{
                    padding: '14px 18px',
                    background: stageStatus === 'complete' ? '#f0fdf4' : stageStatus === 'active' ? '#eef2ff' : '#f9fafb',
                    display: 'flex', alignItems: 'center', gap: 10,
                    borderBottom: visibleTasks.length ? '1px solid #f1f5f9' : 'none',
                  }}>
                    <span style={{ fontSize: 18 }}>{stageStatus === 'complete' ? '✅' : stage.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{stage.label}</div>
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                      background: stageStatus === 'complete' ? '#dcfce7' : stageStatus === 'active' ? '#e0e7ff' : '#f1f5f9',
                      color: stageStatus === 'complete' ? '#16a34a' : stageStatus === 'active' ? '#4338ca' : '#9ca3af',
                    }}>
                      {stageStatus === 'complete' ? 'Complete' : stageStatus === 'active' ? 'In progress' : 'Upcoming'}
                    </div>
                  </div>

                  {visibleTasks.length > 0 && (
                    <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {visibleTasks.map(taskName => {
                        const { done, date } = getTaskDone(tasks, stage.id, taskName)
                        return (
                          <div key={taskName} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                              background: done ? '#dcfce7' : '#f1f5f9',
                              border: `1.5px solid ${done ? '#86efac' : '#d1d5db'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, color: done ? '#16a34a' : '#9ca3af',
                            }}>
                              {done ? '✓' : ''}
                            </div>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 13, color: done ? '#374151' : '#9ca3af', fontWeight: done ? 500 : 400 }}>
                                {CLIENT_TASK_LABELS[taskName] || taskName}
                              </span>
                              {done && date && (
                                <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>{fmt(date)}</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* CONTACTS TAB */}
        {activeSection === 'contacts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ContactCard
              label="Your Agent"
              name={agencyName}
              phone={agencyPhone}
              email={agencyEmail}
              icon="🏢"
              color="#0f2952"
            />
            {vSol?.firm && (
              <ContactCard
                label="Vendor's Solicitor"
                name={vSol.contact || vSol.firm}
                firm={vSol.contact ? vSol.firm : null}
                phone={vSol.phone}
                email={vSol.email}
                icon="⚖️"
                color="#0f766e"
              />
            )}
            {pSol?.firm && (
              <ContactCard
                label="Buyer's Solicitor"
                name={pSol.contact || pSol.firm}
                firm={pSol.contact ? pSol.firm : null}
                phone={pSol.phone}
                email={pSol.email}
                icon="⚖️"
                color="#1e40af"
              />
            )}
          </div>
        )}

      </div>
    </div>
  )
}

function DateRow({ label, date, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 14, color: '#374151' }}>{label}</span>
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{
        (() => {
          if (!date) return ''
          const d = new Date(date)
          return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        })()
      }</span>
    </div>
  )
}

function ContactCard({ label, name, firm, phone, email, icon, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ background: color, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      </div>
      <div style={{ padding: '16px 18px' }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: firm ? 2 : 10 }}>{name}</div>
        {firm && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>{firm}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {phone && (
            <a href={`tel:${phone}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#0f2952', textDecoration: 'none', fontWeight: 500 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📞</span>
              {phone}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#0f2952', textDecoration: 'none', fontWeight: 500 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✉️</span>
              {email}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
