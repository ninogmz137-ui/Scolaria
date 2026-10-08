/* global React */

// === Aria Chat Screen ===

const ArIcon = {
  Home: ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z" />
    </svg>
  ),
  Book: ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2V5z" />
    </svg>
  ),
  Cal: ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  Msg: ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 1 1-3.2-6.4L21 4l-1 4.5A8 8 0 0 1 21 12z" />
    </svg>
  ),
  Settings: ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1A7 7 0 0 0 14.4 5l-.4-2.5h-4l-.4 2.5a7 7 0 0 0-2.1 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2.1 1.2L10 21h4l.4-2.6a7 7 0 0 0 2.1-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />
    </svg>
  ),
  Close: ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
  ),
  Mic: ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8" /></svg>
  ),
  ArrowUp: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
  ),
  Plus: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
  ),
  History: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></svg>
  ),
  Sparkle: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6z" /></svg>
  ),
  Check: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
  ),
  Cal2: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
  ),
};

const NSymbolAr = ({ size = 14, color = "#4338CA", animate = false }) => {
  const ellipses = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const x = 12 + Math.cos(a) * 7;
    const y = 12 + Math.sin(a) * 7;
    ellipses.push(
      <ellipse
        key={i} cx={x} cy={y} rx="1.6" ry="2.6" fill={color}
        transform={`rotate(${(i / 8) * 360} ${x} ${y})`}
        style={animate ? { animation: `ariaEllipse 1.4s ease-in-out infinite`, animationDelay: `${i * 0.08}s`, transformOrigin: `${x}px ${y}px` } : {}}
      />
    );
  }
  return <svg width={size} height={size} viewBox="0 0 24 24">{ellipses}</svg>;
};

const ArC = {
  bg: "#F7F7F5",
  text: "#0F172A",
  text55: "rgba(15,23,42,0.55)",
  text35: "rgba(15,23,42,0.35)",
  text28: "rgba(15,23,42,0.28)",
  border: "rgba(15,23,42,0.06)",
  borderL: "rgba(15,23,42,0.05)",
  indigo: "#4338CA",
  red: "#EF4444",
};

// === Top bar (Aria-specific: close, "Aria" title with mark, history) ===
const AriaTopBar = () => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10,
    padding: "14px 16px 10px",
    background: ArC.bg,
  }}>
    <button style={{
      width: 42, height: 42, borderRadius: 999,
      background: "rgba(15,23,42,0.08)", border: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: ArC.text55, cursor: "pointer", padding: 0, flexShrink: 0,
    }}><ArIcon.Close size={18} /></button>

    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <NSymbolAr size={18} color={ArC.indigo} animate />
        <span style={{
          fontFamily: "Figtree", fontSize: 17, fontWeight: 700,
          color: ArC.text, letterSpacing: "-0.3px",
        }}>Aria</span>
      </div>
      <span style={{
        fontFamily: "Figtree", fontSize: 11, fontWeight: 500,
        color: ArC.text35, letterSpacing: "-0.05px",
      }}>au sujet d'Emma</span>
    </div>

    <button style={{
      width: 42, height: 42, borderRadius: 999,
      background: "rgba(15,23,42,0.08)", border: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: ArC.text55, cursor: "pointer", padding: 0, flexShrink: 0,
    }}><ArIcon.History size={18} /></button>
  </div>
);

// === User bubble ===
const UserBubble = ({ children }) => (
  <div style={{
    display: "flex", justifyContent: "flex-end",
    margin: "8px 16px 4px",
  }}>
    <div style={{
      maxWidth: "78%",
      padding: "11px 16px",
      background: ArC.text,
      color: "#FFFFFF",
      borderRadius: "20px 20px 6px 20px",
      fontFamily: "Figtree", fontSize: 15, fontWeight: 500,
      lineHeight: 1.4, letterSpacing: "-0.15px",
      textWrap: "pretty",
    }}>{children}</div>
  </div>
);

