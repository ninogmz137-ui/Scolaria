/* global React */

// === État de succès post-signature ===

const SsIcon = {
  ChevronL: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
  ),
  CheckBig: ({ size = 44, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
  ),
  Check: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
  ),
  Cal: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
  ),
  Pdf: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
  ),
  Bell: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16z" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>
  ),
  Lock: ({ size = 11, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
  ),
};

const NSymbolSs = ({ size = 14, color = "#4338CA" }) => {
  const ellipses = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const x = 12 + Math.cos(a) * 7;
    const y = 12 + Math.sin(a) * 7;
    ellipses.push(<ellipse key={i} cx={x} cy={y} rx="1.6" ry="2.6" fill={color} transform={`rotate(${(i / 8) * 360} ${x} ${y})`} />);
  }
  return <svg width={size} height={size} viewBox="0 0 24 24">{ellipses}</svg>;
};

const SsC = {
  bg: "#F7F7F5",
  text: "#0F172A",
  text55: "rgba(15,23,42,0.55)",
  text35: "rgba(15,23,42,0.35)",
  border: "rgba(15,23,42,0.06)",
  borderL: "rgba(15,23,42,0.05)",
  indigo: "#4338CA",
  green: "#059669",
};

// === Top bar (back only, minimal) ===
const SuccessTopBar = () => (
  <div style={{
    display: "flex", alignItems: "center",
    padding: "14px 14px 8px",
    background: SsC.bg,
  }}>
    <button style={{
      width: 40, height: 40, borderRadius: 999,
      background: "transparent", border: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: SsC.text, cursor: "pointer", padding: 0,
    }}><SsIcon.ChevronL size={22} /></button>
  </div>
);

// === Hero check + headline ===
const SuccessHero = () => (
  <div style={{
    padding: "8px 28px 22px",
    display: "flex", flexDirection: "column", alignItems: "center",
    textAlign: "center",
  }}>
    {/* Ripple check */}
    <div style={{
      position: "relative",
      width: 110, height: 110,
      display: "flex", alignItems: "center", justifyContent: "center",
      marginBottom: 22,
    }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: "absolute", inset: 0,
          borderRadius: 999,
          background: "rgba(5,150,105,0.12)",
          animation: `successPulse 2.4s ease-out infinite`,
          animationDelay: `${i * 0.6}s`,
        }} />
      ))}
      <div style={{
        position: "relative",
        width: 84, height: 84, borderRadius: 999,
        background: SsC.green,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 10px 32px rgba(5,150,105,0.32)",
      }}>
        <SsIcon.CheckBig size={42} color="#FFFFFF" />
      </div>
    </div>

    <div style={{
      fontFamily: "Figtree", fontSize: 11, fontWeight: 700,
      color: SsC.green, letterSpacing: "0.8px", textTransform: "uppercase",
      marginBottom: 8,
    }}>Document signé</div>
    <div style={{
      fontFamily: "Figtree", fontSize: 26, fontWeight: 700,
      color: SsC.text, letterSpacing: "-0.6px", lineHeight: 1.15,
      marginBottom: 8, textWrap: "pretty",
    }}>Emma est inscrite à la sortie d'Orsay.</div>
    <div style={{
      fontFamily: "Figtree", fontSize: 14.5, fontWeight: 500,
      color: SsC.text55, letterSpacing: "-0.15px", lineHeight: 1.5,
      textWrap: "pretty",
    }}>Mme Dupont a reçu ton autorisation. Tu recevras un rappel la veille du départ.</div>
  </div>
);

