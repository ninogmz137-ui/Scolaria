# Phase 1: Aria Actions - Context

**Gathered:** 2026-04-16
**Status:** Ready for implementation

<domain>
## Phase Boundary

Permettre au parent de déclencher des actions réelles depuis l'interface Aria (AriaConversationScreen) en langage naturel. Actions V1 : signaler une absence, envoyer un message via la messagerie. Confirmation obligatoire avant toute exécution. Pas de nouvelle navigation — tout se passe dans le chat existant.
</domain>

<decisions>
## Implementation Decisions

### Action Detection
- **D-01:** Approche "action tags" — Aria termine sa réponse avec un tag structuré `[ACTION:TYPE|param=val|...]`. Pas de Claude tool calling pour l'instant (trop complexe, l'app appelle l'API en direct côté client).
- **D-02:** Format tag : `[ACTION:ABSENCE|date=YYYY-MM-DD|motif=maladie|demi_journee=journee]` et `[ACTION:MESSAGE|conversation_id=xxx|draft=texte rédigé par Aria]`
- **D-03:** Le tag est extrait du texte Aria côté client (AriaConversationScreen) avant affichage — l'utilisateur voit le message propre sans le tag.

### Confirmation UI
- **D-04:** Card de confirmation inline dans le chat — affichée juste sous le message Aria, comme un message spécial de type "action".
- **D-05:** Design : GlassCard premium, fond dégradé violet léger (`#EEF2FF → #F0FDFA`), border `#E0E7FF`, icone lucide, recap de l'action en clair, boutons "Confirmer" (gradient violet) + "Annuler" (ghost).
- **D-06:** Après confirmation : card passe en état "traitement" (spinner), puis success ou erreur affichés dans la card elle-même. Ensuite, Aria envoie un message de confirmation en langage naturel.
- **D-07:** Annuler → card disparaît, Aria envoie "D'accord, je n'ai rien fait. Tu peux me redemander."

### Actions V1
- **D-08:** Absence : utilise `createAbsence()` de `absenceService.ts`. Student ID depuis `useActiveChild().activeChild.id`. Date = aujourd'hui par défaut si non précisée.
- **D-09:** Message : utilise `sendMessage(conversationId, text)` de `messagerieStore.ts`. Aria choisit la conversation la plus pertinente (premier enseignant dans les conversations de l'enfant actif). Le texte du message est rédigé par Aria dans le tag.
- **D-10:** Pas de formulaire interactif dans la card — Aria extrait les infos dans la conversation. Si infos manquantes, Aria pose une question au lieu d'émettre un tag d'action.

### Enrichissement système prompt
- **D-11:** `buildSystemPrompt()` dans `ariaApi.ts` ajoute une section "ACTIONS DISPONIBLES" enrichie avec le format de tag structuré et les valeurs valides pour chaque param.
- **D-12:** Pas de récupération de données live dans le système prompt pour V1 — le contexte de l'enfant (childContext) suffit.

### Claude's Discretion
- Gestion des erreurs réseau vs erreurs Supabase : Claude décide du message d'erreur exact affiché.
- Animation de la card de confirmation : Claude choisit l'approche la plus fluide.
- Ordre des paramètres dans le tag : Claude standardise.
</decisions>

<canonical_refs>
## Canonical References

### Code existant à modifier
- `src/services/ariaApi.ts` — system prompt builder + sendToAria()
- `src/screens/aria/AriaConversationScreen.tsx` — parsing tags + affichage ActionCard
- `src/services/absenceService.ts` — createAbsence() + types
- `src/stores/messagerieStore.ts` — sendMessage()
- `src/data/messagerieData.ts` — conversations par enfant (pour trouver la bonne conversation)

### Nouveaux fichiers à créer
- `src/services/ariaActions.ts` — parseActionTag() + executeAriaAction() + types
- `src/components/aria/AriaActionCard.tsx` — UI de confirmation

### Design system
- `CLAUDE.md` — GlassCard spec, couleurs, typographie, règles absolues
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GlassCard` (`src/components/GlassCard.tsx`) : card glass morphism standard — réutilisable pour l'ActionCard
- `ChatBubble` (`src/components/chat/ChatBubble.tsx`) : type `Message` déjà défini, composant de bulle — ActionCard s'insère comme message de type spécial
- `useActiveChild()` : fournit `activeChild.id` pour le student_id
- `sendToAria()` : déjà appelé dans AriaConversationScreen — on peut injecter un message de confirmation Aria programmatiquement

### Established Patterns
- Les messages Aria dans le chat sont des objets `{ id, role: 'assistant', content, timestamp }`
- Le chat est un FlatList de `Message[]` dans `AriaConversationScreen`
- Les actions after-confirmation génèrent un nouveau message Aria via `setMessages()`

### Integration Points
- `AriaConversationScreen.tsx` ligne ~sendToAria() : c'est ici qu'on parse la réponse et détecte le tag
- `ariaApi.ts` → `buildSystemPrompt()` : ajouter le format structuré des tags
- `absenceService.createAbsence()` : appel direct après confirmation
- `messagerieStore.sendMessage()` : appel direct après confirmation
</code_context>

<specifics>
## Specific Ideas

- L'utilisateur a mentionné explicitement : absence, message aux enseignants, prévenir d'un retard
- Vision long terme : Aria devient l'interface unique pour toutes les actions parentales — on ne va dans les autres écrans que pour consulter, pas pour agir
- V1 intentionnellement limitée : absence + message. Les autres actions (signer un mot de liaison, modifier un événement agenda) sont pour V2.
</specifics>

<deferred>
## Deferred Ideas

- Signer un mot de liaison via Aria (V2)
- Modifier/créer un événement agenda via Aria (V2)
- Aria propose des actions proactivement sans que le parent demande (V2)
- Claude tool calling côté serveur via Edge Function Supabase (V2 — nécessite backend)
- Historique des actions Aria (V2)
</deferred>

---

*Phase: 01-aria-actions*
*Context gathered: 2026-04-16*
