/** Default title for a newly created Aria thread (unique per minute on device). */
export function defaultNewAriaConversationTitle(): string {
  const d = new Date();
  return `Conseils · ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

export type AriaConversationListItem = {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
};

/**
 * Sidebar label: migrate legacy "Conseils pour …" to dated form; disambiguate duplicates.
 */
export function ariaSidebarTitle(c: AriaConversationListItem, list: AriaConversationListItem[]): string {
  const migrated = (t: string, updatedAt: string) => {
    const s = t.trim();
    if (/^Conseils pour /i.test(s)) {
      return `Conseils · ${new Date(updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
    }
    return s;
  };

  const label = migrated(c.title, c.updatedAt);
  const same = list.filter((x) => migrated(x.title, x.updatedAt) === label);
  if (same.length <= 1) return label;

  if (c.lastMessage && c.lastMessage !== 'Nouvelle conversation') {
    const lm = c.lastMessage.trim();
    return lm.length > 40 ? `${lm.slice(0, 37)}…` : lm;
  }
  return `${label} · ${new Date(c.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}
