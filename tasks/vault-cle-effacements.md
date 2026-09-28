# Clé service dans le Vault — marche à suivre (tableau de bord, sans terminal)

But : permettre à la tâche quotidienne (M26) d'appeler la fonction « executer-effacements ». La clé reste dans le
Vault chiffré de Supabase : elle n'est ni dans l'app, ni dans le dépôt, ni dans un message.

> Ne colle la clé NULLE PART ailleurs que dans le champ du Vault (ni chat, ni fichier, ni note).
> [UNCLEAR] Les libellés du tableau de bord peuvent légèrement différer (Supabase les change parfois) : dis-moi si
> un bouton n'est pas là où je l'indique.

## 1. Copier la clé service_role (ancien format)
1. Ouvre https://supabase.com/dashboard/project/nmizwmymhqleasnxcyvu
2. Menu de gauche, tout en bas : **Project Settings** (roue dentée).
3. Dans la colonne des réglages : **API Keys**.
4. Onglet **Legacy anon, service_role API keys**.
5. Ligne **service_role** (marquée « secret ») : clique **Reveal**, puis **Copy**.
   (C'est bien cette clé-là, pas la « Secret key » `sb_secret_…` de l'autre onglet : la fonction compare avec
   la clé service_role.)

## 2. La ranger dans le Vault
6. Menu de gauche : **Integrations**, puis **Vault** (si une page propose de l'activer : **Enable**).
7. Onglet **Secrets**, bouton **Add new secret**.
8. Remplis :
   - **Name** : `cle_service_effacements` (exactement, en minuscules, avec les tirets bas)
   - **Description** : `Tâche quotidienne d'effacement (L7)`
   - **Secret** : colle la clé copiée à l'étape 5
9. **Save**. La liste montre le nom ; la valeur reste masquée.

## 3. Me prévenir
10. Écris-moi « Vault fait ». Je ne lis pas la valeur : je vérifie seulement que le secret de ce NOM existe, puis
    j'applique M26 (sauvegarde, essai à blanc, application, advisors) et je lance un appel de contrôle, qui doit
    répondre `{"dues":0,…}` (aucune demande échue aujourd'hui).

## Pour annuler
- Supprimer la tâche : script inverse `supabase/migrations_down/20260928110000_m26_tache_effacements_down.sql`.
- Supprimer le secret : Vault › Secrets › `cle_service_effacements` › Delete.
- Si la clé service_role devait être changée un jour : mettre à jour la valeur du secret au même endroit.
