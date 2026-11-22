# Lot 7a — votre marche à suivre : Firebase, clé FCM, jeton Expo

*Rédigée le 22 nov. 2026. À faire de votre côté, à part : je ne peux ni créer de compte, ni manipuler une clé privée,
ni passer une double authentification. Aucune de ces étapes ne touche à Paris ni au dépôt.*

Les libellés d'écran viennent des consoles telles que je les connais ; elles changent parfois de place.
**[UNCLEAR]** marque ceux dont je ne suis pas certain : si un bouton n'est pas où je l'indique, cherchez le même mot
dans la page, et dites-le-moi (je corrigerai ce document).

À la fin, vous aurez trois choses, et **aucune ne doit entrer dans le dépôt** (règle R2) :
- `google-services.json` → déposé dans EAS (variable de type fichier) ;
- la clé FCM v1 (un fichier JSON avec une clé privée) → déposée dans EAS, puis supprimée de votre disque ;
- le jeton d'accès Expo → gardé pour l'essai local, puis secret Supabase lors du cycle Paris.

---

## A. Firebase : le projet et l'app Android (gratuit, environ 10 minutes)

1. Ouvrez **https://console.firebase.google.com**, connectez-vous avec le compte Google qui gérera Scolaria.
2. **« Créer un projet »** (ou « Ajouter un projet » / « Get started with a Firebase project » **[UNCLEAR]** selon la langue).
   - Nom : `scolaria-notifications` (le nom n'apparaît jamais aux familles).
   - **Google Analytics : désactivez-le** à l'écran suivant (inutile, et c'est un traitement de données de plus).
   - « Créer le projet », attendez, puis « Continuer ».
3. Sur la page d'accueil du projet, cliquez l'icône **Android** (robot vert) sous « Commencez par ajouter Firebase à votre
   application ».
   - **Nom du package Android** : `com.scolaria.app` — exactement, sans espace.
   - Pseudo de l'application : `Scolaria Android` (facultatif).
   - Certificat SHA-1 : **laissez vide** (inutile pour les notifications).
   - « Enregistrer l'application ».
4. **« Télécharger google-services.json »** : enregistrez le fichier dans un dossier HORS du dépôt, par exemple
   `C:\Users\admin\ScolariaSecrets\google-services.json` (créez le dossier). **Ne le mettez pas dans `C:\Users\admin\Scolaria`.**
5. Les écrans suivants (« Ajouter le SDK Firebase », Gradle) : **« Suivant » sans rien faire**, puis « Accéder à la console ».
   Expo s'en charge au build.
6. Ne créez PAS d'app pour `com.scolaria.app.demo` (décision Q3 : pas de notifications dans l'APK de démo).

## B. Déposer google-services.json dans EAS (2 minutes)

Dans PowerShell, dans `C:\Users\admin\Scolaria` (connecté à Expo : `npx eas-cli whoami` doit afficher votre compte) :

```
npx eas-cli env:create --name GOOGLE_SERVICES_JSON --type file --value C:\Users\admin\ScolariaSecrets\google-services.json --visibility secret --environment development
```

- Si la commande demande un « scope », choisissez **project**.
- Répétez avec `--environment preview` puis `--environment production` (même commande, seul ce mot change) : un build
  sans ce fichier n'aurait pas de notifications.
- Vérification : `npx eas-cli env:list --environment development` doit lister `GOOGLE_SERVICES_JSON` (valeur masquée).
- **[UNCLEAR]** : si votre version d'`eas-cli` refuse `--type file`, dites-le-moi : on passera par la page
  expo.dev › votre projet › **Environment variables** › « Add variable » › type « File ».
