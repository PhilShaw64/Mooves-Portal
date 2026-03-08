import { useState, useEffect } from "react"
import React from "react"
import { supabase } from "../supabase.js"

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

function getTaskDone(tasks, stageId, taskName) {
  if (!tasks) return { done: false, date: null }
  const normalisedTask = taskName.replace(/ /g, "*")
  const key = stageId + "**" + normalisedTask
  if (tasks[key]) return { done: tasks[key].done || false, date: tasks[key].date || null }
  const fallback = Object.keys(tasks).find(function(k) {
    return k.startsWith(stageId + "**") && k.replace(/ /g, "*").endsWith("__" + normalisedTask)
  })
  if (fallback) return { done: tasks[fallback].done || false, date: tasks[fallback].date || null }
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

export default function DashboardPage({ session }) {
  const [caseData, setCaseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeSection, setActiveSection] = useState("progress")

  useEffect(function() { loadCaseData() }, [session])

  const loadCaseData = async function() {
    try {
      const caseId = session.user.user_metadata && session.user.user_metadata.case_id
      if (!caseId) {
        setError("No case linked to your account. Please contact your agent.")
        setLoading(false)
        return
      }
      const result = await supabase.from("cases").select("data").eq("id", caseId).single()
      if (result.error || !result.data) throw new Error("Case not found")
      setCaseData(result.data.data)
    } catch (err) {
      setError("Unable to load your sale details. Please try refreshing.")
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async function() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  if (loading) return (
    React.createElement("div", { style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" } },
      React.createElement("div", { style: { textAlign: "center" } },
        React.createElement("div", { style: { width: 40, height: 40, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#0f2952", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" } }),
        React.createElement("div", { style: { fontSize: 14, color: "#9ca3af" } }, "Loading your sale…"),
        React.createElement("style", null, "@keyframes spin { to { transform: rotate(360deg); } }")
      )
    )
  )

  if (error) return (
    React.createElement("div", { style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 } },
      React.createElement("div", { style: { textAlign: "center", maxWidth: 360 } },
        React.createElement("div", { style: { fontSize: 40, marginBottom: 12 } }, "⚠️"),
        React.createElement("div", { style: { fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#0f172a", marginBottom: 8 } }, "Something went wrong"),
        React.createElement("div", { style: { fontSize: 14, color: "#6b7280", lineHeight: 1.6 } }, error)
      )
    )
  )

  const tasks = (caseData && caseData.tasks) || {}
  const address = (caseData && caseData.address) || [caseData && caseData.addressLine1, caseData && caseData.town, caseData && caseData.postcode].filter(Boolean).join(", ")
  const currentStageIdx = getCurrentStageIndex(tasks, caseData)
  const isCompleted = caseData && caseData.completed
  const confirmedDate = caseData && caseData.confirmedCompletionDate
  const exchangeEntry = Object.entries(tasks).find(function(entry) {
    return (entry[0].includes("Contracts_Exchanged") || entry[0].includes("Contracts Exchanged")) && entry[1] && entry[1].done && entry[1].date
  })
  const exchangeDate = exchangeEntry && exchangeEntry[1].date

  const branchName  = (caseData && caseData.branchName)  || (caseData && caseData.agencyName)  || "Northwood"
  const branchPhone = (caseData && caseData.branchPhone) || (caseData && caseData.agencyPhone) || ""
  const branchEmail = (caseData && caseData.branchEmail) || (caseData && caseData.agencyEmail) || ""
  const vSol = caseData && caseData.vendorSolicitor

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
    React.createElement("div", { style: { minHeight: "100vh", background: "#f8f7f4", paddingBottom: 80 } },

      React.createElement("div", { style: { background: "linear-gradient(135deg, #0f2952 0%, #1e3a6e 100%)", padding: "24px 20px 20px" } },
        React.createElement("div", { style: { maxWidth: 600, margin: "0 auto" } },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 } },
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#93c5fd", marginBottom: 4 } }, branchName),
              React.createElement("div", { style: { fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff", lineHeight: 1.3 } }, address || "Your Property")
            ),
            React.createElement("button", { onClick: handleSignOut, style: { background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8, padding: "6px 12px", color: "#93c5fd", fontSize: 12, cursor: "pointer", flexShrink: 0, marginLeft: 12 } }, "Sign out")
          ),
          React.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: 6, background: isCompleted ? "rgba(34,197,94,0.2)" : "rgba(99,102,241,0.2)", borderRadius: 20, padding: "5px 12px", border: "1px solid " + (isCompleted ? "rgba(34,197,94,0.4)" : "rgba(99,102,241,0.4)") } },
            React.createElement("div", { style: { width: 7, height: 7, borderRadius: "50%", background: isCompleted ? "#22c55e" : "#818cf8", flexShrink: 0 } }),
            React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: isCompleted ? "#86efac" : "#c7d2fe" } },
              isCompleted ? "Sale Completed" : ("Stage " + (currentStageIdx + 1) + " of " + STAGES.length + " - " + (STAGES[currentStageIdx] && STAGES[currentStageIdx].label))
            )
          ),
          confirmedDate && React.createElement("div", { style: { marginTop: 8, fontSize: 13, color: "#bfdbfe" } },
            isCompleted ? ("Completed " + fmt(confirmedDate)) : ("Completion date: " + fmt(confirmedDate))
          )
        )
      ),

      React.createElement("div", { style: { background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10 } },
        React.createElement("div", { style: { maxWidth: 600, margin: "0 auto", display: "flex" } },
          [{ id: "progress", label: "Progress" }, { id: "contacts", label: "Contacts" }].map(function(tab) {
            return React.createElement("button", {
              key: tab.id,
              onClick: function() { setActiveSection(tab.id) },
              style: {
                flex: 1, padding: "14px 16px", border: "none", background: "none", cursor: "pointer",
                fontSize: 14, fontWeight: 600,
                color: activeSection === tab.id ? "#0f2952" : "#9ca3af",
                borderBottom: "2px solid " + (activeSection === tab.id ? "#0f2952" : "transparent"),
                transition: "all 0.15s",
              }
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

          ((caseData && caseData.instructionDate) || exchangeDate || confirmedDate) && React.createElement("div", { style: { background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20, marginBottom: 20 } },
            React.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7280", marginBottom: 14 } }, "Key Dates"),
            React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
              caseData && caseData.instructionDate && React.createElement(DateRow, { label: "Instructed", date: caseData.instructionDate, color: "#f59e0b" }),
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
          React.createElement(ContactCard, { label: "Your Estate Agent", name: branchName, phone: branchPhone, email: branchEmail, icon: "🏢", color: "#0f2952" }),
          vSol && vSol.firm && React.createElement(ContactCard, { label: "Your Solicitor", name: vSol.contact || vSol.firm, firm: vSol.contact ? vSol.firm : null, phone: vSol.phone, email: vSol.email, icon: "⚖️", color: "#0f766e" })
        )
      )
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

function ContactCard({ label, name, firm, phone, email, icon, color }) {
  return React.createElement("div", { style: { background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden" } },
    React.createElement("div", { style: { background: color, padding: "10px 18px", display: "flex", alignItems: "center", gap: 8 } },
      React.createElement("span", { style: { fontSize: 16 } }, icon),
      React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.08em" } }, label)
    ),
    React.createElement("div", { style: { padding: "16px 18px" } },
      React.createElement("div", { style: { fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: firm ? 2 : 10 } }, name),
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
