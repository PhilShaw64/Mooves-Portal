import { useState, useEffect, useRef } from "react"
import React from "react"
import { supabase } from "../supabase.js"

function fmt(dateStr) {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

export default function MessagesDrawer({ caseId, session, onClose, branchName, brand, contactRole }) {
  const role = contactRole || "vendor"
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)
  const textRef = useRef(null)

  useEffect(function() {
    loadMessages()
    const channel = supabase
      .channel("portal_messages_" + caseId + "_" + role)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "portal_messages", filter: "case_id=eq." + caseId },
        function(payload) {
          if (payload.new.thread_type !== role) return
          setMessages(function(prev) { return [...prev, payload.new] })
        })
      .subscribe()
    return function() { supabase.removeChannel(channel) }
  }, [caseId, role])

  useEffect(function() {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadMessages = async function() {
    const { data, error } = await supabase
      .from("portal_messages")
      .select("id, sender, staff_name, message, created_at, thread_type")
      .eq("case_id", String(caseId))
      .eq("thread_type", role)
      .order("created_at", { ascending: true })
    if (!error && data) setMessages(data)
    setLoading(false)
  }

  const sendMessage = async function() {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    const { error } = await supabase.from("portal_messages").insert({
      case_id: String(caseId),
      sender: role,
      thread_type: role,
      message: text,
    })
    if (!error) {
      setDraft("")
      await loadMessages()
    }
    setSending(false)
  }

  const handleKeyDown = function(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const agentName = brand || branchName || "Northwood"

  return React.createElement(React.Fragment, null,
    React.createElement("style", null, `
      .msg-drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; animation: fadeIn 0.2s ease; }
      .msg-drawer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-radius: 20px 20px 0 0; z-index: 101; max-height: 85vh; display: flex; flex-direction: column; animation: slideUp 0.25s ease; max-width: 600px; margin: 0 auto; }
      @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      .msg-bubble-client { background: #0f2952; color: #fff; border-radius: 16px 16px 4px 16px; }
      .msg-bubble-staff { background: #f1f5f9; color: #0f172a; border-radius: 16px 16px 16px 4px; }
      .send-btn { background: #0f2952; color: #fff; border: none; border-radius: 10px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; font-size: 18px; transition: opacity 0.15s; }
      .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .msg-textarea { flex: 1; border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 10px 14px; font-size: 14px; font-family: Inter, sans-serif; resize: none; outline: none; line-height: 1.5; max-height: 100px; }
      .msg-textarea:focus { border-color: #818cf8; }
    `),
    React.createElement("div", { className: "msg-drawer-overlay", onClick: onClose }),
    React.createElement("div", { className: "msg-drawer" },
      React.createElement("div", { style: { display: "flex", justifyContent: "center", padding: "12px 0 4px" } },
        React.createElement("div", { style: { width: 36, height: 4, background: "#e5e7eb", borderRadius: 2 } })
      ),
      React.createElement("div", { style: { padding: "12px 20px 14px", borderBottom: "1px solid #f1f5f9" } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
          React.createElement("div", null,
            React.createElement("div", { style: { fontWeight: 700, fontSize: 16, color: "#0f172a", fontFamily: "Inter, sans-serif" } }, "Ask a question"),
            React.createElement("div", { style: { fontSize: 12, color: "#6b7280", marginTop: 2 } }, "The " + agentName + " team will reply as soon as possible")
          ),
          React.createElement("button", { onClick: onClose, style: { background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" } }, "×")
        )
      ),
      React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "16px 16px 8px" } },
        loading
          ? React.createElement("div", { style: { textAlign: "center", padding: 32, color: "#9ca3af", fontSize: 14 } }, "Loading messages…")
          : messages.length === 0
            ? React.createElement("div", { style: { textAlign: "center", padding: "32px 20px" } },
                React.createElement("div", { style: { fontSize: 36, marginBottom: 10 } }, "💬"),
                React.createElement("div", { style: { fontWeight: 600, fontSize: 15, color: "#374151", marginBottom: 6 } }, "Got a question?"),
                React.createElement("div", { style: { fontSize: 13, color: "#9ca3af", lineHeight: 1.6 } }, "Type your message below and the team will get back to you.")
              )
            : React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },
                messages.map(function(msg) {
                  const isClient = msg.sender !== "staff"
                  return React.createElement("div", { key: msg.id, style: { display: "flex", flexDirection: "column", alignItems: isClient ? "flex-end" : "flex-start" } },
                    !isClient && React.createElement("div", { style: { fontSize: 11, color: "#9ca3af", marginBottom: 3, paddingLeft: 4, fontFamily: "Inter, sans-serif" } },
                      msg.staff_name || agentName + " Team"
                    ),
                    React.createElement("div", { className: "msg-bubble-" + (isClient ? "client" : "staff"), style: { padding: "10px 14px", maxWidth: "80%", fontSize: 14, lineHeight: 1.5, fontFamily: "Inter, sans-serif" } }, msg.message),
                    React.createElement("div", { style: { fontSize: 11, color: "#9ca3af", marginTop: 3, paddingLeft: 4, paddingRight: 4 } }, fmt(msg.created_at))
                  )
                }),
                React.createElement("div", { ref: bottomRef })
              )
      ),
      React.createElement("div", { style: { padding: "12px 16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 10, alignItems: "flex-end" } },
        React.createElement("textarea", { ref: textRef, className: "msg-textarea", placeholder: "Type your question…", value: draft, onChange: function(e) { setDraft(e.target.value) }, onKeyDown: handleKeyDown, rows: 2 }),
        React.createElement("button", { className: "send-btn", onClick: sendMessage, disabled: !draft.trim() || sending }, sending ? "…" : "↑")
      )
    )
  )
}
