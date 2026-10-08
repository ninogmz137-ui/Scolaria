# Preuve d'appuis STAB-2 — Redmi, mode démo

*Généré par `node scripts/preuve-zones-tactiles-redmi.mjs` (densité 2.75, 3 appuis par ligne, « passé » = 3 sur 3). Résultat partiel ou final : 43 passé(s), 1 échec(s).*

| Élément | Taille mesurée | hitSlop du code | Côté | Décalage hors visuel | Attendu | Appui 1 | Appui 2 | Appui 3 | Résultat |
|---|---|---|---|---|---|---|---|---|---|
| Burger | 34×34 dp | hitSlop=5 (TopBar.tsx:119) | droite | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Burger | 34×34 dp | hitSlop=5 (TopBar.tsx:119) | gauche | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Burger | 34×34 dp | hitSlop=5 (TopBar.tsx:119) | haut | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Burger | 34×34 dp | hitSlop=5 (TopBar.tsx:119) | bas | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Avatar de l'enfant | 34×34 dp | hitSlop=5 (TopBar.tsx:173) | droite | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Avatar de l'enfant | 34×34 dp | hitSlop=5 (TopBar.tsx:173) | gauche | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Avatar de l'enfant | 34×34 dp | hitSlop=5 (TopBar.tsx:173) | haut | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Avatar de l'enfant | 34×34 dp | hitSlop=5 (TopBar.tsx:173) | bas | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Pilule d'année de l'Accueil | 184×26 dp | hitSlop=9 (EnteteCarnet.tsx:77) | haut | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Pilule d'année de l'Accueil | 184×26 dp | hitSlop=9 (EnteteCarnet.tsx:77) | bas | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Onglet Suivi | 34×30 dp | inactif {7,7,5,5} · actif {7,7} (TopBar.tsx:145) | gauche | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Onglet Suivi | 34×30 dp | inactif {7,7,5,5} · actif {7,7} (TopBar.tsx:145) | droite | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Onglet Suivi | 34×30 dp | inactif {7,7,5,5} · actif {7,7} (TopBar.tsx:145) | haut | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Onglet Suivi | 34×30 dp | inactif {7,7,5,5} · actif {7,7} (TopBar.tsx:145) | bas | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Onglet Agenda | 34×30 dp | inactif {7,7,5,5} · actif {7,7} (TopBar.tsx:145) | gauche | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Onglet Agenda | 34×30 dp | inactif {7,7,5,5} · actif {7,7} (TopBar.tsx:145) | droite | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Onglet Agenda | 34×30 dp | inactif {7,7,5,5} · actif {7,7} (TopBar.tsx:145) | haut | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Onglet Agenda | 34×30 dp | inactif {7,7,5,5} · actif {7,7} (TopBar.tsx:145) | bas | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Onglet Messages | 34×30 dp | inactif {7,7,5,5} · actif {7,7} (TopBar.tsx:145) | gauche | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Onglet Messages | 34×30 dp | inactif {7,7,5,5} · actif {7,7} (TopBar.tsx:145) | droite | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Onglet Messages | 34×30 dp | inactif {7,7,5,5} · actif {7,7} (TopBar.tsx:145) | haut | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Onglet Messages | 34×30 dp | inactif {7,7,5,5} · actif {7,7} (TopBar.tsx:145) | bas | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Jour de l'Agenda | 36×61 dp | hitSlop {left:4,right:4} (AgendaScreen.tsx:1147) | gauche | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Jour de l'Agenda | 36×61 dp | hitSlop {left:4,right:4} (AgendaScreen.tsx:1147) | droite | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Filtre « Événements » de l'Agenda | 95×30 dp | hitSlop {top:7,bottom:7} (AgendaScreen.tsx:1191) | haut | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Filtre « Événements » de l'Agenda | 95×30 dp | hitSlop {top:7,bottom:7} (AgendaScreen.tsx:1191) | bas | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Pastille de période P3 | 44×32 dp | hitSlop {top:8,bottom:4,left:2,right:2} (ApprentissagesVue.tsx:122) | haut | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Pastille de période P3 | 44×32 dp | hitSlop {top:8,bottom:4,left:2,right:2} (ApprentissagesVue.tsx:122) | bas | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Segment du prénom (Messages) | 176×32 dp | hitSlop {top:6,bottom:6} (Segmented.tsx:32) | haut | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Segment du prénom (Messages) | 176×32 dp | hitSlop {top:6,bottom:6} (Segmented.tsx:32) | bas | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Bouton année de Suivi | 156×34 dp | hitSlop {top:5,bottom:5} (BoutonAnnee.tsx:66) | haut | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Bouton année de Suivi | 156×34 dp | hitSlop {top:5,bottom:5} (BoutonAnnee.tsx:66) | bas | 3 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Bouton Rechercher | 40×40 dp (mesuré sur capture : 2138–2248 px ; uiautomator tronqué 2138–2168) | hitSlop 2 ×4 (BottomBar.tsx:116) | haut | 1.5 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Bouton Rechercher | 40×40 dp (mesuré sur capture : 2138–2248 px ; uiautomator tronqué 2138–2168) | hitSlop 2 ×4 (BottomBar.tsx:116) | haut | 3 dp | n'ouvre pas (contrôle négatif) | rien | rien | rien | PASSÉ |
| Bouton Rechercher | 40×40 dp (mesuré sur capture : 2138–2248 px ; uiautomator tronqué 2138–2168) | hitSlop 2 ×4 (BottomBar.tsx:116) | bas | 1.5 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Bouton Rechercher | 40×40 dp (mesuré sur capture : 2138–2248 px ; uiautomator tronqué 2138–2168) | hitSlop 2 ×4 (BottomBar.tsx:116) | bas | 3 dp | n'ouvre pas (contrôle négatif) | rien | rien | rien | PASSÉ |
| Pilule « Demander à Aria » | 273×40 dp (hauteur du style (40 dp) ; uiautomator tronqué 2138–2168) | hitSlop {top:2,bottom:2} (BottomBar.tsx:127) | haut | 1.5 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Pilule « Demander à Aria » | 273×40 dp (hauteur du style (40 dp) ; uiautomator tronqué 2138–2168) | hitSlop {top:2,bottom:2} (BottomBar.tsx:127) | haut | 3 dp | n'ouvre pas (contrôle négatif) | rien | rien | rien | PASSÉ |
| Pilule « Demander à Aria » | 273×40 dp (hauteur du style (40 dp) ; uiautomator tronqué 2138–2168) | hitSlop {top:2,bottom:2} (BottomBar.tsx:127) | bas | 1.5 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Pilule « Demander à Aria » | 273×40 dp (hauteur du style (40 dp) ; uiautomator tronqué 2138–2168) | hitSlop {top:2,bottom:2} (BottomBar.tsx:127) | bas | 3 dp | n'ouvre pas (contrôle négatif) | rien | rien | rien | PASSÉ |
| Bouton « + » (Ajouter au carnet) | 40×72.7 dp (mesuré sur capture : 2138–2338 px ; uiautomator tronqué 2138–2168) | hitSlop 2 ×4 (BottomBar.tsx:142) | droite | 1.5 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Bouton « + » (Ajouter au carnet) | 40×72.7 dp (mesuré sur capture : 2138–2338 px ; uiautomator tronqué 2138–2168) | hitSlop 2 ×4 (BottomBar.tsx:142) | droite | 3 dp | n'ouvre pas (contrôle négatif) | rien | rien | rien | PASSÉ |
| Bouton « + » (Ajouter au carnet) | 40×72.7 dp (mesuré sur capture : 2138–2338 px ; uiautomator tronqué 2138–2168) | hitSlop 2 ×4 (BottomBar.tsx:142) | bas | 1.5 dp | ouvre | rien | rien | rien | ÉCHEC |
| Bouton « + » (Ajouter au carnet) | 40×72.7 dp (mesuré sur capture : 2138–2338 px ; uiautomator tronqué 2138–2168) | hitSlop 2 ×4 (BottomBar.tsx:142) | bas | 3 dp | n'ouvre pas (contrôle négatif) | rien | rien | rien | PASSÉ |

