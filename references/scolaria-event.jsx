/* global React */

// === Détail événement (depuis Agenda) — Sortie Orsay ===

const EvIcon = {
  ChevronL: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
  ),
  More: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
  ),
  Cal: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
  ),
  Clock: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  ),
  MapPin: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
  ),
  Person: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
  ),
  Bell: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16z" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>
  ),
  Bag: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 7h14l-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7z" /><path d="M9 11V6a3 3 0 0 1 6 0v5" /></svg>
  ),
  Check: ({ size = 12, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
  ),
  Map: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 20l-6 2V5l6-2 6 2 6-2v17l-6 2-6-2z" /><path d="M9 3v17M15 5v17" /></svg>
  ),
};

const NSymbolEv = ({ size = 14, color = "#4338CA" }) => {
  const ellipses = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const x = 12 + Math.cos(a) * 7;
    const y = 12 + Math.sin(a) * 7;
    ellipses.push(<ellipse key={i} cx={x} cy={y} rx="1.6" ry="2.6" fill={color} transform={`rotate(${(i / 8) * 360} ${x} ${y})`} />);
  }
  return <svg width={size} height={size} viewBox="0 0 24 24">{ellipses}</svg>;
};

const EvC = {
  bg: "#F7F7F5",
  text: "#0F172A",
  text55: "rgba(15,23,42,0.55)",
  text35: "rgba(15,23,42,0.35)",
  border: "rgba(15,23,42,0.06)",
  borderL: "rgba(15,23,42,0.05)",
  indigo: "#4338CA",
  cyan: "#0891B2",
};

// === Top bar ===
const EvTopBar = () => (
  <div style={{
    display: "flex", alignItems: "center", gap: 8,
    padding: "14px 14px 8px",
  }}>
    <button style={{
      width: 40, height: 40, borderRadius: 999,
      background: "rgba(255,255,255,0.18)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      border: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#FFFFFF", cursor: "pointer", padding: 0, flexShrink: 0,
    }}><EvIcon.ChevronL size={22} color="#FFFFFF" /></button>
    <div style={{ flex: 1 }} />
    <button style={{
      width: 40, height: 40, borderRadius: 999,
      background: "rgba(255,255,255,0.18)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      border: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#FFFFFF", cursor: "pointer", padding: 0, flexShrink: 0,
    }}><EvIcon.More size={20} color="#FFFFFF" /></button>
  </div>
);

// === Hero (immersive header with category color) ===
const EvHero = () => (
  <div style={{
    position: "relative",
    background: "linear-gradient(160deg, #0E7490 0%, #155E75 50%, #0F4C5C 100%)",
    paddingBottom: 30,
    overflow: "hidden",
  }}>
    {/* Decorative blob */}
    <div style={{
      position: "absolute", right: -80, top: -40,
      width: 220, height: 220, borderRadius: 999,
      background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)",
      pointerEvents: "none",
    }} />
    <div style={{
      position: "absolute", left: -60, bottom: -100,
      width: 200, height: 200, borderRadius: 999,
      background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)",
      pointerEvents: "none",
    }} />

    <div style={{ paddingTop: 56 }}>
      <EvTopBar />

      <div style={{ padding: "16px 22px 0", position: "relative" }}>
        <span style={{
          display: "inline-flex", alignItems: "center",
          padding: "5px 12px", borderRadius: 999,
          background: "rgba(255,255,255,0.18)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          color: "#FFFFFF",
          fontFamily: "Figtree", fontSize: 11, fontWeight: 700,
          letterSpacing: "0.5px", textTransform: "uppercase",
          marginBottom: 14,
        }}>Sortie scolaire</span>
        <div style={{
          fontFamily: "Figtree", fontSize: 30, fontWeight: 800,
          color: "#FFFFFF", letterSpacing: "-0.7px", lineHeight: 1.1,
          marginBottom: 8, textWrap: "pretty",
        }}>Musée d'Orsay</div>
        <div style={{
          fontFamily: "Figtree", fontSize: 14.5, fontWeight: 500,
          color: "rgba(255,255,255,0.78)", letterSpacing: "-0.15px",
          lineHeight: 1.4,
          textWrap: "pretty",
        }}>Programme d'histoire des arts · Classe de 4ᵉB</div>
      </div>

      {/* Countdown pill */}
      <div style={{
        margin: "20px 22px 0",
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "7px 14px", borderRadius: 999,
        background: "rgba(255,255,255,0.95)",
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: 999,
          background: "#0E7490",
        }} />
        <span style={{
          fontFamily: "Figtree", fontSize: 12, fontWeight: 700,
          color: "#0F4C5C", letterSpacing: "-0.05px",
        }}>Dans 9 jours · Jeudi 24 avril</span>
      </div>
    </div>
  </div>
);

