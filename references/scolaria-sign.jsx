/* global React */

// === Détail message à signer — Autorisation sortie Orsay ===

const SgIcon = {
  ChevronL: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
  ),
  Share: ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><path d="M16 6l-4-4-4 4M12 2v14" /></svg>
  ),
  Lock: ({ size = 13, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
  ),
  Check: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
  ),
  Eye: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  Cal: ({ size = 13, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
  ),
  MapPin: ({ size = 13, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
  ),
  Euro: ({ size = 13, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5a8 8 0 1 0 0 14M3 10h12M3 14h12" /></svg>
  ),
  Clock: ({ size = 13, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  ),
  Person: ({ size = 13, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
  ),
};

const NSymbolSg = ({ size = 14, color = "#4338CA" }) => {
  const ellipses = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const x = 12 + Math.cos(a) * 7;
    const y = 12 + Math.sin(a) * 7;
    ellipses.push(<ellipse key={i} cx={x} cy={y} rx="1.6" ry="2.6" fill={color} transform={`rotate(${(i / 8) * 360} ${x} ${y})`} />);
  }
  return <svg width={size} height={size} viewBox="0 0 24 24">{ellipses}</svg>;
};

const SgC = {
  bg: "#F7F7F5",
  text: "#0F172A",
  text55: "rgba(15,23,42,0.55)",
  text35: "rgba(15,23,42,0.35)",
  border: "rgba(15,23,42,0.06)",
  borderL: "rgba(15,23,42,0.05)",
  indigo: "#4338CA",
  rose: "#DB2777",
};

// === Top bar (back · "Autorisation" · share) ===
const SignTopBar = () => (
  <div style={{
    display: "flex", alignItems: "center", gap: 8,
    padding: "14px 14px 12px",
    background: SgC.bg,
    borderBottom: `1px solid ${SgC.borderL}`,
  }}>
    <button style={{
      width: 40, height: 40, borderRadius: 999,
      background: "transparent", border: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: SgC.text, cursor: "pointer", padding: 0, flexShrink: 0,
    }}><SgIcon.ChevronL size={22} /></button>

    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{
        fontFamily: "Figtree", fontSize: 15, fontWeight: 700,
        color: SgC.text, letterSpacing: "-0.2px",
      }}>Autorisation</div>
      <div style={{
        fontFamily: "Figtree", fontSize: 11, fontWeight: 500,
        color: SgC.text55, letterSpacing: "-0.05px", marginTop: 1,
      }}>Sortie scolaire · Emma</div>
    </div>

    <button style={{
      width: 40, height: 40, borderRadius: 999,
      background: "transparent", border: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: SgC.text55, cursor: "pointer", padding: 0, flexShrink: 0,
    }}><SgIcon.Share size={19} /></button>
  </div>
);

// === Document preview card (PDF-like, mocked) ===
const DocPreview = () => (
  <div style={{
    margin: "16px 16px 8px",
    background: "#FFFFFF",
    borderRadius: 18,
    border: `1px solid ${SgC.borderL}`,
    overflow: "hidden",
    boxShadow: "0 2px 14px rgba(15,23,42,0.06)",
  }}>
    {/* Page mock */}
    <div style={{
      padding: "24px 22px 18px",
      background: "#FFFFFF",
      position: "relative",
    }}>
      <div style={{
        fontFamily: "Figtree", fontSize: 10, fontWeight: 600,
        color: SgC.text35, letterSpacing: "1.4px", textTransform: "uppercase",
        marginBottom: 10,
      }}>Collège Voltaire · Paris 11ᵉ</div>
      <div style={{
        fontFamily: "Figtree", fontSize: 17, fontWeight: 800,
        color: SgC.text, letterSpacing: "-0.4px", lineHeight: 1.25,
        marginBottom: 6, textWrap: "pretty",
      }}>Autorisation parentale — Sortie scolaire au musée d'Orsay</div>
      <div style={{
        fontFamily: "Figtree", fontSize: 12, fontWeight: 500,
        color: SgC.text55, letterSpacing: "-0.05px", lineHeight: 1.5,
        marginBottom: 14,
      }}>Je soussigné(e), responsable légal de l'élève, autorise mon enfant à participer à la sortie organisée par l'établissement dans le cadre du programme d'histoire des arts.</div>

      {/* Mock lines */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        {[100, 88, 96, 72].map((w, i) => (
          <div key={i} style={{ height: 6, width: `${w}%`, background: "rgba(15,23,42,0.07)", borderRadius: 4 }} />
        ))}
      </div>

      {/* Detail rows */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px",
        padding: "12px 0", borderTop: `1px solid ${SgC.borderL}`, borderBottom: `1px solid ${SgC.borderL}`,
      }}>
        {[
          { lbl: "Élève", val: "Emma Martin · 4ᵉB" },
          { lbl: "Date", val: "Jeudi 24 avril" },
          { lbl: "Horaire", val: "9h00 – 17h00" },
          { lbl: "Lieu", val: "Musée d'Orsay" },
          { lbl: "Participation", val: "8 €" },
          { lbl: "Encadrement", val: "Mme Dupont +2" },
        ].map((r, i) => (
          <div key={i}>
            <div style={{ fontFamily: "Figtree", fontSize: 9.5, fontWeight: 700, color: SgC.text35, letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: 2 }}>{r.lbl}</div>
            <div style={{ fontFamily: "Figtree", fontSize: 12, fontWeight: 600, color: SgC.text, letterSpacing: "-0.1px" }}>{r.val}</div>
          </div>
        ))}
      </div>

      {/* Footer mock */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
        {[92, 78].map((w, i) => (
          <div key={i} style={{ height: 6, width: `${w}%`, background: "rgba(15,23,42,0.07)", borderRadius: 4 }} />
        ))}
      </div>
    </div>

    {/* Page footer with eye + page count */}
    <div style={{
      borderTop: `1px solid ${SgC.borderL}`,
      padding: "10px 14px",
      display: "flex", alignItems: "center", gap: 8,
      background: "rgba(15,23,42,0.02)",
    }}>
      <SgIcon.Eye size={13} color={SgC.text55} />
      <span style={{
        flex: 1, fontFamily: "Figtree", fontSize: 12, fontWeight: 600,
        color: SgC.text55, letterSpacing: "-0.05px",
      }}>Lire le document complet</span>
      <span style={{
        fontFamily: "Figtree", fontSize: 11, fontWeight: 600,
        color: SgC.text35, letterSpacing: "-0.05px",
      }}>1 / 2</span>
    </div>
  </div>
);

// === Aria summary tag ===
const AriaResume = () => (
  <div style={{
    margin: "0 16px 12px",
    padding: "11px 14px",
    background: "linear-gradient(135deg, #EEF2FF 0%, #F0FDFA 100%)",
    borderRadius: 14,
    border: "1px solid rgba(67,56,202,0.1)",
    display: "flex", alignItems: "flex-start", gap: 10,
  }}>
    <NSymbolSg size={14} color={SgC.indigo} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontFamily: "Figtree", fontSize: 11, fontWeight: 700,
        color: SgC.indigo, letterSpacing: "0.6px", textTransform: "uppercase",
        marginBottom: 3,
      }}>Aria · ce que ça engage</div>
      <div style={{
        fontFamily: "Figtree", fontSize: 13, fontWeight: 500,
        color: SgC.text, letterSpacing: "-0.1px", lineHeight: 1.45,
        textWrap: "pretty",
      }}>Tu autorises Emma à participer à la sortie. <strong>8 € seront prélevés en mai</strong>. Aucun risque particulier signalé.</div>
    </div>
  </div>
);

// === Consent checkbox row ===
const ConsentRow = ({ checked, label }) => (
  <div style={{
    display: "flex", alignItems: "flex-start", gap: 10,
    padding: "10px 16px",
  }}>
    <div style={{
      width: 22, height: 22, borderRadius: 7,
      background: checked ? SgC.text : "#FFFFFF",
      border: checked ? "none" : `1.5px solid ${SgC.text35}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, marginTop: 1,
    }}>
      {checked && <SgIcon.Check size={13} color="#FFFFFF" />}
    </div>
    <span style={{
      fontFamily: "Figtree", fontSize: 13.5, fontWeight: 500,
      color: SgC.text, letterSpacing: "-0.1px", lineHeight: 1.45,
      textWrap: "pretty",
    }}>{label}</span>
  </div>
);

// === Signature pad ===
const SignaturePad = () => (
  <div style={{ margin: "10px 16px 14px" }}>
    <div style={{
      display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
    }}>
      <span style={{
        fontFamily: "Figtree", fontSize: 11, fontWeight: 700,
        color: SgC.text35, letterSpacing: "0.8px", textTransform: "uppercase",
      }}>Signature manuscrite</span>
      <span style={{
        fontFamily: "Figtree", fontSize: 11, fontWeight: 600,
        color: SgC.rose, letterSpacing: "-0.05px",
      }}>Requise</span>
      <div style={{ flex: 1 }} />
      <button style={{
        fontFamily: "Figtree", fontSize: 11.5, fontWeight: 600,
        color: SgC.text55, letterSpacing: "-0.05px",
        background: "transparent", border: "none", cursor: "pointer",
        padding: 0,
      }}>Effacer</button>
    </div>
    <div style={{
      height: 130,
      background: "#FFFFFF",
      border: `1.5px dashed rgba(15,23,42,0.18)`,
      borderRadius: 14,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Hand-drawn signature simulation */}
      <svg viewBox="0 0 380 130" preserveAspectRatio="none" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
        <path
          d="M 40,80 Q 55,40 75,70 T 115,75 Q 130,50 145,80 T 175,72 Q 195,55 200,90 Q 205,40 230,70 T 270,68 Q 285,90 305,55"
          stroke="#1E1B4B" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"
        />
        <path d="M 305,55 q 8,3 12,12" stroke="#1E1B4B" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </svg>
      {/* Baseline */}
      <div style={{
        position: "absolute", left: 16, right: 16, bottom: 22,
        height: 1, background: "rgba(15,23,42,0.08)",
      }} />
      <span style={{
        position: "absolute", left: 16, bottom: 6,
        fontFamily: "Figtree", fontSize: 10, fontWeight: 600,
        color: SgC.text35, letterSpacing: "0.3px", textTransform: "uppercase",
      }}>Signez ici</span>
    </div>
  </div>
);

// === Sticky bottom bar with primary CTA ===
const SignBottomBar = () => (
  <div style={{
    flexShrink: 0,
    background: "rgba(247,247,245,0.95)",
    backdropFilter: "blur(12px) saturate(180%)",
    WebkitBackdropFilter: "blur(12px) saturate(180%)",
    borderTop: `1px solid rgba(15,23,42,0.07)`,
    padding: "12px 16px 18px",
  }}>
    <button style={{
      width: "100%", height: 52, borderRadius: 16,
      background: SgC.text, color: "#FFFFFF",
      border: "none", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      fontFamily: "Figtree", fontSize: 15, fontWeight: 700,
      letterSpacing: "-0.2px",
      boxShadow: "0 6px 20px rgba(15,23,42,0.18)",
    }}>
      <SgIcon.Lock size={13} color="#FFFFFF" /> Signer et envoyer
    </button>
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      marginTop: 8,
    }}>
      <SgIcon.Lock size={11} color={SgC.text35} />
      <span style={{
        fontFamily: "Figtree", fontSize: 11, fontWeight: 500,
        color: SgC.text35, letterSpacing: "-0.05px",
      }}>Signature électronique horodatée · conforme</span>
    </div>
  </div>
);

// === SCREEN ===
const SignDocScreen = () => {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: SgC.bg,
      display: "flex", flexDirection: "column",
      fontFamily: "Figtree, sans-serif",
    }}>
      <div style={{ paddingTop: 56 }}>
        <SignTopBar />
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
        {/* Deadline pill at top */}
        <div style={{
          padding: "12px 16px 4px",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 999,
            background: "#FCE7F3", color: "#9D174D",
            fontFamily: "Figtree", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.3px", textTransform: "uppercase",
          }}><SgIcon.Clock size={11} color="#9D174D" /> À signer · plus que 2 jours</span>
          <div style={{ flex: 1 }} />
          <span style={{
            fontFamily: "Figtree", fontSize: 11, fontWeight: 600,
            color: SgC.text35, letterSpacing: "-0.05px",
          }}>Reçu lundi</span>
        </div>

        <DocPreview />
        <AriaResume />

        {/* Consent block */}
        <div style={{
          fontFamily: "Figtree", fontSize: 11, fontWeight: 700,
          color: SgC.text35, letterSpacing: "0.8px", textTransform: "uppercase",
          padding: "8px 18px 4px",
        }}>Je certifie</div>
        <div style={{
          margin: "0 16px",
          background: "#FFFFFF",
          borderRadius: 16,
          border: `1px solid ${SgC.borderL}`,
          overflow: "hidden",
          boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
        }}>
          <ConsentRow checked={true} label="Avoir lu le document d'autorisation dans son intégralité" />
          <div style={{ height: 1, background: SgC.borderL, margin: "0 16px" }} />
          <ConsentRow checked={true} label="Autoriser Emma Martin à participer à la sortie au musée d'Orsay du 24 avril" />
          <div style={{ height: 1, background: SgC.borderL, margin: "0 16px" }} />
          <ConsentRow checked={false} label="Accepter le prélèvement de la participation de 8 € sur mon compte famille" />
        </div>

        <SignaturePad />
      </div>

      <SignBottomBar />
    </div>
  );
};

window.SignDocScreen = SignDocScreen;
