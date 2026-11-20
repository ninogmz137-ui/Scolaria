/* global React */

// === Détail note (depuis Notes) — Contrôle Maths ===

const NdIcon = {
  ChevronL: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
  ),
  More: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
  ),
  Trend: ({ size = 14, color = "currentColor", up = true }) => (
    up ? (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></svg>
    ) : (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l6 6 4-4 8 8" /><path d="M14 17h7v-7" /></svg>
    )
  ),
  Pdf: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
  ),
  Sparkle: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6z" /></svg>
  ),
};

const NSymbolNd = ({ size = 14, color = "#4338CA" }) => {
  const ellipses = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const x = 12 + Math.cos(a) * 7;
    const y = 12 + Math.sin(a) * 7;
    ellipses.push(<ellipse key={i} cx={x} cy={y} rx="1.6" ry="2.6" fill={color} transform={`rotate(${(i / 8) * 360} ${x} ${y})`} />);
  }
  return <svg width={size} height={size} viewBox="0 0 24 24">{ellipses}</svg>;
};

const NdC = {
  bg: "#F7F7F5",
  text: "#0F172A",
  text55: "rgba(15,23,42,0.55)",
  text35: "rgba(15,23,42,0.35)",
  border: "rgba(15,23,42,0.06)",
  borderL: "rgba(15,23,42,0.05)",
  indigo: "#4338CA",
  green: "#059669",
};

// === Top bar ===
const NdTopBar = ({ subjectColor }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 8,
    padding: "14px 14px 12px",
    borderBottom: `1px solid ${NdC.borderL}`,
    background: NdC.bg,
  }}>
    <button style={{
      width: 40, height: 40, borderRadius: 999,
      background: "transparent", border: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: NdC.text, cursor: "pointer", padding: 0, flexShrink: 0,
    }}><NdIcon.ChevronL size={22} /></button>
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        width: 10, height: 10, borderRadius: 999,
        background: subjectColor,
      }} />
      <span style={{
        fontFamily: "Figtree", fontSize: 15, fontWeight: 700,
        color: NdC.text, letterSpacing: "-0.2px",
      }}>Mathématiques</span>
    </div>
    <button style={{
      width: 40, height: 40, borderRadius: 999,
      background: "transparent", border: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: NdC.text55, cursor: "pointer", padding: 0, flexShrink: 0,
    }}><NdIcon.More size={20} /></button>
  </div>
);

// === Hero grade ===
const NdHero = () => (
  <div style={{
    padding: "26px 22px 14px",
    textAlign: "center",
  }}>
    <div style={{
      fontFamily: "Figtree", fontSize: 11, fontWeight: 700,
      color: NdC.text35, letterSpacing: "0.8px", textTransform: "uppercase",
      marginBottom: 8,
    }}>Contrôle · Géométrie spatiale</div>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, marginBottom: 8 }}>
      <span style={{
        fontFamily: "Figtree", fontSize: 88, fontWeight: 800,
        color: NdC.text, letterSpacing: "-3px", lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      }}>16</span>
      <span style={{
        fontFamily: "Figtree", fontSize: 32, fontWeight: 600,
        color: NdC.text35, letterSpacing: "-0.5px", lineHeight: 1,
      }}>/20</span>
    </div>
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "5px 12px", borderRadius: 999, background: "rgba(5,150,105,0.1)" }}>
      <NdIcon.Trend size={13} color={NdC.green} up />
      <span style={{
        fontFamily: "Figtree", fontSize: 12, fontWeight: 700,
        color: NdC.green, letterSpacing: "-0.05px",
      }}>+2,4 vs moyenne T1</span>
    </div>
    <div style={{
      fontFamily: "Figtree", fontSize: 12, fontWeight: 600,
      color: NdC.text35, letterSpacing: "-0.05px",
      marginTop: 14,
    }}>Mardi 15 avril · M. Petit</div>
  </div>
);

