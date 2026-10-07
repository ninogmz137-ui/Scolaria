# Preuve d'appuis STAB-2 — Redmi, mode démo

*Généré par `node scripts/preuve-zones-tactiles-redmi.mjs` (densité 2.75, 3 appuis par ligne, « passé » = 3 sur 3). Résultat partiel ou final : 12 passé(s), 0 échec(s).*

| Élément | Taille mesurée | hitSlop du code | Côté | Décalage hors visuel | Attendu | Appui 1 | Appui 2 | Appui 3 | Résultat |
|---|---|---|---|---|---|---|---|---|---|
| Bouton Rechercher | 40×40 dp (mesuré sur capture : 2138–2248 px ; uiautomator tronqué 2138–2168) | hitSlop 2 ×4 (BottomBar.tsx:116) | haut | 1.5 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Bouton Rechercher | 40×40 dp (mesuré sur capture : 2138–2248 px ; uiautomator tronqué 2138–2168) | hitSlop 2 ×4 (BottomBar.tsx:116) | haut | 3 dp | n'ouvre pas (contrôle négatif) | rien | rien | rien | PASSÉ |
| Bouton Rechercher | 40×40 dp (mesuré sur capture : 2138–2248 px ; uiautomator tronqué 2138–2168) | hitSlop 2 ×4 (BottomBar.tsx:116) | bas | 1.5 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Bouton Rechercher | 40×40 dp (mesuré sur capture : 2138–2248 px ; uiautomator tronqué 2138–2168) | hitSlop 2 ×4 (BottomBar.tsx:116) | bas | 3 dp | n'ouvre pas (contrôle négatif) | rien | rien | rien | PASSÉ |
| Pilule « Demander à Aria » | 273×40 dp (hauteur du style (40 dp) ; uiautomator tronqué 2138–2168) | hitSlop {top:2,bottom:2} (BottomBar.tsx:127) | haut | 1.5 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Pilule « Demander à Aria » | 273×40 dp (hauteur du style (40 dp) ; uiautomator tronqué 2138–2168) | hitSlop {top:2,bottom:2} (BottomBar.tsx:127) | haut | 3 dp | n'ouvre pas (contrôle négatif) | rien | rien | rien | PASSÉ |
| Pilule « Demander à Aria » | 273×40 dp (hauteur du style (40 dp) ; uiautomator tronqué 2138–2168) | hitSlop {top:2,bottom:2} (BottomBar.tsx:127) | bas | 1.5 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Pilule « Demander à Aria » | 273×40 dp (hauteur du style (40 dp) ; uiautomator tronqué 2138–2168) | hitSlop {top:2,bottom:2} (BottomBar.tsx:127) | bas | 3 dp | n'ouvre pas (contrôle négatif) | rien | rien | rien | PASSÉ |
| Bouton « + » (Ajouter au carnet) | 40×40 dp (hauteur du style (40 dp) ; mesure sur capture rejetée (2138–2338 px) ; uiautomator tronqué 2138–2168) | hitSlop 2 ×4 (BottomBar.tsx:142) | droite | 1.5 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Bouton « + » (Ajouter au carnet) | 40×40 dp (hauteur du style (40 dp) ; mesure sur capture rejetée (2138–2338 px) ; uiautomator tronqué 2138–2168) | hitSlop 2 ×4 (BottomBar.tsx:142) | droite | 3 dp | n'ouvre pas (contrôle négatif) | rien | rien | rien | PASSÉ |
| Bouton « + » (Ajouter au carnet) | 40×40 dp (hauteur du style (40 dp) ; mesure sur capture rejetée (2138–2338 px) ; uiautomator tronqué 2138–2168) | hitSlop 2 ×4 (BottomBar.tsx:142) | bas | 1.5 dp | ouvre | ouvre | ouvre | ouvre | PASSÉ |
| Bouton « + » (Ajouter au carnet) | 40×40 dp (hauteur du style (40 dp) ; mesure sur capture rejetée (2138–2338 px) ; uiautomator tronqué 2138–2168) | hitSlop 2 ×4 (BottomBar.tsx:142) | bas | 3 dp | n'ouvre pas (contrôle négatif) | rien | rien | rien | PASSÉ |
