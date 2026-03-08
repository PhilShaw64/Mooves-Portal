import { useState, useEffect } from "react"
import React from "react"
import { supabase } from "../supabase.js"
import MessagesDrawer from "./MessagesDrawer.jsx"

const STAGES = [
  { id: "instruction", label: "Instructed",    icon: "📋" },
  { id: "preExchange", label: "Legal",          icon: "⚖️" },
  { id: "exchange",    label: "Exchange Ready", icon: "🤝" },
  { id: "completion",  label: "Completion",     icon: "🏡" },
]

const CLIENT_VISIBLE_TASKS = {
  instruction: [
    "ID to Solicitor", "Welcome Pack Received", "Welcome Pack Completed and Sent to Solicitor",
  ],
  preExchange: [
    "Draft Contract to Buyers Solicitor", "Draft Contract Received",
    "Search Money Received", "Searches Due Back", "Searches Received", "Searches Paid",
    "Mortgage Offer Received", "Submit Mortgage Application",
    "Homebuyers Booked", "Homebuyers Report Received",
    "Enquiries Resolved",
  ],
  exchange: [
    "Contracts Exchanged",
  ],
  completion: [
    "Funds Received", "Pick Up Keys",
  ],
}

const CLIENT_TASK_LABELS = {
  "ID to Solicitor":                                 "ID verified & sent to solicitor",
  "Welcome Pack Received":                           "Welcome pack received",
  "Welcome Pack Completed and Sent to Solicitor":    "Welcome pack sent to solicitor",
  "Draft Contract to Buyers Solicitor":              "Draft contracts sent",
  "Draft Contract Received":                         "Draft contracts received",
  "Search Money Received":                           "Search fees received",
  "Searches Due Back":                               "Searches ordered",
  "Searches Received":                               "Searches received",
  "Searches Paid":                                   "Searches ordered",
  "Mortgage Offer Received":                         "Mortgage offer received",
  "Submit Mortgage Application":                     "Mortgage application submitted",
  "Homebuyers Booked":                               "Survey booked",
  "Homebuyers Report Received":                      "Survey report received",
  "Enquiries Resolved":                              "Legal enquiries resolved",
  "Contracts Exchanged":                             "Contracts exchanged",
  "Funds Received":                                  "Completion funds received",
  "Pick Up Keys":                                    "Keys collected",
}

