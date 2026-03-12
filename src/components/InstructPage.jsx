// InstructPage.jsx — Vendor instruction confirmation page
// Accessed via portal.mooves.co.uk/instruct/:token
// No auth required — token is the authentication

import { useState, useEffect } from "react";

const SUPABASE_URL = "https://tqspuxqjavhhqmhmbaen.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxc3B1eHFqYXZoaHFtaG1iYWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk4MjA4MDAsImV4cCI6MjAyNTM5NjgwMH0.placeholder";

const fmtCcy = (n) => n ? "£" + Number(n).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : null;

// Brand colours matching portal
const C = {
  navy:    "#0f1a2e",
  teal:    "#0f766e",
  white:   "#f8fafc",
  grey:    "#64748b",
  border:  "#e2e8f0",
  bg:      "#f1f5f9",
};

const iStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 15,
  color: "#1e293b",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
  WebkitAppearance: "none",
};

const lStyle = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#64748b",
  fontWeight: 700,
  marginBottom: 6,
  display: "block",
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function InstructPage({ token }) {
  const [valuation, setValuation] = useState(null);
  const [branch,    setBranch]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Editable fields
  const [firstName,    setFirstName]    = useState("");
  const [lastName,     setLastName]     = useState("");
  const [phone,        setPhone]        = useState("");
  const [email,        setEmail]        = useState("");
  const [owner2Name,   setOwner2Name]   = useState("");
  const [owner2Phone,  setOwner2Phone]  = useState("");
  const [owner2Email,  setOwner2Email]  = useState("");
  const [prefPrice,    setPrefPrice]    = useState("");
  const [notes,        setNotes]        = useState("");
  const [homeAddr,     setHomeAddr]     = useState("");
  const [homeAddr2,    setHomeAddr2]    = useState("");
  const [homeTown,     setHomeTown]     = useState("");
  const [homePostcode, setHomePostcode] = useState("");
  const [owner2Addr,   setOwner2Addr]   = useState("");
  const [owner2Addr2,  setOwner2Addr2]  = useState("");
  const [owner2Town,   setOwner2Town]   = useState("");
  const [owner2Postcode,setOwner2Postcode] = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState("");

  // Load valuation by token
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/valuations?instruct_token=eq.${token}&limit=1`,
          { headers: { "apikey": SUPABASE_KEY } }
        );
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        if (!data?.length) { setError("This link is invalid or has already been used."); setLoading(false); return; }

        const v = data[0];

        // Check expiry
        if (v.instruct_token_expires_at && new Date(v.instruct_token_expires_at) < new Date()) {
          setError("This link has expired. Please contact your branch for a new one.");
          setLoading(false);
          return;
        }

        // Check already instructed
        if (v.instructed_at) {
          setSubmitted(true);
          setLoading(false);
          return;
        }

        setValuation(v);

        // Pre-fill from existing vendor data
        const name = v.vendor_name || "";
        const parts = name.trim().split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
        setPhone(v.vendor_phone || "");
        setEmail(v.vendor_email || "");

        // Load branch for logo/contact details
        if (v.branch_id) {
          const bRes = await fetch(
            `${SUPABASE_URL}/rest/v1/branches?id=eq.${v.branch_id}&limit=1`,
            { headers: { "apikey": SUPABASE_KEY } }
          );
          if (bRes.ok) {
            const bData = await bRes.json();
            if (bData?.length) setBranch(bData[0]);
          }
        }
      } catch(e) {
        setError("Something went wrong. Please try again or contact your branch.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSubmit = async () => {
    if (!firstName.trim()) { setSubmitError("Please enter your first name."); return; }
    if (!phone.trim() && !email.trim()) { setSubmitError("Please enter at least a phone number or email address."); return; }
    setSubmitting(true); setSubmitError("");

    try {
      const instructedData = {
        first_name:    firstName.trim(),
        last_name:     lastName.trim(),
        full_name:     `${firstName.trim()} ${lastName.trim()}`.trim(),
        phone:         phone.trim(),
        email:         email.trim().toLowerCase(),
        owner2_name:   owner2Name.trim() || null,
        owner2_phone:  owner2Phone.trim() || null,
        owner2_email:  owner2Email.trim().toLowerCase() || null,
        preferred_price: prefPrice ? Number(prefPrice.replace(/[^0-9]/g, "")) : null,
        home_address: {
          line1:    homeAddr.trim()     || null,
          line2:    homeAddr2.trim()    || null,
          town:     homeTown.trim()     || null,
          postcode: homePostcode.trim() || null,
        },
        owner2_home_address: owner2Name.trim() ? {
          line1:    owner2Addr.trim()     || null,
          line2:    owner2Addr2.trim()    || null,
          town:     owner2Town.trim()     || null,
          postcode: owner2Postcode.trim() || null,
        } : null,
        notes:         notes.trim() || null,
        instructed_at: new Date().toISOString(),
      };

      // Call Edge Function to mark instructed + send branch email
      const res = await fetch(`${SUPABASE_URL}/functions/v1/confirm-instruction`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          instructedData,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }

      setSubmitted(true);
    } catch(e) {
      setSubmitError("Failed to submit. Please try again or call your branch directly.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.grey, fontSize: 15 }}>Loading…</div>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────
  if (error) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 440, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>Link unavailable</div>
        <div style={{ fontSize: 15, color: C.grey, lineHeight: 1.6 }}>{error}</div>
        {branch?.phone && (
          <a href={"tel:" + branch.phone} style={{ display: "inline-block", marginTop: 20, background: C.navy, color: "#fff", borderRadius: 10, padding: "12px 24px", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>
            📞 Call us
          </a>
        )}
      </div>
    </div>
  );

  // ── Already instructed ───────────────────────────────────────
  if (submitted) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#f0fdf4", border: "2px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 20px" }}>✓</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>Thank you — we're instructed!</div>
        <div style={{ fontSize: 15, color: C.grey, lineHeight: 1.7, marginBottom: 24 }}>
          We've received your instruction and our team will be in touch shortly to get everything moving.
          {branch?.name && ` If you have any questions, don't hesitate to call ${branch.name}.`}
        </div>
        {branch?.phone && (
          <a href={"tel:" + branch.phone} style={{ display: "inline-block", background: C.navy, color: "#fff", borderRadius: 10, padding: "12px 24px", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>
            📞 {branch.phone}
          </a>
        )}
      </div>
    </div>
  );

  // ── Main form ────────────────────────────────────────────────
  const recPrice = valuation?.sale_price ? fmtCcy(valuation.sale_price) : null;
  const feeExVat = valuation?.fee_ex_vat ? fmtCcy(valuation.fee_ex_vat) : null;
  const isNorthwood = branch?.name?.toLowerCase().includes("northwood");
  const brandName = isNorthwood ? "Northwood" : (branch?.name || "Your Agent");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', 'Segoe UI', sans-serif", WebkitFontSmoothing: "antialiased" }}>

      {/* Header */}
      <div style={{ background: C.navy, padding: "20px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        {branch?.logoDataUrl ? (
          <img src={branch.logoDataUrl} alt={brandName} style={{ height: 36, objectFit: "contain" }} />
        ) : (
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{brandName}</div>
        )}
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px 20px 60px" }}>

        {/* Intro */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0f1a2e", letterSpacing: "-0.02em", marginBottom: 8, lineHeight: 1.2 }}>
            Instruct us to sell your home
          </div>
          <div style={{ fontSize: 15, color: C.grey, lineHeight: 1.6 }}>
            Please check the details below are correct before confirming. You can update anything that needs changing.
          </div>
        </div>

        {/* Property card */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: C.teal, fontWeight: 700, marginBottom: 8 }}>Property</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", lineHeight: 1.3, marginBottom: 14 }}>{valuation.address}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
            {recPrice && (
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", fontWeight: 700 }}>Our Recommendation</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>{valuation.price_prefix ? valuation.price_prefix + " " : ""}{recPrice}</div>
              </div>
            )}
            {feeExVat && (
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", fontWeight: 700 }}>Our Fee (ex VAT)</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>{feeExVat}</div>
              </div>
            )}
          </div>
        </div>

        {/* Your details */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: C.teal, fontWeight: 700, marginBottom: 16 }}>Your Details</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={lStyle}>First Name <span style={{ color: "#ef4444" }}>*</span></label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" style={iStyle} />
              </div>
              <div>
                <label style={lStyle}>Last Name</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" style={iStyle} />
              </div>
            </div>
            <div>
              <label style={lStyle}>Phone Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 07700 900000" style={iStyle} type="tel" />
            </div>
            <div>
              <label style={lStyle}>Email Address</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. john@email.com" style={iStyle} type="email" />
            </div>
          </div>
        </div>

        {/* Second owner */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: C.teal, fontWeight: 700, marginBottom: 4 }}>Second Owner</div>
          <div style={{ fontSize: 13, color: C.grey, marginBottom: 14 }}>If someone else is named on the title, please add their details here.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={lStyle}>Name <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400, textTransform: "none" }}>optional</span></label>
              <input value={owner2Name} onChange={e => setOwner2Name(e.target.value)} placeholder="Full name" style={iStyle} />
            </div>
            {owner2Name.trim() && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={lStyle}>Phone</label>
                    <input value={owner2Phone} onChange={e => setOwner2Phone(e.target.value)} placeholder="07..." style={iStyle} type="tel" />
                  </div>
                  <div>
                    <label style={lStyle}>Email</label>
                    <input value={owner2Email} onChange={e => setOwner2Email(e.target.value)} placeholder="email@..." style={iStyle} type="email" />
                  </div>
                </div>
                <div>
                  <label style={lStyle}>Home Address <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400, textTransform: "none" }}>if different to the sale property</span></label>
                  <input value={owner2Addr} onChange={e => setOwner2Addr(e.target.value)} placeholder="Address line 1" style={{ ...iStyle, marginBottom: 6 }} />
                  <input value={owner2Addr2} onChange={e => setOwner2Addr2(e.target.value)} placeholder="Address line 2 (optional)" style={{ ...iStyle, marginBottom: 6 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <input value={owner2Town} onChange={e => setOwner2Town(e.target.value)} placeholder="Town / City" style={iStyle} />
                    <input value={owner2Postcode} onChange={e => setOwner2Postcode(e.target.value)} placeholder="Postcode" style={iStyle} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Preferred price */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: C.teal, fontWeight: 700, marginBottom: 4 }}>Asking Price</div>
          <div style={{ fontSize: 13, color: C.grey, marginBottom: 14 }}>
            {recPrice ? `We've recommended ${recPrice}. If you'd prefer a different asking price, let us know below and we'll discuss it with you.` : "If you have a preferred asking price in mind, enter it below."}
          </div>
          <div>
            <label style={lStyle}>Preferred Asking Price <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400, textTransform: "none" }}>optional — leave blank if you're happy with our recommendation</span></label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 15, pointerEvents: "none" }}>£</span>
              <input
                value={prefPrice}
                onChange={e => setPrefPrice(e.target.value)}
                placeholder="e.g. 250000"
                style={{ ...iStyle, paddingLeft: 28 }}
                type="number"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", marginBottom: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: C.teal, fontWeight: 700, marginBottom: 4 }}>Anything Else?</div>
          <div style={{ fontSize: 13, color: C.grey, marginBottom: 12 }}>Any questions or things you'd like us to know before we get started.</div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. We'd prefer viewings on weekday evenings only..."
            rows={4}
            style={{ ...iStyle, resize: "vertical", lineHeight: 1.6 }}
          />
        </div>

        {submitError && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: "#dc2626", fontSize: 14 }}>
            {submitError}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ width: "100%", background: submitting ? "#94a3b8" : C.teal, color: "#fff", border: "none", borderRadius: 12, padding: "16px", fontSize: 16, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: "-0.01em", transition: "background 0.15s" }}
        >
          {submitting ? "Confirming…" : "Confirm & Instruct Us"}
        </button>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#94a3b8" }}>
          By confirming you're instructing {brandName} to market your property.
        </div>

      </div>
    </div>
  );
}
