# Audit de sécurité — écarts et décisions (4 oct 2026)

Lecture seule : **rien de ce document n'est appliqué à Paris.** M30 reste locale. Les gravités sont celles du rapport (`tasks/audit-securite.md`) ; le risque de casser l'app est mon estimation après relecture des appels de l'app et des tests.

Comptage : le rapport parle de « 17 écarts » (15 corrigés par M30 + 2 signalés au premier passage) ; le détail ci-dessous liste **14 lignes M30** (les 15 du premier passage, avec `mots_liaison` compté une fois pour l'insertion et la modification) et **10 constats signalés** (les 2 écarts + 8 constats d'hygiène). Rien n'est omis, tout est ici.

## A. Corrigés dans M30 (locale) — décision : « J'applique M30 à Paris ? »

| # | Écart | Gravité | Correction proposée (dans M30) | Risque de casser l'app | Décision requise |
|---|---|---|---|---|---|
| A1 | `compte_en_effacement` : un compte connecté sait si un AUTRE compte (UUID connu) est en cours d'effacement | faible | ne répond plus qu'au concerné ou au serveur | très faible (l'app ne l'appelle que pour son propre compte) | valider M30 |
| A2 | `enfant_en_effacement` : idem pour un enfant | faible | réservé à un responsable de l'enfant ou au serveur | très faible | valider M30 |
| A3 | `est_titulaire_enfant` : « ce prof est-il titulaire de cet enfant ? » ouvert à tous | faible | réservé au concerné, à un responsable ou au serveur | faible (utilisée par les politiques des fils enseignant ; testée) | valider M30 |
| A4 | `appreciations` : un parent peut écrire une appréciation sur l'enfant d'un autre foyer | moyenne | WITH CHECK `est_titulaire_enfant` | nul (écran enseignant non branché) | valider M30 |
| A5 | `messages` : message rattaché à l'enfant d'un autre foyer (table héritée, inutilisée) | faible | WITH CHECK `is_responsable(child_id)` | nul (table inutilisée) | valider M30 |
| A6 | `messages` : le destinataire peut réécrire le message | faible | déclencheur `messages_verrou` | nul | valider M30 |
| A7 | `read_receipts` : un étranger peut marquer « lu » un mot qui n'est pas dans ses carnets (fausse le « lu par ») | moyenne | le mot doit être dans un carnet dont on est responsable | faible (l'app ne marque que ses propres mots ; testé) | valider M30 |
| A8 | `mots_liaison` : `classe_id` d'une classe dont on n'est pas titulaire accepté (insertion / modification) | moyenne | WITH CHECK `is_titulaire_classe` | faible (un titulaire n'est pas gêné ; testé) | valider M30 |
| A9 | `agenda_events.parent_id` modifiable (usurper l'auteur) | faible | déclencheur `agenda_events_verrou_auteur` | très faible | valider M30 |
| A10 | `children.parent_id` modifiable | faible | déclencheur `children_verrou_createur` | très faible (la création passe par `create_child`) | valider M30 |
| A11 | `children.scolaria_id` modifiable | faible | même déclencheur | très faible | valider M30 |
| A12 | `foyers.created_by` modifiable | faible | déclencheur `foyers_verrou_createur` | très faible | valider M30 |
| A13 | `invitations_responsable.expires_at` libre (invitation qui n'expire jamais) | moyenne | déclencheur : 7 jours forcés | faible (l'app ne l'écrit pas) | valider M30 |
| A14 | `profiles.plan` modifiable par l'utilisateur (« premium » à soi-même) | moyenne | `protect_profile_role` verrouille aussi `plan` | nul (l'app ne l'écrit pas) | valider M30 |

Tests de M30 (2 oct) : m30 16/16, 14 suites SQL, effacement e2e 22/22, clé 15/15, tâche 9/9, invitation 12/12, inverse testé. **Reste ouvert après M30** : A8 laisse encore un brouillon SANS classe créable par un non-enseignant (sans effet pour autrui, voir B2).

## B. Signalés, non corrigés — une décision par ligne

| # | Constat | Gravité | Correction proposée | Risque de casser l'app | Décision requise | Où ça en est |
|---|---|---|---|---|---|---|
| B1 | **Droits de table très larges** : `anon` et `authenticated` ont tous les privilèges (dont `TRUNCATE`, `TRIGGER`, `REFERENCES`, `DELETE`) ; seule la RLS protège (activée partout, testée) | moyenne (défense en profondeur) | `REVOKE ALL … FROM anon` sur toutes les tables ; `REVOKE TRUNCATE, TRIGGER, REFERENCES FROM authenticated` | moyen : à tester avec TOUTES les suites + un parcours complet ; un oubli ferait échouer un écran | autoriser la migration (point 5) | **en cours : local d'abord (point 5)** |
| B2 | **Rôle enseignant non vérifié** : brouillon de mot sans classe et appréciations n'exigent pas `role = 'enseignant'` | faible | exiger le rôle à l'insertion, une fois l'attribution du rôle définie (B3) | faible | attendre la décision B3 | en attente de B3 |
| B3 | **Attribution du rôle « enseignant » indéfinie** : aucun chemin légitime ne produit un compte enseignant | à décider avant le sprint enseignant | procédure serveur : invitation d'enseignant par l'école, ou validation manuelle | nul aujourd'hui | **choisir** : invitation par l'école, ou validation manuelle | point 4 : inscription enseignant masquée en version réelle |
| B4 | `profiles.email` modifiable par le propriétaire (copie d'affichage ; l'autorisation passe par `auth.jwt()`) | faible | verrouiller (comme `role` / `plan`) ou supprimer la colonne | faible : à vérifier qui la LIT | choisir verrouiller / supprimer | **point 5 : lisible par qui, puis proposition** |
| B5 | `invitations_select` : l'invité lit toutes les colonnes de l'invitation (`child_id`, `invited_by`) sans email confirmé | faible | retirer la lecture directe pour l'invité ; ne garder que `mes_invitations()` | moyen : `InvitationsRecues` doit n'utiliser que la fonction (déjà le cas, à tester) | autoriser | **point 5** |
| B6 | **Aria sans limite d'appels** par compte | moyenne (coût, pas données) | plafond par compte et par jour dans l'Edge Function | faible (message clair à la limite) | choisir le plafond (proposition : 40 messages / jour) | **point 3** |
| B7 | Contenu des fichiers non inspecté (un HTML déclaré PDF est accepté) | faible (aucun accès : bucket privé, URL signées, lecteur système) | vérifier les octets de tête à la mise en ligne | faible | reporter ou faire | non planifié |
| B8 | Tables inutilisées : `messages`, `deletion_requests`, `export_history`, `transfer_codes`, `access_journal`, `person_permissions` | faible (surface) | **couper l'accès** (révoquer les droits, garder les données ; pas de suppression) | faible : l'app ne les lit pas (à confirmer par recherche dans `src/`) | autoriser | **point 5** |
| B9 | Erreur de clé étrangère distincte d'un refus RLS (existence d'un UUID devinable) | très faible | aucune : UUID v4 non devinables | — | aucune | clos |
| B10 | Mots de passe divulgués : protection désactivée (plan Pro) | faible | avec le passage au plan Pro | — | aucune maintenant | au todo |