## Diagnostic (7 oct. 2026) — aucun défaut de zone tactile ; trois artefacts de mesure corrigés

Résultat : **43 séries passées sur 44** dans ce tableau ; l'échec restant (« + », côté bas, 1,5 dp) est une erreur de MESURE, et la barre du bas
rejouée avec la mesure corrigée passe **12 / 12** (`tasks/preuve-zones-tactiles-redmi-barre.md`, 3 appuis chacune).

1. **Le seuil de 3 dp ne peut pas s'appliquer aux boutons de 40 dp** : une zone de 44 dp ne dépasse le visuel que de 2 dp (40 + 2 + 2, `hitSlop` 2 du code).
   Ces trois éléments sont donc sondés à 1,5 dp (doit ouvrir : 3 / 3 des deux côtés) et à 3 dp (CONTRÔLE NÉGATIF : n'ouvre jamais, 3 / 3) : la limite
   réelle de la zone est entre 1,5 et 3 dp, c'est-à-dire les 2 dp du code. Les 37 autres lignes sont à 3 dp, dans la zone.
2. **Dump uiautomator périmé (cause des séries « rien » partout, y compris à l'intérieur du bouton)** : l'écran d'Aria est animé en continu,
   `uiautomator dump` n'y atteint pas l'état « idle », ne réécrit pas `/sdcard/w.xml`, et le script relisait l'ancien dump de l'Accueil. Correctif :
   le fichier est supprimé avant chaque dump (dump vide = vide). C'était aussi la source des « dumps vides » signalés plus tôt.
3. **Faux positifs des témoins « au-dessus de la barre »** : sous ces points se trouve une carte cliquable de l'Accueil (hit-test uiautomator :
   « Éducation physique et sportive… »), dont l'ouverture faisait changer l'écran. La détection se fait désormais par le CONTENU ouvert (champ de saisie
   pour Rechercher, feuille « Photographier » pour le « + », écran d'Aria à arbre vide pour la pilule), jamais par « l'écran a changé ».
4. **Hauteur mesurée sur capture** : la colonne du « + » débordait jusqu'à 72,7 dp (zone de navigation) ; la mesure n'est acceptée que si elle vaut
   40 dp ± 2, sinon on prend la hauteur du style (40 dp). Rechercher : 40 × 40 dp mesurés (2138–2248 px) = le style.
5. **Densité 2,75** : 1,5 dp = 4,1 px ; la zone vaut 5,5 px ; marge de 1,4 px. Un arrondi de mise en page d'1 px est donc tolérable (et le test passe 3 / 3),
   mais c'est la raison pour laquelle 1,5 dp est le seuil réaliste, pas 2 dp.
Code : ni parent qui coupe l'appui (`pointerEvents="box-none"` du conteneur, `elevation 13`, `zIndex 20`, marge basse transparente de 4 dp), ni `overflow` : les trois boutons
partagent la même mise en page (BottomBar.tsx:61, 116, 127, 142, 170) et se comportent de la même façon.