// === Quick info grid ===
const QuickInfoGrid = () => {
  const items = [
    { icon: EvIcon.Clock, label: "Horaire", val: "9h00 – 17h00" },
    { icon: EvIcon.MapPin, label: "Lieu", val: "Musée d'Orsay" },
    { icon: EvIcon.Person, label: "Encadrement", val: "Mme Dupont +2" },
    { icon: EvIcon.Cal, label: "Statut", val: "Inscrite", positive: true },
  ];
  return (
    <div style={{
      margin: "-18px 16px 14px",
      background: "#FFFFFF",
      borderRadius: 18,
      border: `1px solid ${EvC.borderL}`,
      boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
      display: "grid", gridTemplateColumns: "1fr 1fr",
      overflow: "hidden",
    }}>
      {items.map((it, i) => {
        const Icn = it.icon;
        const isRight = i % 2 === 1;
        const isBottomRow = i >= 2;
        return (
          <div key={i} style={{
            padding: "14px 16px",
            borderRight: isRight ? "none" : `1px solid ${EvC.borderL}`,
            borderTop: isBottomRow ? `1px solid ${EvC.borderL}` : "none",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: "Figtree", fontSize: 11, fontWeight: 700,
              color: EvC.text35, letterSpacing: "0.5px", textTransform: "uppercase",
              marginBottom: 5,
            }}>
              <Icn size={13} color={EvC.text35} /> {it.label}
            </div>
            <div style={{
              fontFamily: "Figtree", fontSize: 14, fontWeight: 700,
              color: it.positive ? "#059669" : EvC.text, letterSpacing: "-0.2px",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              {it.positive && (
                <span style={{
                  width: 16, height: 16, borderRadius: 999,
                  background: "#059669",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}><EvIcon.Check size={11} color="#FFFFFF" /></span>
              )}
              {it.val}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// === Aria summary card ===
const EvAriaCard = () => (
  <div style={{
    margin: "0 16px 14px",
    padding: "14px",
    background: "linear-gradient(135deg, #EEF2FF 0%, #F0FDFA 100%)",
    borderRadius: 16,
    border: "1px solid rgba(67,56,202,0.1)",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <NSymbolEv size={14} color={EvC.indigo} />
      <span style={{
        fontFamily: "Figtree", fontSize: 11, fontWeight: 700,
        color: EvC.indigo, letterSpacing: "0.6px", textTransform: "uppercase",
      }}>Aria · à savoir</span>
    </div>
    <div style={{
      fontFamily: "Figtree", fontSize: 13.5, fontWeight: 500,
      color: EvC.text, letterSpacing: "-0.1px", lineHeight: 1.45,
      textWrap: "pretty",
    }}>Tu as <strong>signé l'autorisation le 15/04</strong>. Pense à prévoir un pique-nique et une bouteille d'eau. Tenue confortable recommandée.</div>
  </div>
);

// === Section heading ===
const EvSectionH = ({ children }) => (
  <div style={{
    fontFamily: "Figtree", fontSize: 11, fontWeight: 700,
    color: EvC.text35, letterSpacing: "1px", textTransform: "uppercase",
    padding: "8px 18px 8px",
  }}>{children}</div>
);

// === Description ===
const EvDescription = () => (
  <div style={{
    margin: "0 16px 14px",
    padding: "14px 16px",
    background: "#FFFFFF",
    borderRadius: 16,
    border: `1px solid ${EvC.borderL}`,
    boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
  }}>
    <div style={{
      fontFamily: "Figtree", fontSize: 14, fontWeight: 500,
      color: EvC.text, letterSpacing: "-0.1px", lineHeight: 1.55,
      textWrap: "pretty",
    }}>
      Visite guidée des collections impressionnistes du musée d'Orsay. Atelier sur Manet et Monet l'après-midi. <span style={{ color: EvC.text55 }}>Préparation en cours en classe d'histoire des arts.</span>
    </div>
  </div>
);

// === Checklist (à prévoir) ===
const EvChecklist = () => {
  const items = [
    { label: "Pique-nique tiré du sac", done: false },
    { label: "Bouteille d'eau", done: false },
    { label: "Tenue confortable", done: false },
    { label: "Carnet et crayon", done: false },
  ];
  return (
    <div style={{
      margin: "0 16px 14px",
      background: "#FFFFFF",
      borderRadius: 16,
      border: `1px solid ${EvC.borderL}`,
      overflow: "hidden",
      boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
    }}>
      <div style={{
        padding: "10px 16px",
        borderBottom: `1px solid ${EvC.borderL}`,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <EvIcon.Bag size={13} color={EvC.text55} />
        <span style={{
          flex: 1, fontFamily: "Figtree", fontSize: 13, fontWeight: 700,
          color: EvC.text, letterSpacing: "-0.15px",
        }}>À prévoir pour Emma</span>
        <span style={{
          fontFamily: "Figtree", fontSize: 11, fontWeight: 600,
          color: EvC.text35, letterSpacing: "-0.05px",
          fontVariantNumeric: "tabular-nums",
        }}>0 / 4</span>
      </div>
      {items.map((it, i, arr) => (
        <div key={i} style={{
          padding: "10px 16px",
          borderBottom: i === arr.length - 1 ? "none" : `1px solid ${EvC.borderL}`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: 6,
            background: it.done ? EvC.text : "#FFFFFF",
            border: it.done ? "none" : `1.5px solid ${EvC.text35}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            {it.done && <EvIcon.Check size={11} color="#FFFFFF" />}
          </div>
          <span style={{
            flex: 1, fontFamily: "Figtree", fontSize: 13.5, fontWeight: 500,
            color: it.done ? EvC.text35 : EvC.text, letterSpacing: "-0.1px",
            textDecoration: it.done ? "line-through" : "none",
          }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
};

// === Reminder + map row ===
const EvActionRow = () => (
  <div style={{
    margin: "0 16px 14px",
    background: "#FFFFFF",
    borderRadius: 16,
    border: `1px solid ${EvC.borderL}`,
    overflow: "hidden",
    boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
  }}>
    {[
      { icon: EvIcon.Bell, label: "Rappel", val: "Veille à 19h", toggle: true },
      { icon: EvIcon.Map, label: "Itinéraire", val: "1 esplanade Valéry Giscard d'Estaing", chev: true },
    ].map((it, i, arr) => {
      const Icn = it.icon;
      return (
        <div key={i} style={{
          padding: "13px 16px",
          borderBottom: i === arr.length - 1 ? "none" : `1px solid ${EvC.borderL}`,
          display: "flex", alignItems: "center", gap: 12,
          cursor: "pointer",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: "rgba(15,23,42,0.05)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: EvC.text55, flexShrink: 0,
          }}><Icn size={16} color="currentColor" /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "Figtree", fontSize: 14, fontWeight: 600,
              color: EvC.text, letterSpacing: "-0.15px",
            }}>{it.label}</div>
            <div style={{
              fontFamily: "Figtree", fontSize: 12.5, fontWeight: 500,
              color: EvC.text55, letterSpacing: "-0.05px", marginTop: 1,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{it.val}</div>
          </div>
          {it.toggle && (
            <div style={{
              width: 38, height: 22, borderRadius: 999,
              background: "#059669", position: "relative", flexShrink: 0,
            }}>
              <div style={{
                position: "absolute", top: 2, right: 2,
                width: 18, height: 18, borderRadius: 999,
                background: "#FFFFFF",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </div>
          )}
          {it.chev && (
            <span style={{ fontFamily: "Figtree", fontSize: 18, color: EvC.text35 }}>›</span>
          )}
        </div>
      );
    })}
  </div>
);

// === Bottom bar ===
const EvBottomBar = () => (
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
      border: `1px solid ${EvC.borderL}`,
      color: EvC.text, cursor: "pointer",
      fontFamily: "Figtree", fontSize: 14, fontWeight: 700,
      letterSpacing: "-0.15px",
    }}>Voir le message</button>
    <button style={{
      flex: 1, height: 48, borderRadius: 14,
      background: EvC.text, color: "#FFFFFF",
      border: "none", cursor: "pointer",
      fontFamily: "Figtree", fontSize: 14, fontWeight: 700,
      letterSpacing: "-0.15px",
    }}>Demander à Aria</button>
  </div>
);

// === SCREEN ===
const EventDetailScreen = () => {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: EvC.bg,
      display: "flex", flexDirection: "column",
      fontFamily: "Figtree, sans-serif",
    }}>
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
        <EvHero />
        <QuickInfoGrid />

        <EvSectionH>Aria</EvSectionH>
        <EvAriaCard />

        <EvSectionH>Description</EvSectionH>
        <EvDescription />

        <EvSectionH>Préparation</EvSectionH>
        <EvChecklist />

        <EvSectionH>Notifications & itinéraire</EvSectionH>
        <EvActionRow />
      </div>

      <EvBottomBar />
    </div>
  );
};

window.EventDetailScreen = EventDetailScreen;
