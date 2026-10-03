/* global React */

// === Détail conversation (depuis Messages B) — Sortie Orsay avec Mme Dupont ===

const CdIcon = {
  ChevronL: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
  ),
  More: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
  ),
  Plus: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
  ),
  Mic: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8" /></svg>
  ),
  ArrowUp: ({ size = 17, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
  ),
  Sign: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
  ),
  Pdf: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
  ),
  Cal: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
  ),
  MapPin: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
  ),
  Euro: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5a8 8 0 1 0 0 14M3 10h12M3 14h12" /></svg>
  ),
};

const NSymbolCd = ({ size = 14, color = "#4338CA" }) => {
  const ellipses = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const x = 12 + Math.cos(a) * 7;
    const y = 12 + Math.sin(a) * 7;
    ellipses.push(<ellipse key={i} cx={x} cy={y} rx="1.6" ry="2.6" fill={color} transform={`rotate(${(i / 8) * 360} ${x} ${y})`} />);
  }
  return <svg width={size} height={size} viewBox="0 0 24 24">{ellipses}</svg>;
};

const CdC = {
  bg: "#F7F7F5",
  text: "#0F172A",
  text55: "rgba(15,23,42,0.55)",
  text35: "rgba(15,23,42,0.35)",
  text28: "rgba(15,23,42,0.28)",
  border: "rgba(15,23,42,0.06)",
  borderL: "rgba(15,23,42,0.05)",
  indigo: "#4338CA",
  rose: "#DB2777",
};

// === Top bar (back · sender + role · more) ===
const ConvTopBar = () => (
  <div style={{
    display: "flex", alignItems: "center", gap: 8,
    padding: "14px 14px 12px",
    background: CdC.bg,
    borderBottom: `1px solid ${CdC.borderL}`,
  }}>
    <button style={{
      width: 40, height: 40, borderRadius: 999,
      background: "transparent", border: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: CdC.text, cursor: "pointer", padding: 0, flexShrink: 0,
    }}><CdIcon.ChevronL size={22} /></button>

    <div style={{
      width: 40, height: 40, borderRadius: 999,
      background: CdC.rose,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Figtree", fontSize: 15, fontWeight: 700,
      color: "#FFFFFF", letterSpacing: "-0.3px", flexShrink: 0,
    }}>D</div>

    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontFamily: "Figtree", fontSize: 15, fontWeight: 700,
        color: CdC.text, letterSpacing: "-0.2px",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>Mme Dupont</div>
      <div style={{
        fontFamily: "Figtree", fontSize: 12, fontWeight: 500,
        color: CdC.text55, letterSpacing: "-0.05px",
      }}>Vie scolaire · Voltaire</div>
    </div>

    <button style={{
      width: 40, height: 40, borderRadius: 999,
      background: "rgba(15,23,42,0.06)", border: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: CdC.text55, cursor: "pointer", padding: 0, flexShrink: 0,
    }}><CdIcon.More size={20} /></button>
  </div>
);

// === Aria summary header (top of thread) ===
const AriaThreadSummary = () => (
  <div style={{
    margin: "12px 14px 6px",
    padding: "12px 14px",
    background: "linear-gradient(135deg, #EEF2FF 0%, #F0FDFA 100%)",
    borderRadius: 14,
    border: "1px solid rgba(67,56,202,0.1)",
  }}>
    <div style={{
      display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
    }}>
      <NSymbolCd size={14} color={CdC.indigo} />
      <span style={{
        fontFamily: "Figtree", fontSize: 11, fontWeight: 700,
        color: CdC.indigo, letterSpacing: "0.6px", textTransform: "uppercase",
      }}>Résumé Aria</span>
    </div>
    <div style={{
      fontFamily: "Figtree", fontSize: 13.5, fontWeight: 500,
      color: CdC.text, letterSpacing: "-0.1px", lineHeight: 1.45,
      textWrap: "pretty",
    }}>
      Sortie scolaire au musée d'Orsay <strong>jeudi 24 avril, 9h–17h</strong>. Participation 8€. <strong style={{ color: "#9D174D" }}>Autorisation à signer avant vendredi 18 avril, 18h.</strong>
    </div>
    <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "Figtree", fontSize: 12, fontWeight: 600, color: CdC.text55, letterSpacing: "-0.05px" }}>
        <CdIcon.Cal size={13} color={CdC.text55} /> 24 avril
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "Figtree", fontSize: 12, fontWeight: 600, color: CdC.text55, letterSpacing: "-0.05px" }}>
        <CdIcon.MapPin size={13} color={CdC.text55} /> Musée d'Orsay
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "Figtree", fontSize: 12, fontWeight: 600, color: CdC.text55, letterSpacing: "-0.05px" }}>
        <CdIcon.Euro size={13} color={CdC.text55} /> 8 €
      </span>
    </div>
  </div>
);

