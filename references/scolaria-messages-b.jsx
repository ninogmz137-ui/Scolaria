/* global React */

// === Direction B: Conversations contextualisées (Apple Messages enrichi) ===

const MbIcon = {
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
  Msg: ({ size = 20, color = "currentColor", filled = false }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 1 1-3.2-6.4L21 4l-1 4.5A8 8 0 0 1 21 12z" />
    </svg>
  ),
  Settings: ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1A7 7 0 0 0 14.4 5l-.4-2.5h-4l-.4 2.5a7 7 0 0 0-2.1 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2.1 1.2L10 21h4l.4-2.6a7 7 0 0 0 2.1-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />
    </svg>
  ),
  Search: ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
    </svg>
  ),
  Scan: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M21 7V5a2 2 0 0 0-2-2h-2M3 17v2a2 2 0 0 0 2 2h2M21 17v2a2 2 0 0 1-2 2h-2M7 12h10" />
    </svg>
  ),
  Edit: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
  ),
};

const NSymbolMb = ({ size = 14, color = "#4338CA" }) => {
  const ellipses = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const x = 12 + Math.cos(a) * 7;
    const y = 12 + Math.sin(a) * 7;
    ellipses.push(<ellipse key={i} cx={x} cy={y} rx="1.6" ry="2.6" fill={color} transform={`rotate(${(i / 8) * 360} ${x} ${y})`} />);
  }
  return <svg width={size} height={size} viewBox="0 0 24 24">{ellipses}</svg>;
};