// === Aria bubble (text response) ===
const AriaBubble = ({ children, sources }) => (
  <div style={{
    display: "flex", gap: 10,
    margin: "16px 16px 8px",
    alignItems: "flex-start",
  }}>
    <div style={{
      width: 28, height: 28, borderRadius: 9,
      background: "linear-gradient(135deg, #EEF2FF 0%, #F0FDFA 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, marginTop: 2,
    }}>
      <NSymbolAr size={16} color={ArC.indigo} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontFamily: "Figtree", fontSize: 15, fontWeight: 500,
        color: ArC.text, letterSpacing: "-0.15px", lineHeight: 1.5,
        textWrap: "pretty",
      }}>{children}</div>
      {sources && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8,
        }}>
          {sources.map((s, i) => (
            <span key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 999,
              background: "rgba(67,56,202,0.08)",
              fontFamily: "Figtree", fontSize: 11, fontWeight: 600,
              color: ArC.indigo, letterSpacing: "-0.05px",
            }}>
              <ArIcon.Sparkle size={10} color={ArC.indigo} />
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  </div>
);

// === Embedded grade card (rich response) ===
const EmbeddedGrades = () => {
  const grades = [
    { subject: "Maths", grade: "16/20", trend: "+2,4", positive: true },
    { subject: "Anglais", grade: "17/20", trend: "+1,1", positive: true },
    { subject: "Histoire-Géo", grade: "13/20", trend: "−0,8", positive: false },
    { subject: "Français", grade: "14/20", trend: "+0,3", positive: true },
  ];
  return (
    <div style={{
      margin: "8px 16px 4px 56px",
      background: "#FFFFFF",
      borderRadius: 16,
      border: `1px solid ${ArC.borderL}`,
      overflow: "hidden",
      boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
    }}>
      <div style={{
        padding: "10px 14px",
        borderBottom: `1px solid ${ArC.borderL}`,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{
          fontFamily: "Figtree", fontSize: 11, fontWeight: 700,
          color: ArC.text35, letterSpacing: "0.5px", textTransform: "uppercase",
        }}>Évolution T1 → T2</span>
      </div>
      {grades.map((g, i) => (
        <div key={i} style={{
          padding: "10px 14px",
          borderBottom: i === grades.length - 1 ? "none" : `1px solid ${ArC.borderL}`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{
            flex: 1, fontFamily: "Figtree", fontSize: 14, fontWeight: 600,
            color: ArC.text, letterSpacing: "-0.15px",
          }}>{g.subject}</span>
          <span style={{
            fontFamily: "Figtree", fontSize: 14, fontWeight: 700,
            color: ArC.text, letterSpacing: "-0.2px",
            fontVariantNumeric: "tabular-nums",
          }}>{g.grade}</span>
          <span style={{
            fontFamily: "Figtree", fontSize: 12, fontWeight: 700,
            color: g.positive ? "#059669" : "#DC2626",
            letterSpacing: "0", minWidth: 38, textAlign: "right",
            fontVariantNumeric: "tabular-nums",
          }}>{g.trend}</span>
        </div>
      ))}
    </div>
  );
};

// === Action card (Aria proposes to do something) ===
const ProposedAction = ({ icon, title, subtitle }) => {
  const Icn = icon;
  return (
    <div style={{
      margin: "8px 16px 4px 56px",
      padding: "12px 14px",
      background: "#FFFFFF",
      borderRadius: 14,
      border: `1px solid ${ArC.borderL}`,
      display: "flex", alignItems: "center", gap: 12,
      cursor: "pointer",
      boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: "rgba(67,56,202,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, color: ArC.indigo,
      }}><Icn size={17} color={ArC.indigo} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "Figtree", fontSize: 14, fontWeight: 700,
          color: ArC.text, letterSpacing: "-0.2px",
        }}>{title}</div>
        <div style={{
          fontFamily: "Figtree", fontSize: 12.5, fontWeight: 500,
          color: ArC.text55, letterSpacing: "-0.1px", marginTop: 1,
        }}>{subtitle}</div>
      </div>
      <div style={{
        width: 28, height: 28, borderRadius: 999,
        background: ArC.text, color: "#FFFFFF",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}><ArIcon.Check size={14} color="#FFFFFF" /></div>
    </div>
  );
};

// === Quick reply chips ===
const QuickReplies = ({ items }) => (
  <div style={{
    display: "flex", flexWrap: "wrap", gap: 6,
    margin: "10px 16px 4px 56px",
  }}>
    {items.map((it, i) => (
      <button key={i} style={{
        padding: "7px 12px",
        borderRadius: 999,
        background: "#FFFFFF",
        border: `1px solid ${ArC.borderL}`,
        fontFamily: "Figtree", fontSize: 13, fontWeight: 600,
        color: ArC.text, letterSpacing: "-0.1px",
        cursor: "pointer",
      }}>{it}</button>
    ))}
  </div>
);

// === Composer (input bottom) ===
const Composer = () => (
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
      border: `1px solid ${ArC.borderL}`,
      borderRadius: 24,
      padding: "6px 6px 6px 16px",
      boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
    }}>
      <button style={{
        width: 32, height: 32, borderRadius: 999,
        background: "transparent", border: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: ArC.text35, cursor: "pointer", padding: 0, flexShrink: 0,
      }}><ArIcon.Plus size={18} /></button>
      <span style={{
        flex: 1, fontFamily: "Figtree", fontSize: 15, fontWeight: 500,
        color: ArC.text35, letterSpacing: "-0.15px",
        padding: "8px 0",
      }}>Pose ta question…</span>
      <button style={{
        width: 36, height: 36, borderRadius: 999,
        background: "rgba(15,23,42,0.06)", border: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: ArC.text55, cursor: "pointer", padding: 0, flexShrink: 0,
      }}><ArIcon.Mic size={17} /></button>
      <button style={{
        width: 36, height: 36, borderRadius: 999,
        background: ArC.text, border: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#FFFFFF", cursor: "pointer", padding: 0, flexShrink: 0,
      }}><ArIcon.ArrowUp size={17} color="#FFFFFF" /></button>
    </div>
  </div>
);