- Je brancherai `app.config.js` sur cette variable à la sous-étape « app » (vous n'avez rien à modifier).

## C. Clé de compte de service FCM v1 (gratuit, 5 minutes)

1. Console Firebase, votre projet : **roue dentée** à côté de « Vue d'ensemble du projet » › **« Paramètres du projet »**.
2. Onglet **« Comptes de service »**.
3. Bouton **« Générer une nouvelle clé privée »** › confirmez « Générer la clé ». Un fichier JSON se télécharge
   (nom du type `scolaria-notifications-firebase-adminsdk-xxxxx.json`). **Il contient une clé privée** : déplacez-le
   dans `C:\Users\admin\ScolariaSecrets\`, jamais dans le dépôt, jamais en pièce jointe.
4. Déposez-le dans EAS, au choix :
   - **Par le site (le plus simple)** : https://expo.dev › votre projet › **Credentials** › **Android** ›
     `com.scolaria.app` › section **« FCM V1 service account key »** › **« Add a service account key »** › envoyez le
     fichier **[UNCLEAR : intitulés exacts]**.
   - **Ou en ligne de commande** : `npx eas-cli credentials` › plateforme **Android** › profil **development** ›
     **« Google Service Account »** › **« Manage your Google Service Account Key for Push Notifications (FCM V1) »** ›
     **« Set up a Google Service Account Key for Push Notifications (FCM V1) »** › **« Upload a new service account key »**
     › chemin du fichier.
5. Vérifiez sur expo.dev › Credentials › Android que la clé FCM V1 apparaît (nom du compte de service, sans la clé).
6. **Supprimez le fichier JSON de votre disque** (et vide la corbeille) : EAS le garde, vous n'en avez plus besoin.
   Si un jour il fallait le refaire : étape C.3 à nouveau.

## D. Jeton d'accès Expo pour l'envoi (gratuit, 3 minutes)

1. https://expo.dev › votre avatar (en haut) › **« Account settings »** (ou **« Organization settings »** si le projet
   appartient à une organisation **[UNCLEAR]**) › **« Access tokens »**.
2. **« Create token »** › nom : `envoi-notifications` › « Create ». **Copiez-le tout de suite** : il ne sera plus jamais
   affiché. Gardez-le dans votre gestionnaire de mots de passe, pas dans un fichier du dépôt.
3. Sur la même page (ou dans les réglages du projet **[UNCLEAR]**), activez **« Enhanced Security for Push
   Notifications »** : sans ce jeton, plus personne ne peut envoyer de notification à vos téléphones, même avec un
   jeton de téléphone volé.
4. Ne le donnez à personne, y compris à moi : il servira à deux endroits que vous remplirez vous-même :
   - **essai local sur le Redmi** : fichier `C:\Users\admin\Scolaria\supabase\functions\.env` (ignoré par git, je l'ai
     vérifié), une seule ligne `EXPO_ACCESS_TOKEN=` suivie du jeton ;
   - **Paris** (au cycle M46 → M48, plus tard) : Supabase › projet Paris › **Edge Functions** › **Secrets** ›
     « Add new secret » › nom `EXPO_ACCESS_TOKEN` (par la page plutôt qu'en ligne de commande : rien dans l'historique).

## E. Ce qui viendra ensuite (pas maintenant)

- Sous-étape « app » (moi, sans rien vous demander) : carte « Recevoir les mots de l'école sur ce téléphone »,
  inscription et retrait du jeton, trois réglages, routeur, `app.config.js` branché sur `GOOGLE_SERVICES_JSON`.
- **Build de développement Android** : sur votre autorisation (règle R1), après A, B et C. Commande que vous lancerez
  ou m'autoriserez : `npx eas-cli build --profile development --platform android` (environ 15-25 minutes, 1 build sur
  les 15 du mois).
- Essai sur le Redmi contre la base locale (c'est vous qui regardez), puis procédure Paris (M46 → M48, secret
  `EXPO_ACCESS_TOKEN`, clé de service dans le coffre, déploiement de la fonction), chaque cycle sur votre autorisation.
- Compte Apple : repoussé (décision du 22 nov.).

Dites-moi simplement « A, B, C, D faits » quand c'est terminé (sans me donner aucune valeur).