const MbC = {
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

const TAGS = {
  sortie:    { bg: "#CFFAFE", text: "#155E75", label: "Sortie" },
  devoir:    { bg: "#FEF3C7", text: "#92400E", label: "Devoir" },
  vie:       { bg: "#EDE9FE", text: "#5B21B6", label: "Vie scolaire" },
  cantine:   { bg: "#D1FAE5", text: "#065F46", label: "Cantine" },
  admin:     { bg: "#E2E8F0", text: "#334155", label: "Administratif" },
  controle:  { bg: "#FCE7F3", text: "#9D174D", label: "Contrôle" },
  rdv:       { bg: "#FFEDD5", text: "#9A3412", label: "Rendez-vous" },
};

const URGENCY = {
  signer:   { bg: "#FCE7F3", text: "#9D174D", label: "À signer" },
  repondre: { bg: "#FEF3C7", text: "#92400E", label: "À répondre" },
};

const MbTopBar = () => {
  const tabs = [
    { id: "home", icon: MbIcon.Home, label: "Accueil" },
    { id: "notes", icon: MbIcon.Book, label: "Notes" },
    { id: "agenda", icon: MbIcon.Cal, label: "Agenda" },
    { id: "messages", icon: MbIcon.Msg, label: "Messages", active: true },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px 10px", background: MbC.bg }}>
      <button style={{
        width: 42, height: 42, borderRadius: 999, background: "#1F1F2E",
        border: "2px solid rgba(15,23,42,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, cursor: "pointer", padding: 0, flexShrink: 0,
      }}>🐆</button>
      {tabs.map(tab => {
        const isActive = tab.active;
        const TabIcon = tab.icon;
        return (
          <button key={tab.id} style={{
            display: "flex", alignItems: "center", gap: 7, height: 40,
            padding: isActive ? "0 16px 0 13px" : "0 9px",
            borderRadius: 999,
            background: isActive ? "rgba(15,23,42,0.08)" : "transparent",
            border: "none",
            color: isActive ? MbC.text : "rgba(15,23,42,0.42)",
            fontSize: 16, fontWeight: isActive ? 600 : 500,
            fontFamily: "Figtree, sans-serif", letterSpacing: "-0.2px",
            cursor: "pointer", flexShrink: 0,
          }}>
            <TabIcon size={isActive ? 19 : 22} filled={isActive} color="currentColor" />
            {isActive && <span>{tab.label}</span>}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      <button style={{
        width: 42, height: 42, borderRadius: 999,
        background: "rgba(15,23,42,0.08)", border: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "rgba(15,23,42,0.55)", cursor: "pointer", padding: 0, flexShrink: 0,
      }}><MbIcon.Settings size={20} /></button>
    </div>
  );
};

// === Urgent banner (calmly highlighted) ===
const UrgentBanner = () => (
  <div style={{
    margin: "0 16px 18px",
    padding: "12px 14px",
    background: "#FFFFFF",
    borderRadius: 14,
    border: `1px solid ${MbC.borderL}`,
    display: "flex", alignItems: "center", gap: 10,
    boxShadow: "0 1px 6px rgba(15,23,42,0.03)",
  }}>
    <div style={{
      width: 30, height: 30, borderRadius: 10,
      background: "#FCE7F3",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <span style={{ fontFamily: "Figtree", fontSize: 14, fontWeight: 800, color: "#9D174D" }}>2</span>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontFamily: "Figtree", fontSize: 14, fontWeight: 600,
        color: MbC.text, letterSpacing: "-0.15px", lineHeight: 1.3,
      }}>
        <span style={{ color: "#9D174D", fontWeight: 700 }}>1 mot à signer</span>
        <span style={{ color: MbC.text35 }}> · </span>
        <span style={{ color: "#92400E", fontWeight: 700 }}>1 RDV à confirmer</span>
      </div>
      <div style={{
        fontFamily: "Figtree", fontSize: 12, fontWeight: 500,
        color: MbC.text55, letterSpacing: "-0.05px", marginTop: 1,
      }}>Aria a regroupé les messages qui attendent une réponse.</div>
    </div>
  </div>
);

// === Conversation row ===
const ConvRow = ({ avatar, color, name, role, tag, urgency, lastMessage, ariaSummary, time, unread, isLast }) => {
  const tg = TAGS[tag];
  const ur = urgency ? URGENCY[urgency] : null;
  return (
    <div style={{
      padding: "14px 16px",
      borderBottom: isLast ? "none" : `1px solid ${MbC.borderL}`,
      display: "flex", gap: 12, alignItems: "flex-start",
      cursor: "pointer",
      position: "relative",
      background: unread ? "rgba(67,56,202,0.025)" : "transparent",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 999,
        background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        fontFamily: "Figtree", fontSize: 16, fontWeight: 700,
        color: "#FFFFFF", letterSpacing: "-0.3px",
      }}>{avatar}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{
            fontFamily: "Figtree", fontSize: 14.5, fontWeight: 700,
            color: MbC.text, letterSpacing: "-0.2px",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{name}</span>
          <span style={{
            fontFamily: "Figtree", fontSize: 12, fontWeight: 500,
            color: MbC.text35, letterSpacing: "-0.05px",
          }}>· {role}</span>
          <div style={{ flex: 1 }} />
          <span style={{
            fontFamily: "Figtree", fontSize: 12, fontWeight: 500,
            color: unread ? MbC.indigo : MbC.text35, letterSpacing: "-0.05px",
            flexShrink: 0,
          }}>{time}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5, flexWrap: "wrap" }}>
          <span style={{
            display: "inline-flex", alignItems: "center",
            padding: "2px 8px", borderRadius: 999,
            background: tg.bg, color: tg.text,
            fontFamily: "Figtree", fontSize: 11, fontWeight: 600,
            letterSpacing: "-0.05px",
          }}>{tg.label}</span>
          {ur && (
            <span style={{
              display: "inline-flex", alignItems: "center",
              padding: "2px 8px", borderRadius: 999,
              background: ur.bg, color: ur.text,
              fontFamily: "Figtree", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.2px", textTransform: "uppercase",
            }}>{ur.label}</span>
          )}
        </div>
        <div style={{
          fontFamily: "Figtree", fontSize: 13.5, fontWeight: unread ? 600 : 500,
          color: MbC.text, letterSpacing: "-0.15px", lineHeight: 1.35,
          textWrap: "pretty",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          marginBottom: 3,
        }}>{lastMessage}</div>
        <div style={{
          display: "flex", gap: 6, alignItems: "flex-start",
          fontFamily: "Figtree", fontSize: 12.5, fontWeight: 500,
          color: MbC.indigo, letterSpacing: "-0.1px", lineHeight: 1.35,
          fontStyle: "italic",
          textWrap: "pretty",
        }}>
          <span style={{ flexShrink: 0, marginTop: 3, opacity: 0.85 }}>
            <NSymbolMb size={11} color={MbC.indigo} />
          </span>
          <span style={{ opacity: 0.85 }}>{ariaSummary}</span>
        </div>
      </div>
    </div>
  );
};

// === Filter pills ===
const FilterPills = ({ active = "Tous" }) => {
  const filters = ["Tous", "À signer", "À répondre", "Vie scolaire", "Devoirs", "Cantine"];
  return (
    <div style={{
      display: "flex", gap: 8, padding: "0 16px 14px",
      overflowX: "auto", scrollbarWidth: "none",
    }}>
      {filters.map(f => {
        const isActive = f === active;
        return (
          <button key={f} style={{
            flexShrink: 0,
            height: 32, padding: "0 14px",
            borderRadius: 999,
            background: isActive ? MbC.text : "#FFFFFF",
            border: isActive ? "none" : `1px solid ${MbC.borderL}`,
            color: isActive ? "#FFFFFF" : "rgba(15,23,42,0.55)",
            fontFamily: "Figtree", fontSize: 13, fontWeight: 600,
            letterSpacing: "-0.1px", cursor: "pointer",
          }}>{f}</button>
        );
      })}
    </div>
  );
};

// === Compose FAB ===
const ComposeFABMb = () => (
  <button style={{
    position: "absolute",
    bottom: 92, right: 18,
    width: 56, height: 56, borderRadius: 999,
    background: MbC.text, border: "none",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#FFFFFF", cursor: "pointer",
    boxShadow: "0 8px 24px rgba(15,23,42,0.25), 0 2px 6px rgba(15,23,42,0.15)",
    zIndex: 10,
  }}><MbIcon.Edit size={22} /></button>
);

// === Bottom bar ===
const MbBottomBar = () => (
  <div style={{
    flexShrink: 0,
    background: "rgba(247,247,245,0.95)",
    backdropFilter: "blur(12px) saturate(180%)",
    WebkitBackdropFilter: "blur(12px) saturate(180%)",
    borderTop: `1px solid rgba(15,23,42,0.07)`,
    padding: "10px 14px 18px",
    display: "flex", alignItems: "center", gap: 10,
  }}>
    <button style={{
      width: 44, height: 44, borderRadius: 999,
      background: "rgba(15,23,42,0.08)", border: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: MbC.text55, cursor: "pointer", padding: 0, flexShrink: 0,
    }}><MbIcon.Search size={20} /></button>
    <div style={{
      flex: 1, height: 44, borderRadius: 999,
      background: "rgba(15,23,42,0.06)",
      border: `1px solid ${MbC.border}`,
      display: "flex", alignItems: "center", gap: 10, padding: "0 18px",
    }}>
      <NSymbolMb size={17} color={MbC.indigo} />
      <span style={{
        fontFamily: "Figtree", fontSize: 15, fontWeight: 500,
        color: "rgba(15,23,42,0.42)", letterSpacing: "-0.15px",
      }}>Demander à Aria…</span>
    </div>
    <button style={{
      width: 44, height: 44, borderRadius: 999,
      background: "rgba(15,23,42,0.08)", border: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: MbC.text55, cursor: "pointer", padding: 0, flexShrink: 0,
    }}><MbIcon.Scan size={19} /></button>
  </div>
);

// === SCREEN ===
const MessagesScreenB = () => {
  const conversations = [
    { avatar: "D",  color: "#DB2777", name: "Mme Dupont",  role: "Vie scolaire",  tag: "sortie",    urgency: "signer",   lastMessage: "Sortie Orsay jeudi 24, 9h–17h. Participation 8€.", ariaSummary: "Autorisation à signer avant vendredi.", time: "10:14", unread: true },
    { avatar: "G",  color: "#D97706", name: "M. Garnier",  role: "Histoire-Géo",  tag: "rdv",       urgency: "repondre", lastMessage: "Souhaitez-vous un point trimestriel ? 3 créneaux dispo…", ariaSummary: "3 créneaux proposés. Choisir avant lundi.", time: "hier",  unread: true },
    { avatar: "P",  color: "#4338CA", name: "M. Petit",    role: "Mathématiques", tag: "devoir",    urgency: null,       lastMessage: "Bon travail sur le DM, note 16/20. Voici les corrections…", ariaSummary: "Note 16/20. Axes : géométrie spatiale.", time: "hier",  unread: true },
    { avatar: "C",  color: "#059669", name: "Cantine",     role: "Voltaire",      tag: "cantine",   urgency: null,       lastMessage: "Menu de la semaine du 14 au 18 avril.", ariaSummary: "2 plats végé jeu. & ven. Aucun allergène.", time: "lun.",  unread: false },
    { avatar: "R",  color: "#0891B2", name: "Mme Roy",     role: "SVT",           tag: "devoir",    urgency: null,       lastMessage: "Compte rendu TP cellule disponible dans le casier numérique.", ariaSummary: "TP rendu, note 15,5/20.", time: "lun.",  unread: false },
    { avatar: "VS", color: "#7C3AED", name: "CPE Bertin",  role: "Vie scolaire",  tag: "vie",       urgency: null,       lastMessage: "Récapitulatif des absences du trimestre 2.", ariaSummary: "2 absences justifiées. RAS.", time: "ven.",  unread: false },
    { avatar: "AD", color: "#334155", name: "Direction",   role: "Voltaire",      tag: "admin",     urgency: null,       lastMessage: "Nouveau règlement intérieur, entrée en vigueur en mai.", ariaSummary: "Modifs : téléphone, retards. 4 min.", time: "ven.",  unread: false },
  ];

  return (
    <div style={{
      width: "100%", height: "100%",
      background: MbC.bg,
      display: "flex", flexDirection: "column",
      fontFamily: "Figtree, sans-serif",
      position: "relative",
    }}>
      <div style={{
        flex: 1, overflowY: "auto",
        paddingTop: 56, paddingBottom: 16,
      }}>
        <MbTopBar />
        <div style={{
          padding: "8px 18px 14px",
          fontFamily: "Figtree", fontSize: 26, fontWeight: 700,
          letterSpacing: "-0.6px", color: MbC.text,
        }}>
          Messages <span style={{ color: MbC.text35, fontWeight: 600 }}>· Emma</span>
        </div>

        <UrgentBanner />
        <FilterPills active="Tous" />

        <div style={{
          margin: "0 16px",
          background: "#FFFFFF",
          borderRadius: 18,
          border: `1px solid ${MbC.borderL}`,
          overflow: "hidden",
          boxShadow: "0 1px 8px rgba(15,23,42,0.04)",
        }}>
          {conversations.map((c, i) => (
            <ConvRow key={i} {...c} isLast={i === conversations.length - 1} />
          ))}
        </div>

        <div style={{ height: 24 }} />
      </div>

      <ComposeFABMb />
      <MbBottomBar />
    </div>
  );
};

window.MessagesScreenB = MessagesScreenB;