// === SCREEN ===
const AriaScreen = () => {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: ArC.bg,
      display: "flex", flexDirection: "column",
      fontFamily: "Figtree, sans-serif",
    }}>
      <style>{`
        @keyframes ariaEllipse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.7); opacity: 0.6; }
        }
        @keyframes ariaTyping {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>

      <div style={{ paddingTop: 56 }}>
        <AriaTopBar />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0 12px" }}>

        {/* Greeting */}
        <div style={{
          padding: "12px 18px 6px",
          fontFamily: "Figtree", fontSize: 13, fontWeight: 600,
          color: ArC.text35, letterSpacing: "0.3px",
          textAlign: "center", textTransform: "uppercase",
        }}>Aujourd'hui · 10:24</div>

        {/* User Q1 */}
        <UserBubble>Comment Emma a évolué ce trimestre ?</UserBubble>

        {/* Aria response with embedded card */}
        <AriaBubble sources={["3 contrôles T2", "Bulletin T1"]}>
          Emma progresse bien sur ce trimestre. <strong style={{ fontWeight: 700 }}>+1,2 pts</strong> de moyenne par rapport au T1, portée surtout par les maths et l'anglais. Seule attention : Histoire-Géo en légère baisse.
        </AriaBubble>
        <EmbeddedGrades />

        <QuickReplies items={["Pourquoi Histoire-Géo baisse ?", "Comment l'aider ?", "Voir bulletin"]} />

        {/* User Q2 */}
        <UserBubble>Crée un rappel pour signer la sortie d'Orsay</UserBubble>

        {/* Aria response with proposed action */}
        <AriaBubble>
          Très bien. La sortie au musée d'Orsay a lieu <strong>jeudi 24 avril</strong>, l'autorisation est à signer avant <strong>vendredi 18 avril, 18h</strong>. Je peux te créer un rappel mercredi soir.
        </AriaBubble>
        <ProposedAction
          icon={ArIcon.Cal2}
          title="Rappel · mercredi 17 avril, 19:00"
          subtitle="Signer l'autorisation Orsay"
        />

        {/* Aria typing indicator */}
        <div style={{
          margin: "16px 16px 8px",
          display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 9,
            background: "linear-gradient(135deg, #EEF2FF 0%, #F0FDFA 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginTop: 2,
          }}>
            <NSymbolAr size={16} color={ArC.indigo} animate />
          </div>
          <div style={{
            background: "#FFFFFF",
            border: `1px solid ${ArC.borderL}`,
            borderRadius: "16px 16px 16px 6px",
            padding: "10px 14px",
            display: "flex", gap: 4, alignItems: "center",
            boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
          }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width: 6, height: 6, borderRadius: 999,
                background: ArC.text35,
                animation: `ariaTyping 1.2s ease-in-out infinite`,
                animationDelay: `${i * 0.15}s`,
                display: "inline-block",
              }} />
            ))}
          </div>
        </div>

      </div>

      <Composer />
    </div>
  );
};

window.AriaScreen = AriaScreen;
