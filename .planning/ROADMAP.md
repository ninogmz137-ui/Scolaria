# Roadmap: Scolaria

## Overview

Scolaria est le copilote éducatif des familles. Ce milestone ajoute les capacités d'action autonome à Aria — le parent peut demander en langage naturel de signaler une absence, créer un mot de liaison, ou envoyer un message, et Aria exécute après confirmation.

## Phases

- [ ] **Phase 1: Aria Actions** - Intent detection + action router + confirmation UI + exécution via services existants

## Phase Details

### Phase 1: Aria Actions
**Goal**: Permettre au parent de déclencher des actions réelles (absence, liaison, message) depuis l'interface Aria en langage naturel, avec confirmation obligatoire avant exécution.
**Depends on**: Nothing
**Requirements**: REQ-01, REQ-02, REQ-03
**Success Criteria** (what must be TRUE):
  1. Le parent peut dire "Léa est malade" et Aria crée l'absence après confirmation
  2. Le parent peut demander d'envoyer un message à un enseignant via Aria
  3. Toute action affiche une card de confirmation avant d'agir
  4. En cas d'erreur Supabase, Aria l'explique en langage naturel
  5. Le buildSystemPrompt est enrichi avec le contexte actionnable

**Canonical refs**:
- src/services/ariaApi.ts
- src/services/absenceService.ts
- src/services/liaisonService.ts
- src/stores/messagerieStore.ts
- src/screens/aria/AriaConversationScreen.tsx
- src/screens/AriaScreen.tsx
- CLAUDE.md