// === Class distribution chart ===
const ClassDistribution = () => {
  const dist = [3, 5, 8, 12, 9, 4]; // counts per bin
  const max = Math.max(...dist);
  const bins = ["0-5", "5-8", "8-11", "11-14", "14-17", "17-20"];
  const studentBin = 4; // Emma = 16 → bin 14-17
  return (
    <div style={{
      margin: "0 16px 14px",
      padding: "14px 16px",
      background: "#FFFFFF",
      borderRadius: 16,
      border: `1px solid ${NdC.borderL}`,
      boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{
          flex: 1, fontFamily: "Figtree", fontSize: 13, fontWeight: 700,
          color: NdC.text, letterSpacing: "-0.15px",
        }}>Distribution de la classe</span>
        <span style={{
          fontFamily: "Figtree", fontSize: 11, fontWeight: 600,
          color: NdC.text35, letterSpacing: "-0.05px",
        }}>Moyenne 12,4 / 20</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80, marginBottom: 6 }}>
        {dist.map((d, i) => {
          const isEmma = i === studentBin;
          const h = (d / max) * 100;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
              {isEmma && (
                <span style={{
                  fontFamily: "Figtree", fontSize: 10, fontWeight: 800,
                  color: NdC.text, letterSpacing: "-0.05px",
                  background: "#FEF3C7", padding: "1px 5px", borderRadius: 4,
                }}>Emma</span>
              )}
              <div style={{
                width: "100%",
                height: `${h}%`,
                background: isEmma ? NdC.text : "rgba(15,23,42,0.12)",
                borderRadius: "5px 5px 1px 1px",
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {bins.map((b, i) => (
          <span key={i} style={{
            flex: 1, textAlign: "center",
            fontFamily: "Figtree", fontSize: 9.5, fontWeight: 600,
            color: NdC.text35, letterSpacing: "0",
            fontVariantNumeric: "tabular-nums",
          }}>{b}</span>
        ))}
      </div>
    </div>
  );
};

// === Aria analysis card ===
const NdAriaCard = () => (
  <div style={{
    margin: "0 16px 14px",
    padding: "14px",
    background: "linear-gradient(135deg, #EEF2FF 0%, #F0FDFA 100%)",
    borderRadius: 16,
    border: "1px solid rgba(67,56,202,0.1)",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <NSymbolNd size={14} color={NdC.indigo} />
      <span style={{
        fontFamily: "Figtree", fontSize: 11, fontWeight: 700,
        color: NdC.indigo, letterSpacing: "0.6px", textTransform: "uppercase",
      }}>Aria · analyse</span>
    </div>
    <div style={{
      fontFamily: "Figtree", fontSize: 13.5, fontWeight: 500,
      color: NdC.text, letterSpacing: "-0.1px", lineHeight: 1.5,
      marginBottom: 12, textWrap: "pretty",
    }}>
      Très bonne note. Emma maîtrise <strong>le calcul de volume et le théorème de Pythagore</strong>. Elle a perdu 4 points sur la <strong>vision dans l'espace</strong> — un point qui revient depuis 2 contrôles.
    </div>
    {/* Skills bars */}
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[
        { label: "Calcul de volume", score: 100, color: NdC.green },
        { label: "Th. de Pythagore", score: 90, color: NdC.green },
        { label: "Vision dans l'espace", score: 60, color: "#D97706" },
      ].map((s, i) => (
        <div key={i}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontFamily: "Figtree", fontSize: 12, fontWeight: 600,
            color: NdC.text, letterSpacing: "-0.05px",
            marginBottom: 4,
          }}>
            <span>{s.label}</span>
            <span style={{ fontVariantNumeric: "tabular-nums", color: s.color }}>{s.score} %</span>
          </div>
          <div style={{
            height: 6, borderRadius: 999,
            background: "rgba(15,23,42,0.07)",
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%", width: `${s.score}%`,
              background: s.color,
              borderRadius: 999,
            }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// === Suggestion (Aria propose) ===
const NdSuggestion = () => (
  <div style={{
    margin: "0 16px 14px",
    padding: "13px 14px",
    background: "#FFFFFF",
    borderRadius: 14,
    border: `1px solid rgba(67,56,202,0.18)`,
    display: "flex", alignItems: "center", gap: 12,
    boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
  }}>
    <div style={{
      width: 36, height: 36, borderRadius: 10,
      background: "rgba(67,56,202,0.08)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}><NdIcon.Sparkle size={16} color={NdC.indigo} /></div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontFamily: "Figtree", fontSize: 13.5, fontWeight: 700,
        color: NdC.text, letterSpacing: "-0.15px",
      }}>Travailler la vision dans l'espace</div>
      <div style={{
        fontFamily: "Figtree", fontSize: 12, fontWeight: 500,
        color: NdC.text55, letterSpacing: "-0.05px", marginTop: 1,
      }}>3 exercices sélectionnés par Aria · 15 min</div>
    </div>
    <button style={{
      height: 32, padding: "0 13px", borderRadius: 999,
      background: NdC.text, color: "#FFFFFF",
      border: "none", cursor: "pointer",
      fontFamily: "Figtree", fontSize: 12.5, fontWeight: 700,
      letterSpacing: "-0.05px", flexShrink: 0,
    }}>Voir</button>
  </div>
);

// === Comment from teacher ===
const TeacherComment = () => (
  <div style={{
    margin: "0 16px 14px",
    padding: "14px",
    background: "#FFFFFF",
    borderRadius: 16,
    border: `1px solid ${NdC.borderL}`,
    boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 999,
        background: "#4338CA",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Figtree", fontSize: 13, fontWeight: 700,
        color: "#FFFFFF", letterSpacing: "-0.2px", flexShrink: 0,
      }}>P</div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: "Figtree", fontSize: 13, fontWeight: 700,
          color: NdC.text, letterSpacing: "-0.15px",
        }}>M. Petit</div>
        <div style={{
          fontFamily: "Figtree", fontSize: 11.5, fontWeight: 500,
          color: NdC.text35, letterSpacing: "-0.05px",
        }}>Mardi 15 avril, 16:30</div>
      </div>
    </div>
    <div style={{
      fontFamily: "Figtree", fontSize: 13.5, fontWeight: 500,
      color: NdC.text, letterSpacing: "-0.1px", lineHeight: 1.5,
      fontStyle: "italic",
      textWrap: "pretty",
    }}>« Travail solide sur les volumes et Pythagore. Continue à bien soigner les schémas en perspective. »</div>
  </div>
);

// === Section heading ===
const NdSectionH = ({ children }) => (
  <div style={{
    fontFamily: "Figtree", fontSize: 11, fontWeight: 700,
    color: NdC.text35, letterSpacing: "1px", textTransform: "uppercase",
    padding: "8px 18px 8px",
  }}>{children}</div>
);

// === Attached document ===
const AttachedDoc = () => (
  <div style={{
    margin: "0 16px 14px",
    padding: "12px 14px",
    background: "#FFFFFF",
    borderRadius: 14,
    border: `1px solid ${NdC.borderL}`,
    display: "flex", alignItems: "center", gap: 12,
    cursor: "pointer",
    boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
  }}>
    <div style={{
      width: 36, height: 44, borderRadius: 7,
      background: "#FFFFFF",
      border: `1px solid ${NdC.border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#DC2626", flexShrink: 0,
    }}><NdIcon.Pdf size={18} color="#DC2626" /></div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontFamily: "Figtree", fontSize: 13.5, fontWeight: 600,
        color: NdC.text, letterSpacing: "-0.1px",
      }}>Copie corrigée</div>
      <div style={{
        fontFamily: "Figtree", fontSize: 11.5, fontWeight: 500,
        color: NdC.text35, letterSpacing: "-0.05px", marginTop: 1,
      }}>PDF · 4 pages · 612 Ko</div>
    </div>
    <span style={{ fontFamily: "Figtree", fontSize: 18, color: NdC.text35 }}>›</span>
  </div>
);

// === Bottom bar ===
const NdBottomBar = () => (
  <div style={{
    flexShrink: 0,
    background: "rgba(247,247,245,0.95)",
    backdropFilter: "blur(12px) saturate(180%)",
    WebkitBackdropFilter: "blur(12px) saturate(180%)",
    borderTop: `1px solid rgba(15,23,42,0.07)`,
    padding: "10px 16px 18px",
    display: "flex", gap: 10,
  }}>
    <button style={{
      flex: 1, height: 48, borderRadius: 14,
      background: "#FFFFFF",
      border: `1px solid ${NdC.borderL}`,
      color: NdC.text, cursor: "pointer",
      fontFamily: "Figtree", fontSize: 14, fontWeight: 700,
      letterSpacing: "-0.15px",
    }}>Féliciter Emma</button>
    <button style={{
      flex: 1, height: 48, borderRadius: 14,
      background: NdC.text, color: "#FFFFFF",
      border: "none", cursor: "pointer",
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
      fontFamily: "Figtree", fontSize: 14, fontWeight: 700,
      letterSpacing: "-0.15px",
    }}>
      <NSymbolNd size={13} color="#FFFFFF" /> Demander à Aria
    </button>
  </div>
);

// === SCREEN ===
const GradeDetailScreen = () => {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: NdC.bg,
      display: "flex", flexDirection: "column",
      fontFamily: "Figtree, sans-serif",
    }}>
      <div style={{ paddingTop: 56 }}>
        <NdTopBar subjectColor="#4338CA" />
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
        <NdHero />
        <ClassDistribution />

        <NdSectionH>Ce qu'Aria comprend</NdSectionH>
        <NdAriaCard />
        <NdSuggestion />

        <NdSectionH>Commentaire</NdSectionH>
        <TeacherComment />

        <NdSectionH>Document</NdSectionH>
        <AttachedDoc />
      </div>

      <NdBottomBar />
    </div>
  );
};

window.GradeDetailScreen = GradeDetailScreen;
