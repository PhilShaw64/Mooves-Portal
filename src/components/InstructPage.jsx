// InstructPage.jsx — Vendor instruction confirmation page
// Accessed via portal.mooves.co.uk/instruct/:token
// No auth required — token is the authentication

import { useState, useEffect } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
  <img src="data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAC9A2ADASIAAhEBAxEB/8QAHQABAAICAwEBAAAAAAAAAAAAAAgJBgcDBAUCAf/EAFkQAAEDAwEEBQQJDgoJBQEBAAEAAgMEBQYRBwgSIRMxQVFhCSJxgRQyNzh1kaGztBUWGCM2QlJydHaSsbLTM1Zic4KTlaLC0SQlQ1NXg5SlwRc0VNLwY+H/xAAbAQEAAgMBAQAAAAAAAAAAAAAABAYCAwUBB//EACsRAQACAQMDAgYCAwEAAAAAAAABAgMEBRESIVExQRMiYbHB4TKhI3Hwgf/aAAwDAQACEQMRAD8AhkiIgIiICIiAiIgIiICIiAiIgIiICIiAiLkp4ZaidsMEbpJHnRrWjmUexEzPEONFmFuwp7mB9fVcBP8As4hqR6z/AJLtT4TRln2isnY7veA4fJotnwrOpXZdZavV0/3DBUXpXuy1tpkAqGB0bjo2VnNp8PArzVhMTHq52TFfFaaXjiYERF41iL6Yx0j2sY0uc46AAaklZVasMnljElwn6DXn0bBq71nqHyrKtZt6JOm0ebUzxiryxNFnsmFW4s0jqqpru9xaR8WgWN37Ha21NMp0np9f4Rg6vSOxezjtCRqNq1Wnr12r2+nd4yIiwc4REQEREBF71jxituUbZ5HCmp3dTnDVzh4Be83CbfwaOq6ou7xwgfFos4x2l0sG06rNXrrXt9ezA0WTXjEKykjdNRyeyoxzLeHR49XasZWM1mvqiajS5dPbpy14ERF40CIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIi5KaCWpnZBBG6SR50a0dqPYiZniH7SwTVNQyCCMySPOjWjtWx8ZsUNpp+N+klU8ee/u8B4frX5jFiitMHG/hkq3jz3/g/yR4frXtKTjx8d5XLadqjTxGXLHzfb9iIi2u64qunhqqd9PURiSN40c0rW2S2Sa0VGo1kpnn7XJ/4Pj+tbOXFWU0NXTPp6iMSRvGhBWF6RaHN3Hbqayni0ek/97NPr6jY6R7WMaXOcdAANSSvVySyTWip7ZKZ5+1yf+D4rpWqtlt1fHVwta5zD1OGoI7VF44niVIvhnFl+Hl7cerOcTx5ttYKuqaHVbhyHWIx3Dx8VkS6VnuVNdKNtRTu8HsPWw9xXdUysREdn0DR4sOLDEYf4/cXy9jZGOY9oc1w0II1BC+kXqS15luPOt0hq6RpdSOPMdZjPcfDxWOrccjGSMcyRocxw0c0jUELXuWY8+2yGqpQXUbj6TGe4+Hio+THx3hUN32n4XObDHy+8eP19mPIiLSrwsrxDHPZJZX17PtHXHGfv/E+H6/R1/mIY4aosr69mlOOccZ/2nifD9azsAAaAaALfjx895WXaNo6+M2aO3tHn6yAADQcgiIt61ixLMMc6cPuFvj+29csTR7fxHj4dvp68tXm3+709opOkk8+V3KOMHm4/wCSxvETHdC1+HBlwTGbtEe/hqxFy1c76qqkqJA0PkcXO4RoNSuJQ3z2eOewiIjwREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERARFyU8MtROyCBjpJHnRrR1ko9iJmeIca7NJLWQNe6lMjOIaOewHXTu17FneP4xSUMTZaxjKipPM8Q1azwA7fSsgAAAAAAHYFurhn3WLS7BltWL3v0z/AG0+ZpuPjMsnF38R1XtWTJ6+hlayokfVU/UWvOrgPA/+Fm92s1vuUZFRA0SHqlaNHj19vrWur7aam01ZhmHEx3OOQDk4f5+C8tW1O8I+p0Wq223xaW5jzH5hs+iqoKymZUU8gfG8aghcy1hjl6ntFTqNX07z9sj1+UeK2TR1MFZTMqKeQSRvGoIW6l+qFj27caayni0esfmPo5kRFm6ThrKaCspn09RGJI3jQgrW2R2We0VOh1kp3n7XJp8h8Vs9cNbSwVlM+nqIw+N40IKwvTqhzdx26msp4tHpP4lq2z3KptdYKind4PYep47itmWi401zo21NM7l1Oaeth7itd5HZZ7RVaHV9O8/a5O/wPiuCzXOptdYKinOo6nsJ5PHcVppeaTxKuaHXZduyzhzR8vvHj6w2ui6dpuNNc6NtTTO1B5Oaetp7iu4pMTyudL1vWLVnmJF8yMZLG6ORoexw0c0jUEL6RGUxy11lmPvtkhqaYOfRuPpMZ7j4dxXgxP6OVr+FruEg6OGoPgVuGWNksbo5GB7HDRzSNQQtd5Xj77ZKamnBfRvPLtMZ7j4dxUfJj47wqG7bVOCfjYY+X3jx+vszPHrvT3ajD4tI5WACSL8H0eC9Nait9ZUUFWyppnlkjfiI7j4LYdkyOguMbWvkbT1H30bzpqfA9v61nTJE9pdTbN2pqK9GWeLff9vaROzVePesit9ujcBK2ef72Jh15+J7FtmYj1dbNnx4a9WSeIc1/u9PaaTpZfOldyjjB5uP+Xita3GtqLhVvqal/E93xAdw8EuVbUXCrfU1L+J7viaO4eC6yi3v1KRuW5X1l+I7Vj0j8yIiLW5YiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiL9A1IHeg+6eGWomZDCx0kjzo1o6yVsbF7DFaYOll4X1bx57uxo7gvnFbFDa6cTyFstVI3m8cw0dw/zXuqTjx8d5XLadpjBEZcsfN7fT9iIi2u8Lq3Ohp7jSPpqlnEx3Ue1p7x4rtLEswyPoA+32+T7b1SytPtPAePj2enqxtMRHdE1uoxYMM2y+njz9GI3SkFDcJqUTMm6N2nG3qP/wDq7uN3ua0VPbJTPP2yP/yPFeQiiRPE8woFM9sWX4mLt4bgo6mGrpmVFPIJI3jVpC5VrHGr3NaKnQ6yUzz9sj/8jx/Wtk0lRDVU7KinkEkbxq1wUql4tC87duNNZTxaPWP+9nKiIs3RcNdSwVtK+mqYw+N40IP6x4rWuRWae0VXC7V8Dz9rk06/A+K2guCupIK2lfTVMYfG8cx3eI8VhenVDmblt1NZTxaPSfxLV9ludTaqwVEB1B5PYep47lsy03CmudG2ppnag8nNPW09xWt8htT7TXmnc8SMcOKN2vMt8R2FfFkulTaqwTwHVp5SRk8nj/8Adq00vNJ4lXdBr8m35Zw5f4+8ePrDayLqWq4U9yo21NM7Vp5Oaetp7iu2pMTyudL1vWLVnmJF8yxslidFKwPY4aOaRqCF9IjKY57SwHIMUqqaV01uY6eA8+Ac3s8PEfKscfBOx/A+GRru4tIK3CvOv12p7TSdLKeKR3KOMHm4/wCXitNsUequazY9PHOWL9Ee/vDWk1NWQU7Xzskijf7UP1HF6B2jxXWXZuVbUXCrfU1L+J7uodjR3DwXWWiVVydPV8np9REXvYNh2T5xevqNidlqrtXdGZXRwgaMYOtznEhrRqQNSRzIHWQvGDwUXbvNsuFmutVartRz0VdSSGKenmYWvjeOsEFdRAREQEWS4vgOZ5RZbhesexq43O324f6XPTxFzY9BxEeJA5kDUgc1jSAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIspynZ3m+LY7bshyHGrhbbXctBS1E7NGvJHEARrq0kAkBwBIBI6liyAiIgIiICIiAiIgIiICIiAiIgIiICIiDKMQyI0Tm0Nc8mmJ0Y8/7Pw9H6lngIcAQQQeYIWm17ljyWutjBC4Copx1MedC30HsW7Hk47SsO17z8GPhZ/4+0+P02SixVubUXBq6jqA7uBBHx6rybxl9ZVxuhpIxSsPIuDtXn19i2zlrDtZd60lK8xbn6Q9TMMj9jh9vt8n27qllafaeA8f1enqwZEUa1ptPMqfrdbk1eTrv/5HgREWKIL2MZvk1oqNHcUlK8/bI+7xHj+teOi9iZieYbcOa+G8XpPEw3BS1ENVTsqKeQSRvGrXBcq1bY73W2l56BwfE46uif7U+PgVlEGbUJZ9vpKlju5nC4fGSFJrlifVctLveny0/wAk9NmVLx8lvkNop9BpJVPH2uPu8T4frXiXHNdWFlBSlrj1PlPV6h/msSqZ5qmd89RI6SR51c53WVjfLHpCNuG+Y616NPPM+fBV1E1VUPqKiQySPOrnFcSIo6pTM2nmXfsl0qbVWCeA6tPKSMnk8f8A7tWzLXX01xpG1NM/iaeRB62nuPitSLuWm51dsqOmpJOHX2zTza4eIWymTpdbbN0tpJ6L96T/AF/ptlFiVLm9OWD2VRStd2mMhwPx6L4rs2ZwEUVG4uPU6Y6Aeodfxrf8SvlZp3jRxXq6/u9++3antNIZpjxSO5Rxg83H/LxWtLnXVFxq3VNS/ie7qHY0dw8F+V9ZU19S6oqpTJIe09QHcB2BddaL36lW3Lc76y3Edqx6R+ZERZPsxwTI9ouX0uM4zR+yKubzpJHaiKnjBHFLI771g1HiSQACSAdblvrZfgeR7R8vpsZxmj6eqm86WV+oipogRxSyO+9aNR4kkAAkgGzLYfssxzZPh8djskYmqpeF9wuD2AS1koHtj+C0akNZro0HtJJP5sN2VY5snw9lksrBPWTcL7jcHsAlq5QOs/gsGpDWa6NBPWS5xz5BWRvoADeYy/QafbKX6JCtPLcO+h75nL/x6X6JCtPICIiCwLyc3uG3X84p/o9OsI3w924g1u0PZ7Qag8U12tULertdPC0fG5g9I7Qs38nP7ht0/OKf6PTqSyCmdFMjfD3bzEa3aJs9oNY/Omu1qgZ7XtdPC0dna5g6usctQIboCIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgKYe5tu6eyzR7R8+of9GHDNZ7ZM3+F7WzytP3va1p6+s8tNfP3Od3Q359JtCzyh/1Q0iW126Zv/vCOqaQH/ZdzT7frPm+2nKAANANAgjl5Q33Baf4cp/m5lXorDfKFgf8AoHD4Xum/YlVeSAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICsi3Gccs1o3f7PeKCgiiuN5dNNX1Omsk5ZPJGwE/gta0ANHIak9biTW6rONzH3s+H/zdT9KmQbgREQVkb6Hvmcv/AB6X6JCtPLcO+h75nL/x6X6JCtPICIiCwLyc/uG3T84p/o9OpLKNPk5/cNun5xT/AEenUlkBVp76+NWXGNvVxpbFQx0NNVU0NY+GIaMbK8HjLR2Aka6DlqTorLFXV5QD3wc3wVTf4kEfEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBbf3QMOseb7crXacipRV2+GGWrdTu9pM6NurWv726kEjt00PIlagUgNwT3w1L8G1X7IQWLsY2NjWMa1rGjRrQNAB3BfqIgjp5Qr3A4vhqm/YlVeSsN8oV7gcXw1TfsSqvJAREQEREBERAREQFIXdx3ajtbwmpyioy76jRR1z6SOFlB07ncLWOLiTI3T2+mnPqUelYX5PL3Baj4cqPm4UGD/YNUv8AxLm/sUfvk+wapf8AiXN/Yo/fKYqIKzdpm7rnWM7T48Kx631+TtqYWT0ldDRmKN7TydxuJLGcJBB1dp1Hlrott7Ptyaungjqs7yxlG5wBdRWuLpHN8DK/kD6GuHiprogj5b9z/Y7SxBk8N9rnDrfPcNCf0GtHyLr3jc42SVsTm0U2Q2yTTzXQ1rXgHxEjHaj4lItEECdqG5rmFjppa/CrvT5LTsBcaSRgp6rTubqSx/xtJ7AVGW5UNbba+eguNJPR1dO8xzQTxlkkbh1tc08wfAq5BaW3nNhNm2rWCWvoIYKLLaWImjrQOET6DlDMe1p6g7raeY5aghWgi7N0oKy13OqttxppKWspJXQzwyN0dG9p0c0jvBBC6yAiLbW7nsPv+16+OMbn27HqR4FdcnM159fRRj76Qj1NB1PWAQ11i2OX7KbxFZ8ctFZda+X2sFNEXu07zp1AdpOgHapKbPty3L7nFHVZnkFDYGOAJpaZnsqceDiCGNPiHOUxdmez3EtnNgZZsUtMVFDoOmmI4pqhw++kf1uPyDqAA5LKkEbrLuabKqONvs+uyO5SffGSrZG0nwDGAj4yvUm3RdjL4+Ftuu8R09sy4v1+XULfqIIp5RuS4bUxPdjeXXu2zHmBWRx1UYPdo0RnT1lR+2qbsm1DBIZa9tujyC1RgudVWsmRzG974iA8cusgEDvVlqIKZ0VjW8Zu041tFpam945DTWPKtC/po28MFY7umaOpx/3gGvfxdle+T2K74zf6yw32gmoLlRSGKeCUaFrh8hBGhBHIggjkUHmrsW6lfXXCmoonNbJUStiaXdQLiANfjXXXp4n91Vo/Lof2wgmDFuN0fRt6TaRUceg4uG0DTXt0+2r6+wbt/wDxIqv7Ib+9UwkQQqyvcqhtWMXS6UW0CapqKOklqI4ZLUGtkLGl3CSJSRrpprodNeoqO2yPZPm21G6Po8VtfSQQuAqa6d3R01Pr+E/Tr/ktBd4K148xoV1LRa7ZaKMUdpt1Jb6YOLxDSwtiZxE6k8LQBqT1lBFvB9ynFKSmZLmOT3O6VWmroqANp4Qe7Vwc5w8fN9CzZ+6TsWdB0Ys9zY7/AHguUvF8p0+Rb5RBXzvd7v2ObJ7DbMixm7XKalra32JJS1pY9zHFjnhzXta3l5hGhBPMc13tgO6vRbSdmNuzSvzGot31QfMIqaCiD+Bscr4+bi4aklhPV1aLa3lIfckx/wCHm/R5lnW5H72TFPTW/TJ0GrfsHrH/AMQLj/Z7P/upK7LsNt+z/AbTh9snnqKW2xOY2WbTjkc57nucdOQ1c5x07OpZKiAiIgjrtl3VbHtG2h3HMpMsuNsqLgIzNA2mZKwOZG2MFp1BAIYOR1568+wYf9g9Y/8AiBcf7PZ/91LpEEM8o3Kbfb8buVfb88qpKumpZJoo56BoY9zWlwa4h+oB00156a66HqUM1cJl33KXf8hm+bcqe0FgXk5/cNun5xT/AEenUllGnyc/uG3T84p/o9OpLICg5vj7Ls/zbeHh+tnFrjcIKu2wNjq2RaU7S0uDuOU+YzTuJB5jvCnGiCGmAbkrDBHUZ3l72yEAvpLRGPN8OmkB1/Q9ZW0rduk7FqWIMns1zrnD7+e5Sgn9AtHyLfKINA3fdD2NVsJZTUF4tjiOT6a4ucR/Wh4+RaY2m7lt+t1PLXYDkEV6a0EigrmiCcjubIDwOPp4Apyogp2v9nutgu9RaL3bqm3V9M7gmp6iMsew+IPxg9oXQVou8RsXsG1vGHwzxxUeQU0Z+p1yDfOY7rEb9Oboyesdmuo59dZeTWS543kFdYb1SPpLjQTugqIX9bXNPyjtBHIgghBtLdAwrDc/2ufW7msE1TSPt00tNBHO6LpZ2lp0LmkO0DOkPIjmApk/YrbDf4oTf2rVfvFAfYbk/wBZu17F8kdJ0cNJcY/ZDtdNIXngl/uOcrZEGk/sVthv8UJv7Vqv3iijvp7JLBsvy2yy4pST0lmu1I8iGSZ0oZNE4B+jnEnQtfGdCTz19AsaUb/KE439VtilPfYo9ZrHco5Xu06oZdYnD9N0XxIK90RfoBJAA1J6ggljub7AMQ2g4JcMrzehqqpklaaagiZUvhaGMaON/mEE6ucW9f3hW9PsT9iX8W63+06j/wC6z/YdigwjZJjWMOj6OejoGeyW/wD93+fL/fc5Zmg0TUbpmxSWnkjjsVwge5pDZGXOYuYe8cTiNR4ghV5ZfZKrGsru2PVw/wBJtlZLSS8tNXRvLSR4HTVXBqu3f6xP6gbcX3qGLhpcgo46sEDQdMwdHIPT5rHH8dBHlc1FTT1lZDR00ZknnkbHGwdbnOOgHxlcK2nunY39c+8DidE+Pjgpav2fNqNQGwNMo18C5rR60EzrNun7Gaa00lPcMdqK6rjha2epdcqhpleB5ztGvAGp1OgAXb+xW2G/xQm/tWq/eLdiIIi70WwTZBg2xa85JZbNU2y6UzoW0kja+aXje+VreEtkcQRwlx7xpqoQqbflJcn6GwYvh0MnnVVRJcahoPMNjb0cevgTJJ+ioSICyTZ7g2V59fG2bE7LU3Oq5GQsGkcLfwpHnRrB4kjw5rMt3HYtetr2TOhjfJQWCicDcbhw68OvMRx68nSEeoDmewGyHZ9hWNYFjcFgxa1w0FFENXcI1fK7tfI7re4959A0AAQRi2Z7ldrghiq9oWRz1c5ALqG1/a4mnudK4cTvU1vpW88d2B7HbFE1lHs+ss/D99XRGrcfHWYuWy0QYuNnOz0M6MYJi4Z1cP1Ig0/YXgX/AGE7H75G6Ot2eWGPi63UdP7Ed8cPCVsdEETNpO5Zj1bDJVYDkFVaqrQltJcT01O49weBxsHieNRH2mbOcx2cXn6mZbZZ6F7yegnHnwTgdscg813Zy6xrzAVta8fMsYsGYY/UWHJbXT3K3VA0fDM3XQ9jmnra4djhoR2IKf0W6d5/YTc9kl8bW0L5rhitdIW0dY4efC/mehl05cWg5O5BwB6iCBpZARFz2+jq7hX09BQU0tTV1MjYoYYmlz5HuOjWtA5kknTRBwtaXODWglxOgAHMqQ+xzdOzvM4IbpkkgxS0yAOb7JiL6uVve2HUcI8XkHt0IUht13dutOz6jpcny6nguOWvaJGMcA+K3fyWdjpB2v7OpvaXSKQaLwvdT2PY9Ew1lmqsgqm6azXKpc4a9v2tnCzT0g+lbFodluzShjEdJs+xWIDtFog1PpPDqfWsvRBh1w2V7Mq+Msq9nuKyg8tTaYA4eghuo9S1xmu6fsgyCJ7qC11mPVTtSJrdUu4dezWOTibp4ABb4RBXPtl3Vs+waGa6WPTKrNGC50lHEW1MTe98OpJHiwu7SdFH88joVcwo1b027TbM2pKvLMIpIaDKGAyzU0YDIbj2kEdTZT2O6nH23XxAK/EXLV089JVS0tVDJBUQvMcsUjS1zHA6FpB5ggjTRcSAiLfe6lu/1e1O4/V+/wDTUeI0kvC97fNkrpB1xRnsaPvn9nUOepaGvNlGynONp1yNJilnfNBG4NqK6Y9HTQfjPPb28I1d4KWuzzctxO3wx1Gb3+uvVVoC6nov9Gpwe0E83u9ILPQpN45ZLRjllprNYrdTW630rOCGngYGsaP/ACT1knmTzK9BBrOzbAtjdpibHS7PbLKG9tXGak/HKXFehVbGdktTGY5Nm+KtBGmsdrijPxtaCs8RBoTM90vZBfoXm222ux2pPMS0FU5zdfFknE3TwGix7d83Z73ss2xPyibJbfc7PFRyw0/DE+Ooe5+g85nNrQBrzDjr3BScRAREQRz8oYSNgsA773T/ADcqrzVhflDfcFp/hyn+bmVeiAiIgIiICIiAiIgKwvyeXuC1Hw5UfNwqvRWF+Ty9wWo+HKj5uFBI1ERAXj3/ACrF8eIF/wAks9pLhqBW10cGo/puCjFvtbeMmw+9M2fYfK+11ElI2orbmw/bg15IbHEfvOQ1L+vmNNNNTCKsqqmtqpKusqJqmolcXSSyvL3vPeSeZKC3fHsvxPIpDHj+UWS7vA1LaGvinIHfoxxXtqmykqaijqo6qknlp6iJwfHLE8texw6iCOYKnpuSbc7pnUNTg+X1Zq73QQdPR1rz59XACA5rz2vbq3n1uBJPNpJCT6IiCCnlENn0Nny615/boBHDegaavDRoPZMbRwvPi9nL/lk9qikrI9+60x3Ldyu9U9oc+2VdLVx+BMrYif0ZXKtxBmWxjZ/dNpm0O3YnbCY+nd0lVUcOop4G+3kPoHIDtcWjtVpmEYvZcMxagxrH6NtJbqGIRxMHW7vc49rnHUk9pJUePJ5YNFaNm9dnFTCPZt9qHQ07yObaaFxby7uKTj17+BqlCgIi0VvWbeqbZPaorRZY4K3K6+Ivgik5x0kXMdNIO3Ughre0gk8hoQ3VdbnbbTSGrutwpKCnHXLUzNiYPW4gLw7ftE2f3GqFLb85xirqCdBFBdoHvJ7tA7VVU5nluS5leJLvlF6rLrWvJ+2VEhIYD2Mb1Mb4NAC8RBcwirJ2C7wWZ7MLlT0slZUXnGuINntdRKXBjO0wuP8ABuHcPNPaO0WP4Zklny/F7fkthq21Vtr4RLDIOR06i0jscCCCOwghB66jvvqbGoc8wyXLrJSD65rLAX+Y3zqymbqXRnvc0aub62/fDSRCIKZ16eJ/dVaPy6H9sLYe9fg0WAbbr1a6OEQ22sIuFC0DQNil1JaPBrw9o8Gha8xP7qrR+XQ/thBcKiIgIhIAJJAA5klQU3ot6G73e7VmJbNri+32eBzoam607tJqxw5HonjmyPXqcObuvUA6EJg5dtHwHEZTBkmYWW2VA59BPVsE2nf0YPF8i8K27d9j1wnENPtDsLXnkOnqOhb8cgA+VVYSvfLI6SV7nveS5znHUknrJK+UE5/KIXqz3LZNjIt11oawzXkTRex52ycbGwyAuHCTqAXNGviFsLceraOXdqxuCOqgfLTyVkczGyAujcaqVwa4dh4XNOh7CD2qtZEFyvTRf71n6QX2qZ1Z7ud1E9Vu2YdLUzSTPFPNGHPcSQ1lRK1rfQGtAA7AAg22iIg+HyxMOj5GNPcXAL59kU/+/i/TCrP303vfvMZaHvc7hdStbqddB7Eh5BacQW8Z9dbbb8HvlbW19NT08VvndJJJIA1o6MqodEQWBeTn9w26fnFP9Hp1JZRp8nP7ht0/OKf6PTqSyAiKJu/HtwynDbtTYBiUz7XNVULausuUbtJuB7ntEcR+89oSXDnzGmmh1CSmS5rh+Mv4MiyqyWh5GoZW18ULj6A5wJXWx7aHgWQ1TaSxZrjtyqXHRsFNcopJD/QDtfkVSVTPPU1ElRUzSTTSOLnySOLnOJ6ySeZK+GktcHNJBB1BHYguXRQ+3Gdud4vd1GzTL6+WvmMLpLPWTv4pTwDV0DnHm7zQXNJ5gNcNT5ukwUBQw8oxs+hidZ9pNBAGPmeLdcy0e3PCXQyHx0a9pPgwKZ61Nvf2mO77ueXQvaC6npmVbD2tMUrH6j1NI9ZQVgK13d+yf68di+K5A6TpJ57eyOodr1zRfa5D+mxxVUSnf5OLJ/Z+zy/YpNJxS2mvbUxAnqinb1DwD43n+kglSsU2w439d+yzJsbDOOWvts0cA/8A68JMZ9Tw0+pZWiCmcgg6HkVsndjxP689ueL2eSLpKWOrFZVAjzeihHSOB8HcIb/SXR3gcb+tLbVllhbH0cUNykkgbp1QynpYx+g9qkV5NrE+OtyfOJ4uUTGWuleR2u0kl9YAh/SKCaaIiAo0eUNxP6sbIqLJ4YuKosFc0vdp1QT6Ru/viFSXWP7SMbgzDAb7i9RwhtzoJaZrndTHuaeB39F2h9SCodS38m1jfsjK8pyyWPzaKjjoYXEdbpX8btPECJv6SibV089JVzUlTG6KeGR0cjHdbXA6EH0EKxbcLxv6h7AKS4SR8M17rZ652o58IIiZ6tIuIfjIN+oi6GR3WlsWPXK+VruGlt9JLVTHXqZGwud8gKCuLfbyf65d4O8xxycdNZ447ZDz6jGOKQeqR8g9S1bguM3PMswteL2aLpK65VDYItepuvtnu/ktALj4ArpX25VV5vdfeK1/HVV1TJUzO73vcXOPxkqVfk4cNirMkyDOaqIO+p0LaCiJGoEknnSOHcQxrR6JCgl1svwmzbPMIt2KWOINpqOPR8pGj55T7eV/8px5+HIDkAsmREBY1nme4bgtE2sy3IqC0xvBMbZpNZJNOvgjGr3eoFYPvR7YqfZHg7amlZFU5Dci6G2U8nNoIA4pnjtazUcu0lo6tSK2MpyC95TfKm+ZDc6m5XGpdxSzzv4nHwHYAOwDQAcgEFhkm9rsVbVdC29XJ7NdOmbbZeD08xxfItlbPdpmB5/E52I5PQXN7G8T4GuMc7B3mJ4DwPHTRVKrt2a53GzXSnulprqihrqZ4kgqKeQskjcO0EcwguNRaJ3RNt52q41Nar66JmVWpjTU8ADRVwk6CdrR1HXQOA5AkEaBwA3sg8XOMYs+Z4pccZv1KKm318Jilb2t7Q5p7HNOhB7CAqqdquF3LZ7n92xG6+dNQTFrJQ3QTRHnHIPBzSDp2cx2K3BQ58pFhsZo8cz2miAlbI611jgObgQ6SEn0aSjX+UEELVNTcA2RQx0Ltqt9pQ+eVz4LJHI3+DaNWyT+knVje4Bx7Qoe4rZqrIsntdgov/dXKsipIeX30jw0fKVbrjNmocdx23WG2RCKit1NHTQN7mMaGjXx5cyg9FEXHUzw0tNLU1MrIYYmF8kj3aNY0DUknsACD9qJoaaCSoqJY4YY2l8kkjg1rWjmSSeQC0/lO81sYx+rfSSZa24zsOjm26mkqGj0SNHAfU4qHe9Dt7vO0+/1NptFXPRYfTSltNTMJaavhP8ADS9+vWGnk0actdStHILN8V3mdjOQ1bKSLLWW+oedGtuNPJTtP/McOAetwW3oJYp4WTwSMlikaHMexwLXNPMEEdYVNS3zurbfbts1v9LYb7WTVeHVUoZNFIS40Jcf4WLtAB5uaORGpA1QWPoviCWKeFk8MjJYpGh7HsOrXNI1BBHWF9oIWeUA2RxUr49qlhpQxkz2wXuONugDzyjqPWdGO8eA9ZJUOlcBm2PUOWYjdsaubA6kudJJTSctS0OaQHDxB0I8QFUXe7dVWe9V1orWcFVQ1ElNO3uexxa4fGCgybYvgVftK2j2rEqEujbUycdVOBr0EDecj/SByGvW4gdqtUxex2vGceobBZaRlJbqCFsNPCzqa0d/eT1knmSST1qLHk4MPip8ayHOp4h7IrKgW6lcRzbFGA+Qjwc5zR/y1LlARFpLex22x7JsWio7R0M+U3RrhRRvHE2njHJ07x26Hk0HkTr1hpCDYe0DaLhGA0rajLskobVxjijikeXTSDvbG0F7h4gFamq98HY7DUGKOa/VLNdOlit+jT4+c4H5FXzkF5u2QXipvF8uNTcbhUv45qiokL3vPpPZ3DqA5BdBBZ/he8ZseyqpZSUWX09FVPOjYbjG+l1PYA94DCfAO1W2GOa9gexwc1w1BB1BCpoUrvJ+7QsqdtAdgNTdJauwSUMs8VNO4v8AYz2cJHRk82g6nVvVz101QTqREQRy8ob7gtP8OU/zcyr0VhvlCwP/AEDh8L3TfsSqvJAREQEREBERAREQFYX5PL3Baj4cqPm4VXorC/J5e4LUfDlR83CgkaiIgrq8oB74Ob4Kpv8AEo+KQflAPfBzfBVN/iUfEBbe3N6uak3ksRdC4t6SaaJ47C11PICD/wDuxahW1t0T3x+G/lcnzMiC0JERBqPfH97VmP8AMQfSYlWGrPN8f3teY/zEH0mJVhoLZ9iNnjsOx7ELTGwNMFnpukA7ZDG1zz63Fx9azFeThsjJcQsssZBY+3wObp3GNui9ZB+Pc1jHPe4Na0akk8gFUltcy+qzzaTfcrq5HO9n1b3wtd/s4R5sTP6LA0epWwZDBNVWC40tPr001LLHHp+EWED5VTsQQSCCCORBQfiIiApmeTdzGofJkmBVMrnwsjbdKNpPtPOEcwHgS6I6d+veoZqSnk66eaXbjcZ4weihsM5kPZzmhAHx/qQWCIiIIW+UttEba7C7+xg6SWKqo5XeDTG9g/vyKJmJ/dVaPy6H9sKZ3lK5GDE8OiJHG6vqHD0CNuv6woY4n91Vo/Lof2wguFREQeHtBJGBZCQSCLXUkEfzTlUGrfNoX3A5F8F1PzTlUGgIiICIiArONzH3s+H/AM3U/SplWOrONzH3s+H/AM3U/SpkG4EREFZG+h75nL/x6X6JCtPLcO+h75nL/wAel+iQrTyAiIgsC8nP7ht0/OKf6PTqSyjT5Of3Dbp+cU/0enUlkBV7+UQ93ij+Aaf52ZWEKvfyiHu8UfwDT/OzII3oiINg7t9VNR7e8HmgcWude6aIkfgveGOHxOKtXVUO777uuC/nBRfPMVryAtf7yAB2CZxqNf8AUlT82VsBYBvH+4LnPwJU/NlBVMpA7hGT/UHbzT2uWThp77RTURBPLpGjpWH06xlo/HUfl7OD32fF8ys2R02pmtldDVtAPtuB4dp69NPWgt/RcNDVQV1FBW0sglp6iNssTx1Oa4ag+sFcyCA/lGMb+p21Sz5JHHwxXi29G92ntpoHcLj+g+IepSi3SsT+s/YHjdFLF0dXXQfVGp1GhL5/PaD4hhY3+ivZ2ybJsT2r2+2UWUitDLbVeyIXUsojcdRo6NxLT5jgBrpoeQ0IWdwxxwxMiiY1kbGhrWtGgaB1AIPpcc1RBC+Jk08cbpXcEYe8AvdproNes6A8lyKBO/tnlYdudmtlqqnRvxWCKdhB/g6uRwl4v0RCgnsi8nDb5S5PiVoyKi09j3Oiiq4xrroJGB2npGunqXrIKy98DDpMZ3hr5SUtO7obxKy5UjWj2/T+3AH86JAPQrGNn1gjxbBbFjcQbw2y3wUpI++LGBpd6yCfWsZ2kbIMQz7M8byy+trBX4/KJIGwyNbHOGvD2slBaSWhw10BHWe9bCQFo7fjyj63N36608cnBU3qeK2xaHno48cnqMcbx61vFQf8pHlHsjKcZw+GTzKKkkr52g8i+V3AwHxAjcfQ9BEdWK7gFujot32Gqa0B1wulTUPPeQWxfqjCrqVkO4fUsn3cbTE06mnrKuJ3gTM5/wCp4Qb3REQVtb8uR1F93hLvRvlc6ls0MNDTt15DzBI/l38cjvUAtGLbu+NbJ7XvHZYyZpDamaKqicepzZIWO1HoOo9IK1EgIiINobqmS1GL7fsTq4ZHNjrK5lunbryfHOei0PgC5rvS0K0hVP7ALZPeNt+FUNO0ucb3SyO06wyORr3n1Na4+pWwIC0tvt26O4btuSvc0GSjdTVMZPYRURg/3XOW6VqLfIqWUu7Xl73kDjhgiHiXVMTf/KCEe5rbY7nvJYlFK0OjhlnqTr2GOnke3+8GqzlVpbkNSyn3lsZbIQBMyriBPeaaUj9WnrVlqAtJ77mS1GObvd5bSSOinussVta8HmGyEmQeuNj2+tbsUe/KA2yev3fn1ULS5tuu1NVS6djSHxa/HK1BXWiIgIiILMty3JajJd3uwvq5HS1FtMlue4nXVsTvtY9UZYPUtzLQO4NbJ7fu9UlRM0tbcLjU1Ueva0OEevxxlb+QFVvvX26O2bxOaU0bQ1r7h7IIHfLG2U/K8q0hVgb4FSyq3kcyljIIbUxRnTvZBGw/K0oJv7mVvZb923FGtaA6eOeoefwi+eQj5NB6luBan3QaplZu34dKwghtLJEfSyeRh+Vq2wgKrveyyWoyfeAyuomlc6OgrXW2Bp6mMgPRkDwLmvd6XFWiKqfePtNRZdvObUVQwtc681FSwEfeTPMrD+i9qDX6IiApB+T/APfBw/BVT/hUfFIPyf8A74OH4Kqf8KCxVERBHTyhXuBxfDVN+xKq8lYb5Qr3A4vhqm/YlVeSAiIgIiICIiAiIgKwvyeXuC1Hw5UfNwqvRWF+Ty9wWo+HKj5uFBI1ERBXV5QD3wc3wVTf4lHxSD8oB74Ob4Kpv8Sj4gLa26J74/DfyuT5mRapW1t0T3x+G/lcnzMiC0JERBqPfH97XmP8xB9JiVYas83x/e15j/MQfSYlWGgtR3ZMhjybYLh9yZIHvjtsdHMdefSQfaXa+JLNfWtjqFfk69osVPV3TZpcpw32S43C18R63hoE0Y8S1rXgfyXlTUQFWRvb7NKvZ1tauDo6dzbJeZX11tlA8zRx1fF4Fjjpp+CWntVm6xfadgWNbRsVnxzKKH2TSSHjjkYeGWnkA5SRu+9cNfQRqCCCQgqPRSS2kbnu0ax10smIvpMntxJMfDMynqWt7nMkIaT+K469w6lhFBu27bKyqFOzBKuI66F89TBGweOrngfEg1IrAtwXZrVYns+q8vu9O6G4ZGWOp43jR0dIzXgPhxlxd+KGFY9sG3QKazXGnv8AtMq6S5zwuEkNoptXU4cOYMzyBx6fgAcPLmXDkpbNaGtDWgBoGgAHIIP1EXUvVyobNaKy7XOpZTUNFA+eomefNjjaCXOPoAQQh8pHkMdZneM4zFIHG20ElVKAep07wAD48MIPod4qMeJ/dVaPy6H9sL2tsOZ1O0HaXfMuqQ5gr6kugjcecULQGxM9IY1oPjqV4uJ/dVaPy6H9sILhUREHh7QvuByL4LqfmnKoNW+bQvuByL4LqfmnKoNAREQEREBWcbmPvZ8P/m6n6VMqx1ZpuUyiXdlxI8tWiraQPCrmCDciIiCsnfRBG8zl+v4dL9EhWnVObfF3dckzjKxnWCQ01ZXTwMhuNvfK2KSVzBwtlY55DT5mjSCRyYNNddBGh+79tmZUdAdn13L9dNQGFv6Qdp8qDWCLa1/3d9r1hxOvye8YoaS30EXTT61kD5Gxj2z+BrydG9Z7dOfetUoLAvJz+4bdPzin+j06kso0+Tn9w26fnFP9Hp1JZAVe/lEPd4o/gGn+dmVhCr38oh7vFH8A0/zsyCN6IiDOt333dcF/OCi+eYrXlVDu++7rgv5wUXzzFa8gLAN4/wBwXOfgSp+bKz9YBvH+4LnPwJU/NlBVMiIgs83P8n+und9xqeSTjqbfCbbPz1IMJ4Ga/wDL6M+tbcUNfJsZPqzK8Mlk6jFc6Zmv/KlPzKmUgIiIPiomip6eSonkbHFEwve9x0DWgakn1KozabksuY7Qr/lEpd/rOvlqGB3WyMuPA31N4R6lY7vd5X9aWwHJKqOTgqq+EW2m56EunPA7TxEfSO/oqsBBYnuCZX9XthzbLNLxVNgrZKXQnU9E89LGfR572j8RSFUAPJ4ZX9SNrdwxiaXhgv1Aejbr7aeDV7f7hmU/0BERAVWG85k/13bdsruzJOkp2VzqSnIPIxwARNI8DwcX9JWT7Wclbh2zPI8nLg19ut000OvbLwkRj1vLR61Ug9znvc97i5zjqSTqSUH4pv8Ak28njmxjJ8OlkAmpatlxhaTzcyRojfp4Axs/TUIFsPd32hybMdq1qyZxe6g1NNcY29b6Z+gfy7S0hrwO0sCC1VFwW+rpbhQU9fQ1EdRS1MTZYZo3atkY4atcD2gggrnQRZ39dkdZlFjptoWPUrqi5WeAw3CCNur5aUEuDwB1mMlxI/BcT96oGq5hR02y7pmE5rXz3nG6t+KXSZxfK2CESUkrj1kxajgJ72kDt4SUFeSKU0m5LnwquGPLMZdT6+3cZw/T8XoyPlW09k+51iWO18N0zS6vyioicHMoxD0NID/LGpdJ6CQD1EFBiXk/9klZBVybU79SPhjMLoLJHI3QvDhpJUDuHDqxp7eJ57iZmL4hijghZDDGyOKNoaxjG6NaByAAHUF9oCi/5RbJ47dsttOLxyAVN4uIle3Xrhgbq7+++L4ipPSyRxRPlle2ONjS5znHQNA6yT2BVgb1O0pu03a3XXSilL7NQN9g2zudEwnWTT+W4ud36FoPUgxLZDkgxDajjWTSOLYbfcoZZ9OsxcQEg9bC4K22N7JI2yRua9jgC1zTqCD1EKmhWO7k206LOtlcFirqgOvuOsZSTtcfOlgA0hl8fNHAfFup9sEG+14+b45bsuxG64zdWF1FcqV9PLp1tDhycP5QOhHiAvYRBUhtTwW+bOs1rsWv8BZUUz9Ypg0hlTESeCVh7WuHxHUHmCsWVsu1jZjh20+xi15XbROYtTTVcR4Kimcessf2dmoOrToNQdAoq5TuQ3yOre7F82t1RTk6sZcqd8L2juLo+MO9Og9CCIiyvZRgd82j5vQ4tYoXOmqHgzzlurKaEEccr+4AfGdAOZCkhi25DfJKtjsoza3U9MDq9lup3zPcO4OfwBvp0PoUq9k+zLD9mNiNpxS2iDpNDU1Up46ipcOoyP7e3QDRo1OgGqD3cPsFvxXFbZjdqj6OhttKymhB6y1o01PeT1k9pJXqoiDiramCio56yqlbDTwRullkcdAxrRqSfAAKojaBfn5TnV9ySQOabpcJ6sNPW0PkLg31AgepTv37dp0OJbNX4db6gC9ZGwxPa0+dDR66SOP4/wDBjvBf+Cq9EE/fJ25PHc9ktyxl8gNTZbi5zWa9UM44mn9Nsqk2qw903aWzZntbo664TGOyXJvsG5EnkxjiC2X+g4Ak/g8Q7VZ2xzXsa9jg5rhq1wOoI70H6okb+2xytvkMW0zGqN9RVUUAhvFPE3V74W82TgDr4RqHfyeE9TSpbogpnRWK7YN1DAc3rZrtY5pcUukxLpDSQh9LI49bjDqND+I5o6yQStK1e5HmzagtpMxx6WHXk+Vk0btPxQ1w+VBFRSM8nxQVs+3Z9dDSzSUtLa5+nmaw8EZcWhoJ6gSddB26HuK2ThW5HRRVLJ8xzSWqhB1dS2ym6Pi/5ryeX9D1qUeA4XjGB2COx4paKe20TDxObGCXyO/Ce86ue7xJPd1IMgREQR08oWQNgkOvbe6fT9CVV5KwvyhvuC0/w5T/ADcyr0QEREBERAREQEREBWF+Ty9wWo+HKj5uFV6KwvyeXuC1Hw5UfNwoJGoiIK6vKAe+Dm+Cqb/Eo+KQflAPfBzfBVN/iUfEBbW3RPfH4b+VyfMyLVK2tuie+Pw38rk+ZkQWhIiINR74/va8x/mIPpMSrDVnm+P72vMf5iD6TEqw0Hfx+73GwXyivdoqpKS4UM7Z6eZnWx7TqD4+g8irOt3Xa/ZtreGx18Doqa+UjWsulAHc4n/htB5mN2hIPZ1HmFVsvcwbLMgwnJKbIsZuUtvuNOfNkZzDmnrY5p5Oae0Hkgt8RR02F71mHZnBBasxkgxi/kBpdK/SjqHd7JD7Qn8F/oDnKRMb2Sxtkje17HgOa5p1BB6iCg+kREBEXh5rl+MYXaHXbKb5RWmjbro+ok0LyOxjfbPPg0EoPcUGt97bxT5C+XZrh1aJbXBIPqvWxO1bUyNOohYR1saRqT2uAA5Dn5e8fvVXPMaapxjAG1NosUgMdRXP82qq29RaNP4Nh/SI69AS1RgQF6eJ/dVaPy6H9sLzF6eJ/dVaPy6H9sILhUREHh7QvuByL4LqfmnKoNW+bQvuByL4LqfmnKoNAREQEREBTt8nPmcFfgd4weon/wBNtVWaynjcRzp5dNeEdZ4ZA4nu6RveoJLKNlmc3zZzm9BldglDamldpJE4no6iI+3ieO1rh8R0I5gFBbgi15sW2w4btVsrKqw17IbkxmtXap3gVNOe3zfv2c+T28jrz0OoGw0BERBgu8J7hWdfAFb8y5VQq17eFIGwnOtTp/qCs+ZcqoUFgXk5/cNun5xT/R6dSWUafJz+4bdPzin+j06ksgKvfyiHu8UfwDT/ADsysIVe/lEPd4o/gGn+dmQRvREQZ1u++7rgv5wUXzzFa8qod333dcF/OCi+eYrXkBYBvH+4LnPwJU/NlZ+sA3j/AHBc5+BKn5soKpkREG39zrJ/rX3g8clkk4Ka5SOtk/PTiEw4WD+s6M+pWcqm63VdRb7hTV9JIYqimlbNE8dbXtIIPxgK3nCL/SZVh9oyShex1PcqOKqZwu1DeNoJb6QSQR2EFB7CIh5DUoIW+Ulyvjq8XwiGTlGyS6VTNe0kxxfFpN8ahytm70eWtzTbrk12gnE1HFVewqRzXatMUI6MOae5xa539JayQZHswyWXDdolgyiIu/1bXxVDw3rfGHDjb628Q9atyp5oqinjqIJGyRStD2PadQ5pGoI9SpqVnu6HlzMv2CY7O+dslZbYfqbVDi1c10Pms18TGGO9aDbaIiCNXlDco+pOx2ix2KThmvtxY17dfbQw/bHf3+h+NV+KSXlCcqZetsdJj9PM2SCw0DY3tDtQ2eU8b/7vRD1KNqAiIglluX7wdPjbINnWcVoitDn6Wq4TO82kc4/wMhPVGSeTvvSdD5p82crSHNDmkEEagjtVNC39u/7zuV7OIYLFfI35FjUejY4JJNKilb3RPPW0fgO5ctAWoLGkWvNme2rZttChiGP5LStrXga2+rcIKpp7uBx870sLh4rYaAiIgIsF2kbXdnez6CQ5Nk9FBVMHKhhf01S493RN1cPSdB4qF+37eqyXOoKiw4jDNjlglBZK/j/0yqYesOcOUbT2taST2uIOiDPd9LeEpqikrNmmDVzZmyaxXq4wu1bw9tPG4devU8jlp5vPVyhoiICyzZNnt82bZxRZVYZB08B4ZoHE9HUwn28T/A6eogEcwFiaILZ9kW0fGtp2JQ5DjlUHDQNqqV5HTUkunNjx+o9RHMLMVUZs5znKNn2Rx37FLpLQVbfNeB50czNebJGHk5p7j1dY0OhU3djm93hWTQw2/OGDF7sQGmY6vopXd4fzMfofyH4RQSWRdW03O3Xehjr7VcKSvpJBqyemmbLG70OaSCu0gIi6V7u9psdA+4Xq50Vto4/bz1c7Yo2+lziAg7qwPbbtTxvZTiUl6vkzZaqQObQUDHgS1cgHUO5o5cTuoDvJAOnNsu9/iVggnt2z+EZJdNC0VcjXMooj39jpfQ3QH8JQkzvL8jzjIp8gyi6T3Gvm5F8h0axvYxjRya0dgAAQcm0fMr5n2Y1+U5DUdNW1j9eFvJkTBybGwdjWjkPjOpJKx1EQFNLct3hKY0VHs0zmubDLEBDZbhM7Rr29TaeRx6iOphPIjRvIgawtRBcwir72Bb12R4VT09hzWGfI7HGAyKcPHsymb3BzuUrR2NcQR+FoAFMjZ5th2b55DGccyu3y1LwP9Cnk6GpB7ujfo46d41HigzxERARYrnm0bBsFpXz5Xk9ttha3iEMkodO/8WJur3eoLSuA7z9HtB262bDcetzaHH5xP0lZXENnqntic5jWNB0YC4dpLjy9rzBCSiIiCOXlDfcFp/hyn+bmVeisH8ojUQR7DaKnfNG2aW9wGOMuHE8COXXQdumo+NV8ICIiAiIgIiICIiAs+2cbZNpOzu0z2nD8nkttDPMZ3wGlgnb0hABcOlY7h1AHVp1LAUQbm+yj27fx5/7TRfuU+yj27fx5/wC00X7laZRB7mc5bkWb5FPkOU3OS5XOdrWvmexrPNaNAA1gDWgdwAXhoiAvQxu9XXHL7R32yVslFcaKUS088emrHDt0PI+g8iORXnog3N9lHt2/jz/2mi/cp9lHt2/jz/2mi/crTKINlZzt32r5vjk+O5Nlslba6hzTNTtoqeEScLg5oJjjaSAQDprpyC1qiICIiAs1wLavtFwVrY8Wy65UFO06imMglp/6p4cz5FhSIJI2XfL2rUUbY66hxq56db5qORjz/VyNb8i9ObfZ2gmPSHFcXY/Tre2dw+ISD9ai2iDeuUb2G2W9xPip7zQWWN40cLdRNadPB0nG4ekEFaav98vOQXF9xvt2rrpWP9tPVzulefDVxJ08F56ICIiAvqN745GyRvcx7SHNc06EEdRBXyiDb0W8vtwjibG3PKghoABdQ0zjy7yY9T6Svr7Jrbl/Hyb+z6X90tPog2ret4jbNeLTV2q4ZxUyUlXC6GdjKSnjLmOGjhxMjDhqDpyIWqkRAREQEREBERBz0NXVUFZFW0NTNS1MLw+KaGQsfG4dRa4cwfELbuJbze2fHY4YG5Y6600Q0EVzp2VBd+NIR0h9b1ptEElo99Laq1uhsuHvPe6jqNfknXQu2+JtgrYSym+t62uI5PpaAucP617x8ijwiDPM72x7Ts5oX0GT5lca2ifp0lKwtghk0II4o4g1rtCARqDoQsDREGabP9qm0HAaCooMQyertVJUy9NLCxjHsc/QDi0e06HQAEjr0HcFk32SO23+P1b/ANNT/u1qVEG2vskdtv8AH6t/6an/AHawDNcryLNL7JfMou090uL2NjM0ugIa3qaAAAAO4DtPevERAREQdi21tXbLjTXG31MtLWUsrZoJo3cL45GkFrmnsIIBW0RvI7bdPu+rf+mg/drUyINtfZI7bf4/Vv8A01P+7XmZTtz2sZPYaqxXzNK6rt1W3gqIOiijEjddeEljQdO8a81rhEBERAXLHUTxt4Y55GN7mvIC4kQc/suq/wDkzf1hX4aqqIINTMQesF5XCiAiIgL7imli16KV7NevhcRqvhEHP7Lqv/kzf1hT2XVf/Jm/rCuBEH64lxJJJJ5kntX4iICIiAiIgLL8e2n7RseibDZc4yGihb7WGO4SdEP6BPD8ixBEG0hvDbaAzg/9QLpp+LHr8fDqvAv+1XaXfonQ3bPMiqoXe2hNwkbGfSxpDfkWGIg/SSSSSST1kr8REBERAREQEREHo2K/Xyw1PsmxXm42qf8A3tHVPhd8bSCs6oNve2OijEcO0O+OA/30omPxvBK1oiDZNw287Yq6Mxz7Q76wEaawT9CfjYAVgt7vV4vlV7LvV2r7nUf72rqHzP8AjcSV0EQEREBERAREQEREGQ2jOc1s8QitOYZDb42jQNpblNEB6muC7Fw2j7Q7hEYq/PMpq4z1snu87wfUXrFkQfUj3yPc+RznvcdS5x1JK+URAREQEREBERAREQf/2Q==" alt="Northwood" style={{ height: 40, objectFit: "contain" }} />
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