// === Sticky CTA ===
const StickyCTA = () => (
  <div style={{
    margin: "8px 14px 6px",
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 12px 10px 14px",
    background: "#FFFFFF",
    borderRadius: 14,
    border: "1px solid rgba(219,39,119,0.18)",
    boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
  }}>
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 999,
      background: "#FCE7F3", color: "#9D174D",
      fontFamily: "Figtree", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.3px", textTransform: "uppercase",
    }}>À signer</span>
    <span style={{
      flex: 1, fontFamily: "Figtree", fontSize: 13, fontWeight: 600,
      color: CdC.text, letterSpacing: "-0.1px",
    }}>Avant vendredi 18 avril</span>
    <button style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      height: 34, padding: "0 14px",
      borderRadius: 999,
      background: "#DB2777", color: "#FFFFFF",
      border: "none", cursor: "pointer",
      fontFamily: "Figtree", fontSize: 13, fontWeight: 700,
      letterSpacing: "-0.1px",
    }}><CdIcon.Sign size={13} color="#FFFFFF" /> Signer</button>
  </div>
);

// === Date separator ===
const DateSep = ({ children }) => (
  <div style={{
    textAlign: "center",
    padding: "16px 0 10px",
    fontFamily: "Figtree", fontSize: 11, fontWeight: 600,
    color: CdC.text35, letterSpacing: "0.6px", textTransform: "uppercase",
  }}>{children}</div>
);