// === Receipt card ===
const SuccessReceipt = () => (
  <div style={{
    margin: "0 16px 14px",
    background: "#FFFFFF",
    borderRadius: 18,
    border: `1px solid ${SsC.borderL}`,
    overflow: "hidden",
    boxShadow: "0 1px 8px rgba(15,23,42,0.04)",
  }}>
    <div style={{
      padding: "12px 16px",
      borderBottom: `1px solid ${SsC.borderL}`,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span style={{
        fontFamily: "Figtree", fontSize: 11, fontWeight: 700,
        color: SsC.text35, letterSpacing: "0.7px", textTransform: "uppercase",
      }}>Récapitulatif</span>
      <div style={{ flex: 1 }} />
      <span style={{
        fontFamily: "Figtree", fontSize: 11, fontWeight: 600,
        color: SsC.text35, letterSpacing: "-0.05px",
        fontVariantNumeric: "tabular-nums",
      }}>Réf · OR-2426-EM</span>
    </div>
    {[
      { lbl: "Document", val: "Autorisation Orsay" },
      { lbl: "Élève", val: "Emma Martin · 4ᵉB" },
      { lbl: "Sortie", val: "Jeudi 24 avril, 9h–17h" },
      { lbl: "Participation", val: "8 € · prélèvement mai" },
      { lbl: "Signé le", val: "Mardi 15 avril, 10:42" },
    ].map((r, i, arr) => (
      <div key={i} style={{
        padding: "11px 16px",
        borderBottom: i === arr.length - 1 ? "none" : `1px solid ${SsC.borderL}`,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{
          flex: 1, fontFamily: "Figtree", fontSize: 13, fontWeight: 500,
          color: SsC.text55, letterSpacing: "-0.05px",
        }}>{r.lbl}</span>
        <span style={{
          fontFamily: "Figtree", fontSize: 13.5, fontWeight: 600,
          color: SsC.text, letterSpacing: "-0.1px", textAlign: "right",
        }}>{r.val}</span>
      </div>
    ))}
  </div>
);

// === Aria proposed reminder ===
const SuccessAria = () => (
  <div style={{
    margin: "0 16px 14px",
    padding: "13px 14px",
    background: "linear-gradient(135deg, #EEF2FF 0%, #F0FDFA 100%)",
    borderRadius: 14,
    border: "1px solid rgba(67,56,202,0.1)",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <NSymbolSs size={14} color={SsC.indigo} />
      <span style={{
        fontFamily: "Figtree", fontSize: 11, fontWeight: 700,
        color: SsC.indigo, letterSpacing: "0.6px", textTransform: "uppercase",
      }}>Aria propose</span>
    </div>
    <div style={{
      fontFamily: "Figtree", fontSize: 13.5, fontWeight: 500,
      color: SsC.text, letterSpacing: "-0.1px", lineHeight: 1.45,
      marginBottom: 10, textWrap: "pretty",
    }}>Mettre la sortie dans ton agenda et te rappeler la veille à 19h ?</div>
    <div style={{ display: "flex", gap: 8 }}>
      <button style={{
        flex: 1, height: 38, borderRadius: 12,
        background: SsC.text, color: "#FFFFFF",
        border: "none", cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        fontFamily: "Figtree", fontSize: 13, fontWeight: 700,
        letterSpacing: "-0.1px",
      }}>
        <SsIcon.Bell size={14} color="#FFFFFF" /> Activer le rappel
      </button>
      <button style={{
        height: 38, padding: "0 14px", borderRadius: 12,
        background: "#FFFFFF",
        border: `1px solid ${SsC.borderL}`,
        color: SsC.text55, cursor: "pointer",
        fontFamily: "Figtree", fontSize: 13, fontWeight: 600,
        letterSpacing: "-0.1px",
      }}>Plus tard</button>
    </div>
  </div>
);

// === Secondary actions ===
const SuccessActions = () => (
  <div style={{
    margin: "0 16px 12px",
    background: "#FFFFFF",
    borderRadius: 18,
    border: `1px solid ${SsC.borderL}`,
    overflow: "hidden",
    boxShadow: "0 1px 8px rgba(15,23,42,0.04)",
  }}>
    {[
      { icon: SsIcon.Pdf, label: "Télécharger l'attestation signée", caption: "PDF · 184 Ko" },
      { icon: SsIcon.Cal, label: "Voir dans l'agenda", caption: "Jeudi 24 avril" },
    ].map((a, i, arr) => {
      const Icn = a.icon;
      return (
        <div key={i} style={{
          padding: "13px 16px",
          borderBottom: i === arr.length - 1 ? "none" : `1px solid ${SsC.borderL}`,
          display: "flex", alignItems: "center", gap: 12,
          cursor: "pointer",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(15,23,42,0.05)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, color: SsC.text55,
          }}><Icn size={17} color="currentColor" /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "Figtree", fontSize: 14, fontWeight: 600,
              color: SsC.text, letterSpacing: "-0.15px",
            }}>{a.label}</div>
            <div style={{
              fontFamily: "Figtree", fontSize: 12, fontWeight: 500,
              color: SsC.text35, letterSpacing: "-0.05px", marginTop: 1,
            }}>{a.caption}</div>
          </div>
          <span style={{
            fontFamily: "Figtree", fontSize: 18, fontWeight: 400,
            color: SsC.text35,
          }}>›</span>
        </div>
      );
    })}
  </div>
);

// === Bottom bar with primary close ===
const SuccessBottomBar = () => (
  <div style={{
    flexShrink: 0,
    background: "rgba(247,247,245,0.95)",
    backdropFilter: "blur(12px) saturate(180%)",
    WebkitBackdropFilter: "blur(12px) saturate(180%)",
    borderTop: `1px solid rgba(15,23,42,0.07)`,
    padding: "12px 16px 18px",
  }}>
    <button style={{
      width: "100%", height: 50, borderRadius: 16,
      background: SsC.text, color: "#FFFFFF",
      border: "none", cursor: "pointer",
      fontFamily: "Figtree", fontSize: 15, fontWeight: 700,
      letterSpacing: "-0.2px",
    }}>Retour à la messagerie</button>
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      marginTop: 8,
    }}>
      <SsIcon.Lock size={11} color={SsC.text35} />
      <span style={{
        fontFamily: "Figtree", fontSize: 11, fontWeight: 500,
        color: SsC.text35, letterSpacing: "-0.05px",
      }}>Signature horodatée le 15/04 à 10:42</span>
    </div>
  </div>
);

// === SCREEN ===
const SignSuccessScreen = () => {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: SsC.bg,
      display: "flex", flexDirection: "column",
      fontFamily: "Figtree, sans-serif",
    }}>
      <style>{`
        @keyframes successPulse {
          0% { transform: scale(0.7); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>

      <div style={{ paddingTop: 56 }}>
        <SuccessTopBar />
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
        <SuccessHero />
        <SuccessReceipt />
        <SuccessAria />
        <SuccessActions />
      </div>

      <SuccessBottomBar />
    </div>
  );
};

window.SignSuccessScreen = SignSuccessScreen;