function fmt(dateStr) {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function getFirstName(fullName) {
  if (!fullName) return ""
  return fullName.trim().split(" ")[0]
}

function getBrand(branchName) {
  if (!branchName) return "Northwood"
  if (branchName === "UrbanBase" || branchName === "Urban Base" || branchName === "New Homes") return "Urban Base"
  return "Northwood"
}

function getTaskDone(tasks, stageId, taskName) {
  if (!tasks) return { done: false, date: null }
  const prefix = stageId + "__"
  const suffix = "__" + taskName
  const match = Object.keys(tasks).find(function(k) {
    return k.startsWith(prefix) && k.endsWith(suffix)
  })
  if (match) return { done: tasks[match].done || false, date: tasks[match].date || null }
  return { done: false, date: null }
}

function getStageStatus(tasks, stageId) {
  const visibleTasks = CLIENT_VISIBLE_TASKS[stageId] || []
  if (visibleTasks.length === 0) return "pending"
  const doneCount = visibleTasks.filter(function(t) { return getTaskDone(tasks, stageId, t).done }).length
  if (doneCount === visibleTasks.length) return "complete"
  if (doneCount > 0) return "active"
  return "pending"
}

function getCurrentStageIndex(tasks, caseData) {
  if (caseData && caseData.completed) return 4
  for (let i = 0; i < STAGES.length; i++) {
    const status = getStageStatus(tasks, STAGES[i].id)
    if (status !== "complete") return i
  }
  return STAGES.length - 1
}

// Determine if the logged-in email matches vendor or buyer on a case
function detectContactRole(caseData, userEmail) {
  if (!caseData || !userEmail) return "vendor"
  const email = userEmail.toLowerCase()
  const vendorEmail = (caseData.vendor && caseData.vendor.email) || caseData.vendorEmail || ""
  const buyerEmail  = (caseData.buyer  && caseData.buyer.email)  || (caseData.purchaser && caseData.purchaser.email) || caseData.buyerEmail || ""
  if (buyerEmail && buyerEmail.toLowerCase() === email) return "buyer"
  return "vendor" // default — vendor is primary contact
}

export default function DashboardPage({ session, caseId: propCaseId, showBack, onBack }) {
  const [allCases, setAllCases] = useState([])
  const [selectedCaseId, setSelectedCaseId] = useState(null)
  const [caseData, setCaseData] = useState(null)
  const [contactRole, setContactRole] = useState("vendor") // "vendor" | "buyer"
  const [branchData, setBranchData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeSection, setActiveSection] = useState("progress")
  const [showPicker, setShowPicker] = useState(false)
  const [showMessages, setShowMessages] = useState(false)

  useEffect(function() { loadAllCases() }, [session])

  const loadAllCases = async function() {
    try {
      const userEmail = session.user.email
      const metaCaseId = session.user.user_metadata && session.user.user_metadata.case_id

      // Search both vendor and buyer email fields
      const [vendorResult, buyerResult] = await Promise.all([
        supabase.from("cases").select("id, data").filter("data->vendor->>email", "eq", userEmail),
        supabase.from("cases").select("id, data").filter("data->buyer->>email",  "eq", userEmail),
      ])

      // Merge, deduplicate by id
      const seen = new Set()
      let cases = []
      for (const row of [...(vendorResult.data || []), ...(buyerResult.data || [])]) {
        if (!seen.has(row.id)) { seen.add(row.id); cases.push({ id: row.id, data: row.data }) }
      }

      // Fallback: case from user_metadata
      if (metaCaseId && !cases.find(function(c) { return String(c.id) === String(metaCaseId) })) {
        const fallback = await supabase.from("cases").select("id, data").eq("id", metaCaseId).single()
        if (fallback.data) cases = [{ id: fallback.data.id, data: fallback.data.data }].concat(cases)
      }

      if (cases.length === 0) {
        setError("No cases linked to your account. Please contact your agent.")
        setLoading(false)
        return
      }

      setAllCases(cases)

      if (cases.length === 1) {
        await loadCaseById(cases[0].id, cases[0].data)
      } else {
        setShowPicker(true)
        setLoading(false)
      }
    } catch (err) {
      setError("Unable to load your sale details. Please try refreshing.")
      setLoading(false)
    }
  }

  const loadCaseById = async function(id, data) {
    setLoading(true)
    try {
      let cData = data
      if (!cData) {
        const result = await supabase.from("cases").select("data").eq("id", id).single()
        if (result.error || !result.data) throw new Error("Case not found")
        cData = result.data.data
      }
      const role = detectContactRole(cData, session.user.email)
      setCaseData(cData)
      setContactRole(role)
      setSelectedCaseId(id)
      setShowPicker(false)
      if (cData && cData.branch_id) {
        const branchResult = await supabase.from("branches").select("name, address, phone, email").eq("id", cData.branch_id).single()
        if (branchResult.data) setBranchData(branchResult.data)
      }
    } catch (err) {
      setError("Unable to load case details. Please try refreshing.")
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async function() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const handleBackToPicker = function() {
    setCaseData(null)
    setBranchData(null)
    setSelectedCaseId(null)
    setContactRole("vendor")
    setShowPicker(true)
  }

  if (loading) return (
    React.createElement("div", { style: { minHeight: "100vh", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" } },
      React.createElement("div", { style: { textAlign: "center" } },
        React.createElement("style", null, "@keyframes spin { to { transform: rotate(360deg); } }"),
        React.createElement("div", { style: { width: 40, height: 40, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#0f2952", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" } }),
        React.createElement("div", { style: { fontSize: 14, color: "#9ca3af", fontFamily: "Inter, sans-serif" } }, "Loading your sale…")
      )
    )
  )

  if (error) return (
    React.createElement("div", { style: { minHeight: "100vh", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 } },
      React.createElement("div", { style: { textAlign: "center", maxWidth: 360 } },
        React.createElement("div", { style: { fontSize: 40, marginBottom: 12 } }, "⚠️"),
        React.createElement("div", { style: { fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#0f172a", marginBottom: 8 } }, "Something went wrong"),
        React.createElement("div", { style: { fontSize: 14, color: "#6b7280", lineHeight: 1.6 } }, error)
      )
    )
  )

  if (showPicker) return React.createElement(CasePicker, { cases: allCases, onSelect: loadCaseById, onSignOut: handleSignOut, session: session })

  const tasks = (caseData && caseData.tasks) || {}
  const address = (caseData && caseData.address) || [caseData && caseData.addressLine1, caseData && caseData.town, caseData && caseData.postcode].filter(Boolean).join(", ")
  const currentStageIdx = getCurrentStageIndex(tasks, caseData)
  const isCompleted = caseData && caseData.completed
  const confirmedDate = caseData && caseData.confirmedCompletionDate
  const exchangeEntry = Object.entries(tasks).find(function(entry) {
    return entry[0].endsWith("__Contracts Exchanged") && entry[1] && entry[1].done && entry[1].date
  })
  const exchangeDate = exchangeEntry && exchangeEntry[1].date

  function getTaskDate(suffix) {
    const entry = Object.entries(tasks).find(function(e) {
      return e[0].endsWith("__" + suffix) && e[1] && e[1].done && e[1].date
    })
    return entry ? entry[1].date : null
  }

  function getStageCompletionDate(stageId) {
    const entries = Object.entries(tasks).filter(function(e) {
      return e[0].startsWith(stageId + "__") && e[1] && e[1].done && e[1].date
    })
    if (!entries.length) return null
    return entries.reduce(function(latest, e) {
      return !latest || e[1].date > latest ? e[1].date : latest
    }, null)
  }

  const instructionCompleteDate = getStageStatus(tasks, "instruction") === "complete" ? getStageCompletionDate("instruction") : null
  const preExchangeCompleteDate = getStageStatus(tasks, "preExchange") === "complete" ? getStageCompletionDate("preExchange") : null
  const searchesDate            = getTaskDate("Searches Received")
  const mortgageOfferDate       = getTaskDate("Mortgage Offer Received")
  const enquiriesRaisedDate     = getTaskDate("Raise Enquiries")
  const enquiriesAnsweredDate   = getTaskDate("Enquiries Resolved")

  const branchName    = (branchData && branchData.name)    || (caseData && caseData.branchName)  || "Northwood"
  const brand         = getBrand(branchName)
  const brandAndBranch = branchName === brand ? branchName : (brand + " — " + branchName)
  const branchAddress = (branchData && branchData.address) || ""
  const branchPhone   = (branchData && branchData.phone)   || (caseData && caseData.branchPhone) || ""
  const branchEmail   = (branchData && branchData.email)   || (caseData && caseData.branchEmail) || ""
  const vSol = caseData && caseData.vendorSolicitor
  const vendorName = (caseData && caseData.vendorName) || (caseData && caseData.vendor && caseData.vendor.name) || ""
  const firstName = getFirstName(vendorName)
  const greeting = getGreeting()

  const stageStatusFor = function(i) {
    if (isCompleted) return "complete"
    if (i < currentStageIdx) return "complete"
    if (i === currentStageIdx) return "active"
    return "pending"
  }

  const stageBg    = function(s) { return s === "complete" ? "#f0fdf4" : s === "active" ? "#eef2ff" : "#fff" }
  const stageBdr   = function(s) { return s === "complete" ? "#86efac" : s === "active" ? "#a5b4fc" : "#e5e7eb" }
  const pillBg     = function(s) { return s === "complete" ? "#dcfce7" : s === "active" ? "#e0e7ff" : "#f1f5f9" }
  const pillColor  = function(s) { return s === "complete" ? "#16a34a" : s === "active" ? "#4338ca" : "#9ca3af" }
  const pillLabel  = function(s) { return s === "complete" ? "Complete" : s === "active" ? "In progress" : "Upcoming" }

  return (
    React.createElement("div", { className: "portal-root", style: { minHeight: "100vh", background: "#f3f4f6", paddingBottom: 80 } },

      React.createElement("style", null, `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; }
        .portal-root { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        .portal-header { background: linear-gradient(150deg, #071527 0%, #0d2044 45%, #0f2952 100%); position: relative; overflow: hidden; }
        .portal-orb-1 { position: absolute; top: -80px; right: -60px; width: 280px; height: 280px; background: radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 65%); pointer-events: none; }
        .portal-orb-2 { position: absolute; bottom: -60px; left: -40px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(15,118,110,0.15) 0%, transparent 65%); pointer-events: none; }
        .portal-orb-3 { position: absolute; top: 35%; right: 15%; width: 140px; height: 140px; background: radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 65%); pointer-events: none; }
        .stage-pip { transition: all 0.2s; }
        .tab-btn { font-family: 'Inter', sans-serif; transition: all 0.15s; }
      `),

      React.createElement("div", { className: "portal-header" },
        React.createElement("div", { className: "portal-orb-1" }),
        React.createElement("div", { className: "portal-orb-2" }),
        React.createElement("div", { className: "portal-orb-3" }),

        React.createElement("div", { style: { maxWidth: 600, margin: "0 auto", padding: "18px 20px 28px", position: "relative", zIndex: 1 } },

          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 9 } },
              React.createElement("div", { style: { width: 30, height: 30, background: "#0F766E", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff", flexShrink: 0 } }, "M"),
              React.createElement("div", null,
                React.createElement("div", { style: { fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.9)", lineHeight: 1.1 } }, brand),
                React.createElement("div", { style: { fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2, letterSpacing: "0.05em", textTransform: "uppercase" } }, "Sale Tracker")
              )
            ),
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
              allCases.length > 1 && React.createElement("button", { onClick: handleBackToPicker, style: { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 12px", color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 } },
                React.createElement("span", null, "←"),
                React.createElement("span", null, "My Sales")
              ),
              React.createElement("div", { style: { display: "flex", gap: 8 } },
                showBack && React.createElement("button", { onClick: onBack, style: { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 14px", color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 500, cursor: "pointer" } }, "← My Sales"),
                React.createElement("button", { onClick: handleSignOut, style: { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 14px", color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 500, cursor: "pointer" } }, "Sign out")
              )
            )
          ),

          React.createElement("div", { style: { marginBottom: 24 } },
            React.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "5px 12px 5px 9px", marginBottom: 14 } },
              React.createElement("span", { style: { fontSize: 14, lineHeight: 1 } }, "👋"),
              React.createElement("span", { style: { fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.65)" } },
                greeting + (firstName ? (", " + firstName) : "")
              )
            ),
            React.createElement("div", { style: { fontFamily: "DM Serif Display, serif", fontSize: 28, color: "#ffffff", lineHeight: 1.2, letterSpacing: "-0.01em", marginBottom: 8 } },
              address || "Your Property"
            ),
            React.createElement("div", { style: { fontFamily: "Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 400, lineHeight: 1.5 } },
              "Your " + (contactRole === "buyer" ? "purchase" : "sale") + " is being managed by " + brandAndBranch + ". Track every step below."
            )
          ),

          React.createElement("div", { style: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "14px 16px" } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 } },
              React.createElement("div", { style: { fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" } }, "Sale Progress"),
              React.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: 5, background: isCompleted ? "rgba(34,197,94,0.15)" : "rgba(99,102,241,0.18)", borderRadius: 20, padding: "3px 10px", border: "1px solid " + (isCompleted ? "rgba(34,197,94,0.28)" : "rgba(99,102,241,0.28)") } },
                React.createElement("div", { style: { width: 6, height: 6, borderRadius: "50%", background: isCompleted ? "#22c55e" : "#818cf8", boxShadow: "0 0 5px " + (isCompleted ? "rgba(34,197,94,0.8)" : "rgba(129,140,248,0.8)") } }),
                React.createElement("span", { style: { fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: isCompleted ? "#86efac" : "#c7d2fe" } },
                  isCompleted ? "Completed" : (STAGES[currentStageIdx] && STAGES[currentStageIdx].label)
                )
              )
            ),
            React.createElement("div", { style: { display: "flex", gap: 4, alignItems: "center" } },
              STAGES.map(function(stage, i) {
                const s = stageStatusFor(i)
                const isDone = s === "complete"
                const isActive = s === "active"
                return React.createElement("div", { key: stage.id, className: "stage-pip", style: { flex: 1, height: 5, borderRadius: 3, background: isDone ? "#22c55e" : isActive ? "#818cf8" : "rgba(255,255,255,0.12)", boxShadow: isActive ? "0 0 8px rgba(129,140,248,0.5)" : isDone ? "0 0 5px rgba(34,197,94,0.35)" : "none" } })
              })
            ),
            confirmedDate && React.createElement("div", { style: { fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 10 } },
              (isCompleted ? "Completed on " : "Target completion: ") + fmt(confirmedDate)
            )
          ),

          React.createElement("button", {
            onClick: function() { setShowMessages(true) },
            style: { marginTop: 14, width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "12px 20px", color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: 600, fontFamily: "Inter, sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }
          },
            React.createElement("span", { style: { fontSize: 16 } }, "\ud83d\udcac"),
            React.createElement("span", null, "Ask your estate agent a question")
          )
        )
      ),

      React.createElement("div", { style: { background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10 } },
        React.createElement("div", { style: { maxWidth: 600, margin: "0 auto", display: "flex" } },
          [{ id: "progress", label: "Progress" }, { id: "contacts", label: "Contacts" }].map(function(tab) {
            return React.createElement("button", {
              key: tab.id,
              onClick: function() { setActiveSection(tab.id) },
              style: { flex: 1, padding: "14px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: activeSection === tab.id ? "#0f2952" : "#9ca3af", borderBottom: "2px solid " + (activeSection === tab.id ? "#0f2952" : "transparent"), transition: "all 0.15s" }
            }, tab.label)
          })
        )
      ),

      React.createElement("div", { style: { maxWidth: 600, margin: "0 auto", padding: "24px 16px" } },

        activeSection === "progress" && React.createElement("div", null,

          React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 28, overflowX: "auto", paddingBottom: 4 } },
            STAGES.map(function(stage, i) {
              const s = stageStatusFor(i)
              return React.createElement("div", { key: stage.id, style: { flex: "1 0 80px", textAlign: "center", padding: "12px 8px", background: stageBg(s), border: "1.5px solid " + stageBdr(s), borderRadius: 12 } },
                React.createElement("div", { style: { fontSize: 18, marginBottom: 4 } }, s === "complete" ? "✅" : stage.icon),
                React.createElement("div", { style: { fontSize: 11, fontWeight: 600, color: s === "pending" ? "#9ca3af" : "#1e293b", lineHeight: 1.3 } }, stage.label)
              )
            })
          ),

          ((caseData && caseData.instructionDate) || instructionCompleteDate || searchesDate || mortgageOfferDate || enquiriesRaisedDate || enquiriesAnsweredDate || preExchangeCompleteDate || exchangeDate || confirmedDate) && React.createElement("div", { style: { background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20, marginBottom: 20 } },
            React.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7280", marginBottom: 14 } }, "Key Dates"),
            React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
              caseData && caseData.instructionDate && React.createElement(DateRow, { label: "Instructed", date: caseData.instructionDate, color: "#f59e0b" }),
              instructionCompleteDate && React.createElement(DateRow, { label: "Onboarding complete", date: instructionCompleteDate, color: "#10b981" }),
              searchesDate && React.createElement(DateRow, { label: "Searches back", date: searchesDate, color: "#38bdf8" }),
              mortgageOfferDate && React.createElement(DateRow, { label: "Mortgage offer received", date: mortgageOfferDate, color: "#8b5cf6" }),
              enquiriesRaisedDate && React.createElement(DateRow, { label: "Enquiries raised", date: enquiriesRaisedDate, color: "#f97316" }),
              enquiriesAnsweredDate && React.createElement(DateRow, { label: "Enquiries answered", date: enquiriesAnsweredDate, color: "#06b6d4" }),
              preExchangeCompleteDate && React.createElement(DateRow, { label: "Legal stage complete", date: preExchangeCompleteDate, color: "#10b981" }),
              exchangeDate && React.createElement(DateRow, { label: "Exchanged", date: exchangeDate, color: "#38bdf8" }),
              confirmedDate && React.createElement(DateRow, { label: isCompleted ? "Completed" : "Completion date", date: confirmedDate, color: isCompleted ? "#22c55e" : "#6366f1" })
            )
          ),

          STAGES.map(function(stage, i) {
            const s = stageStatusFor(i)
            const visibleTasks = CLIENT_VISIBLE_TASKS[stage.id] || []
            return React.createElement("div", { key: stage.id, style: { background: "#fff", borderRadius: 14, border: "1.5px solid " + (s === "active" ? "#a5b4fc" : "#e5e7eb"), marginBottom: 12, overflow: "hidden", opacity: s === "pending" ? 0.6 : 1 } },
              React.createElement("div", { style: { padding: "14px 18px", background: stageBg(s), display: "flex", alignItems: "center", gap: 10, borderBottom: visibleTasks.length ? "1px solid #f1f5f9" : "none" } },
                React.createElement("span", { style: { fontSize: 18 } }, s === "complete" ? "✅" : stage.icon),
                React.createElement("div", { style: { flex: 1 } },
                  React.createElement("div", { style: { fontWeight: 700, fontSize: 15, color: "#0f172a" } }, stage.label)
                ),
                React.createElement("div", { style: { fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: pillBg(s), color: pillColor(s) } }, pillLabel(s))
              ),
              visibleTasks.length > 0 && React.createElement("div", { style: { padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 } },
                visibleTasks.map(function(taskName) {
                  const td = getTaskDone(tasks, stage.id, taskName)
                  return React.createElement("div", { key: taskName, style: { display: "flex", alignItems: "center", gap: 10 } },
                    React.createElement("div", { style: { width: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: td.done ? "#dcfce7" : "#f1f5f9", border: "1.5px solid " + (td.done ? "#86efac" : "#d1d5db"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: td.done ? "#16a34a" : "#9ca3af" } },
                      td.done ? "✓" : ""
                    ),
                    React.createElement("div", { style: { flex: 1 } },
                      React.createElement("span", { style: { fontSize: 13, color: td.done ? "#374151" : "#9ca3af", fontWeight: td.done ? 500 : 400 } }, CLIENT_TASK_LABELS[taskName] || taskName),
                      td.done && td.date && React.createElement("span", { style: { fontSize: 11, color: "#9ca3af", marginLeft: 6 } }, fmt(td.date))
                    )
                  )
                })
              )
            )
          })
        ),

        activeSection === "contacts" && React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } },
          React.createElement(ContactCard, { label: "Your Estate Agent", name: brand, firm: branchName === brand ? null : branchName, address: branchAddress, phone: branchPhone, email: branchEmail, icon: "🏢", color: "#0f2952" }),
          vSol && vSol.firm && React.createElement(ContactCard, { label: "Your Solicitor", name: vSol.contact || vSol.firm, firm: vSol.contact ? vSol.firm : null, phone: vSol.phone, email: vSol.email, icon: "⚖️", color: "#0f766e" })
        )
      ),

      showMessages && React.createElement(MessagesDrawer, {
        caseId: selectedCaseId,
        session: session,
        onClose: function() { setShowMessages(false) },
        brand: brand,
        branchName: branchName,
        contactRole: contactRole,
      })
    )
  )
}

function DateRow({ label, date, color }) {
  return React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
      React.createElement("div", { style: { width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 } }),
      React.createElement("span", { style: { fontSize: 14, color: "#374151" } }, label)
    ),
    React.createElement("span", { style: { fontSize: 14, fontWeight: 600, color: "#0f172a" } }, fmt(date))
  )
}

function ContactCard({ label, name, address, firm, phone, email, icon, color }) {
  return React.createElement("div", { style: { background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden" } },
    React.createElement("div", { style: { background: color, padding: "10px 18px", display: "flex", alignItems: "center", gap: 8 } },
      React.createElement("span", { style: { fontSize: 16 } }, icon),
      React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.08em" } }, label)
    ),
    React.createElement("div", { style: { padding: "16px 18px" } },
      React.createElement("div", { style: { fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 2 } }, name),
      address && React.createElement("div", { style: { fontSize: 13, color: "#6b7280", marginBottom: firm ? 2 : 12 } }, address),
      firm && React.createElement("div", { style: { fontSize: 13, color: "#6b7280", marginBottom: 12 } }, firm),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
        phone && React.createElement("a", { href: "tel:" + phone, style: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#0f2952", textDecoration: "none", fontWeight: 500 } },
          React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 } }, "📞"),
          phone
        ),
        email && React.createElement("a", { href: "mailto:" + email, style: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#0f2952", textDecoration: "none", fontWeight: 500 } },
          React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 } }, "✉️"),
          email
        )
      )
    )
  )
}

function CasePicker({ cases, onSelect, onSignOut, session }) {
  const greeting = getGreeting()
  const userEmail = session && session.user && session.user.email
  const firstName = getFirstName(
    cases[0] && cases[0].data && cases[0].data.vendor && cases[0].data.vendor.name || ""
  )

  return React.createElement("div", { style: { minHeight: "100vh", background: "#f3f4f6", fontFamily: "Inter, -apple-system, sans-serif" } },

    React.createElement("style", null, `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
      .case-card { transition: transform 0.15s, box-shadow 0.15s; cursor: pointer; }
      .case-card:active { transform: scale(0.98); }
    `),

    React.createElement("div", { style: { background: "linear-gradient(150deg, #071527 0%, #0d2044 45%, #0f2952 100%)", padding: "24px 20px 32px", position: "relative", overflow: "hidden" } },
      React.createElement("div", { style: { position: "absolute", top: -60, right: -60, width: 220, height: 220, background: "radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 65%)", pointerEvents: "none" } }),

      React.createElement("div", { style: { maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 } },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 } },
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 9 } },
            React.createElement("div", { style: { width: 30, height: 30, background: "#0F766E", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff" } }, "M"),
            React.createElement("div", null,
              React.createElement("div", { style: { fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.9)", lineHeight: 1.1 } }, "Mooves"),
              React.createElement("div", { style: { fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2, letterSpacing: "0.05em", textTransform: "uppercase" } }, "Sale Tracker")
            )
          ),
          React.createElement("button", { onClick: onSignOut, style: { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 14px", color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 500, cursor: "pointer" } }, "Sign out")
        ),

        React.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "5px 12px 5px 9px", marginBottom: 14 } },
          React.createElement("span", { style: { fontSize: 14 } }, "👋"),
          React.createElement("span", { style: { fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.65)" } }, greeting + (firstName ? (", " + firstName) : ""))
        ),
        React.createElement("div", { style: { fontFamily: "DM Serif Display, serif", fontSize: 26, color: "#fff", lineHeight: 1.2, marginBottom: 6 } }, "Your Sales"),
        React.createElement("div", { style: { fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 } },
          "You have " + cases.length + " active " + (cases.length === 1 ? "sale" : "sales") + ". Select one to view its progress."
        )
      )
    ),

    React.createElement("div", { style: { maxWidth: 600, margin: "0 auto", padding: "24px 16px" } },
      cases.map(function(c) {
        const data = c.data || {}
        const tasks = data.tasks || {}
        const address = data.address || [data.addressLine1, data.town, data.postcode].filter(Boolean).join(", ") || "Unknown address"
        const isCompleted = data.completed
        const stageIdx = getCurrentStageIndex(tasks, data)
        const stageLabel = isCompleted ? "Completed" : (STAGES[stageIdx] && STAGES[stageIdx].label) || "In Progress"
        const stageIcon = isCompleted ? "✅" : (STAGES[stageIdx] && STAGES[stageIdx].icon) || "📋"
        const isVendor = data.vendor && data.vendor.email && userEmail && data.vendor.email.toLowerCase() === userEmail.toLowerCase()
        const role = isVendor ? "Sale" : "Purchase"

        const pipStatuses = STAGES.map(function(stage, i) {
          if (isCompleted) return "complete"
          if (i < stageIdx) return "complete"
          if (i === stageIdx) return "active"
          return "pending"
        })

        return React.createElement("div", {
          key: c.id,
          className: "case-card",
          onClick: function() { onSelect(c.id, c.data) },
          style: { background: "#fff", borderRadius: 16, border: "1.5px solid #e5e7eb", marginBottom: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }
        },
          React.createElement("div", { style: { padding: "16px 18px 12px" } },
            React.createElement("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 } },
              React.createElement("div", { style: { flex: 1, marginRight: 12 } },
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 4 } },
                  React.createElement("span", { style: { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: isVendor ? "#0F766E" : "#4338ca", background: isVendor ? "#f0fdf4" : "#eef2ff", borderRadius: 4, padding: "2px 6px" } }, role)
                ),
                React.createElement("div", { style: { fontFamily: "DM Serif Display, serif", fontSize: 18, color: "#0f172a", lineHeight: 1.3 } }, address)
              ),
              React.createElement("div", { style: { fontSize: 22, flexShrink: 0 } }, stageIcon)
            ),

            React.createElement("div", { style: { display: "flex", gap: 3, marginBottom: 10 } },
              pipStatuses.map(function(s, i) {
                return React.createElement("div", { key: i, style: { flex: 1, height: 4, borderRadius: 2, background: s === "complete" ? "#22c55e" : s === "active" ? "#818cf8" : "#e5e7eb", boxShadow: s === "active" ? "0 0 6px rgba(129,140,248,0.5)" : "none" } })
              })
            ),

            React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
              React.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: 5, background: isCompleted ? "#f0fdf4" : "#eef2ff", borderRadius: 20, padding: "3px 10px", border: "1px solid " + (isCompleted ? "#86efac" : "#a5b4fc") } },
                React.createElement("div", { style: { width: 6, height: 6, borderRadius: "50%", background: isCompleted ? "#22c55e" : "#818cf8" } }),
                React.createElement("span", { style: { fontSize: 11, fontWeight: 600, color: isCompleted ? "#15803d" : "#4338ca" } }, stageLabel)
              ),
              React.createElement("span", { style: { fontSize: 12, color: "#9ca3af", fontWeight: 500 } }, "View details →")
            )
          )
        )
      })
    )
  )
}