// === Their bubble (left, rose for Mme Dupont) ===
const TheirBubble = ({ children, time, attachments }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "flex-start",
    margin: "4px 14px",
  }}>
    <div style={{
      maxWidth: "82%",
      padding: "11px 14px",
      background: "#FFFFFF",
      color: CdC.text,
      borderRadius: "16px 16px 16px 6px",
      border: `1px solid ${CdC.borderL}`,
      fontFamily: "Figtree", fontSize: 14.5, fontWeight: 500,
      lineHeight: 1.45, letterSpacing: "-0.15px",
      textWrap: "pretty",
      boxShadow: "0 1px 4px rgba(15,23,42,0.03)",
    }}>
      {children}
      {attachments && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {attachments.map((a, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px",
              background: "rgba(15,23,42,0.04)",
              borderRadius: 10,
            }}>
              <div style={{
                width: 30, height: 36, borderRadius: 5,
                background: "#FFFFFF",
                border: `1px solid ${CdC.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#DC2626", flexShrink: 0,
              }}><CdIcon.Pdf size={16} color="#DC2626" /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Figtree", fontSize: 13, fontWeight: 600, color: CdC.text, letterSpacing: "-0.1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                <div style={{ fontFamily: "Figtree", fontSize: 11, fontWeight: 500, color: CdC.text35, letterSpacing: "-0.05px" }}>{a.size}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    <span style={{
      fontFamily: "Figtree", fontSize: 10.5, fontWeight: 500,
      color: CdC.text35, letterSpacing: "0.2px",
      padding: "3px 4px",
    }}>{time}</span>
  </div>
);

// === My bubble (right, dark) ===
const MyBubble = ({ children, time, status }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "flex-end",
    margin: "4px 14px",
  }}>
    <div style={{
      maxWidth: "82%",
      padding: "11px 14px",
      background: CdC.text,
      color: "#FFFFFF",
      borderRadius: "16px 16px 6px 16px",
      fontFamily: "Figtree", fontSize: 14.5, fontWeight: 500,
      lineHeight: 1.45, letterSpacing: "-0.15px",
      textWrap: "pretty",
    }}>{children}</div>
    <span style={{
      fontFamily: "Figtree", fontSize: 10.5, fontWeight: 500,
      color: CdC.text35, letterSpacing: "0.2px",
      padding: "3px 4px",
    }}>{time}{status ? ` · ${status}` : ""}</span>
  </div>
);

// === Composer ===
const ConvComposer = () => (
  <div style={{
    flexShrink: 0,
    padding: "10px 14px 18px",
    background: "rgba(247,247,245,0.95)",
    backdropFilter: "blur(12px) saturate(180%)",
    WebkitBackdropFilter: "blur(12px) saturate(180%)",
    borderTop: `1px solid rgba(15,23,42,0.07)`,
  }}>
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: "#FFFFFF",
      border: `1px solid ${CdC.borderL}`,
      borderRadius: 24,
      padding: "5px 5px 5px 14px",
      boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
    }}>
      <button style={{
        width: 30, height: 30, borderRadius: 999,
        background: "transparent", border: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: CdC.text35, cursor: "pointer", padding: 0, flexShrink: 0,
      }}><CdIcon.Plus size={18} /></button>
      <span style={{
        flex: 1, fontFamily: "Figtree", fontSize: 14.5, fontWeight: 500,
        color: CdC.text35, letterSpacing: "-0.15px",
        padding: "8px 0",
      }}>Répondre…</span>
      <button style={{
        width: 34, height: 34, borderRadius: 999,
        background: "rgba(15,23,42,0.06)", border: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: CdC.text55, cursor: "pointer", padding: 0, flexShrink: 0,
      }}><CdIcon.Mic size={16} /></button>
    </div>
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      marginTop: 8, paddingLeft: 4,
    }}>
      <NSymbolCd size={12} color={CdC.indigo} />
      <span style={{
        fontFamily: "Figtree", fontSize: 11.5, fontWeight: 600,
        color: CdC.indigo, letterSpacing: "-0.05px",
      }}>Aria peut t'aider à formuler une réponse</span>
    </div>
  </div>
);

// === SCREEN ===
const ConversationScreen = () => {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: CdC.bg,
      display: "flex", flexDirection: "column",
      fontFamily: "Figtree, sans-serif",
    }}>
      <div style={{ paddingTop: 56 }}>
        <ConvTopBar />
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
        {/* Top sortie tag */}
        <div style={{ padding: "10px 14px 0", display: "flex", justifyContent: "center" }}>
          <span style={{
            display: "inline-flex", alignItems: "center",
            padding: "4px 11px", borderRadius: 999,
            background: "#CFFAFE", color: "#155E75",
            fontFamily: "Figtree", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.3px", textTransform: "uppercase",
          }}>Sortie</span>
        </div>

        <AriaThreadSummary />
        <StickyCTA />

        <DateSep>Lundi 14 avril</DateSep>

        <TheirBubble time="10:14"
          attachments={[{ name: "Autorisation_Orsay.pdf", size: "184 Ko" }]}
        >
          Bonjour, je vous transmets l'autorisation pour la sortie au musée d'Orsay du <strong>jeudi 24 avril</strong> (9h–17h).<br /><br />
          Merci de la signer numériquement avant <strong>vendredi 18 avril, 18h</strong>. La participation de 8 € sera prélevée le mois suivant.
        </TheirBubble>

        <MyBubble time="11:02" status="Lu">
          Bonjour, c'est noté, je signe ce soir. Faut-il prévoir un pique-nique ?
        </MyBubble>

        <TheirBubble time="11:24">
          Oui, pique-nique tiré du sac et une petite bouteille d'eau. Tenue confortable.
        </TheirBubble>

        <DateSep>Aujourd'hui</DateSep>

        <TheirBubble time="9:30">
          Petit rappel : il vous reste <strong>2 jours</strong> pour signer. Bonne journée 🙂
        </TheirBubble>

      </div>

      <ConvComposer />
    </div>
  );
};

window.ConversationScreen = ConversationScreen;
