#!/usr/bin/env bash
# Petites aides adb pour le Redmi (a3a0cfea) : dump de l'interface, tap par texte, capture.
#
# SÉCURITÉ (26 sept 2026) : ces aides ne peuvent JAMAIS appuyer sur une action destructive
# (déconnexion, suppression, signature, envoi…). Tout appui passe par tap_texte ou tap_xy, qui
# refusent si le texte visé — ou n'importe quel texte de l'élément sous le doigt — contient un
# mot interdit. Ne jamais appeler « adb shell input tap » directement.
export MSYS_NO_PATHCONV=1
DEV=a3a0cfea
D="$(cygpath -m "${TEMP:-/tmp}")/scolaria-redmi"   # hors dépôt : les captures montrent des données réelles
mkdir -p "$D"

# Mots interdits (sous-chaîne, sans accents ni casse).
INTERDITS="deconnect|deconnexion|quitter|logout|sign out|supprim|effac|retir|revoqu|reinitialis|vider|sign|envoy|publi|confirm|valider|payer|acheter"

dump() {
  adb -s $DEV shell uiautomator dump /sdcard/window_dump.xml >/dev/null 2>&1
  adb -s $DEV exec-out cat /sdcard/window_dump.xml > "$D/ui.xml"
}

# Textes (text + content-desc) de TOUS les nœuds dont la zone contient le point x y,
# ou du nœud dont le texte vaut exactement $1 (mode « texte »). Sortie : « x y|textes… ».
cible() {
  node -e "
const x=require('fs').readFileSync('$D/ui.xml','utf8');
const nodes=[...x.matchAll(/<node [^>]*>/g)].map(m=>{const n=m[0];
  const t=(n.match(/ text=\"([^\"]*)\"/)||[])[1]||''; const d=(n.match(/content-desc=\"([^\"]*)\"/)||[])[1]||'';
  const b=(n.match(/bounds=\"\[(\d+),(\d+)\]\[(\d+),(\d+)\]\"/)||[]).slice(1).map(Number); return {t,d,b};});
let px, py;
if (process.argv[1]==='texte') { let r=null; for (const n of nodes) if (n.t===process.argv[2]||n.d===process.argv[2]) r=n;
  if (!r) { console.log(''); process.exit(0); } px=(r.b[0]+r.b[2])>>1; py=(r.b[1]+r.b[3])>>1; }
else { px=+process.argv[2]; py=+process.argv[3]; }
const sous=nodes.filter(n=>n.b.length===4&&n.b[0]<=px&&px<=n.b[2]&&n.b[1]<=py&&py<=n.b[3]);
// Élément le plus petit sous le doigt + tout son contenu (un bouton a souvent son libellé dans un enfant).
const petit=sous.sort((a,b)=>(a.b[2]-a.b[0])*(a.b[3]-a.b[1])-(b.b[2]-b.b[0])*(b.b[3]-b.b[1]))[0];
const dedans=petit?nodes.filter(n=>n.b.length===4&&n.b[0]>=petit.b[0]&&n.b[2]<=petit.b[2]&&n.b[1]>=petit.b[1]&&n.b[3]<=petit.b[3]):[];
const textes=[...sous.slice(0,3),...dedans].map(n=>n.t+' '+n.d).join(' ');
console.log(px+' '+py+'|'+textes);" "$@"
}

# Vrai (code 0) si le texte contient un mot interdit. En cas de doute (erreur), on refuse aussi.
interdit() {
  node -e "
const s=process.argv[1].normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
process.exit(new RegExp(process.argv[2]).test(s)?0:1);" "$1" "$INTERDITS"
  local c=$?; [ $c -eq 1 ] && return 1; return 0
}

tap_texte() {
  dump; local r; r=$(cible texte "$1")
  if [ -z "$r" ]; then echo "introuvable : $1"; return 1; fi
  if interdit "$1 ${r#*|}"; then echo "REFUSÉ (action interdite) : $1"; return 2; fi
  # Appui par l'OUTIL UNIQUE : premier plan relu avant l'appui, refus sinon (jamais d'« adb shell input » direct).
  node "$(dirname "${BASH_SOURCE[0]}")/appui-redmi.mjs" tap ${r%%|*}
}

tap_xy() {
  dump; local r; r=$(cible xy "$1" "$2")
  if interdit "${r#*|}"; then echo "REFUSÉ (action interdite sous $1,$2) : ${r#*|}"; return 2; fi
  node "$(dirname "${BASH_SOURCE[0]}")/appui-redmi.mjs" tap $1 $2
}

attendre_texte() {
  for i in $(seq 1 20); do dump; grep -q "text=\"$1\"" "$D/ui.xml" && return 0; sleep 1; done
  echo "attente échouée : $1"; return 1
}

capture() { adb -s $DEV exec-out screencap -p > "$D/$1.png"; }

# Textes visibles + zones cliquables (taille en dp, densité 2,75)
voir() {
  dump
  node -e "
const x=require('fs').readFileSync('$D/ui.xml','utf8');
const ns=[...x.matchAll(/<node [^>]*>/g)].map(m=>m[0]);
for(const n of ns){const t=(n.match(/ text=\"([^\"]*)\"/)||[])[1]||'';const d=(n.match(/content-desc=\"([^\"]*)\"/)||[])[1]||'';
const b=(n.match(/bounds=\"\[(\d+),(\d+)\]\[(\d+),(\d+)\]\"/)||[]).slice(1).map(Number);const c=/clickable=\"true\"/.test(n);
if(!(t||d)&&!c)continue; if(b.length<4)continue; const w=((b[2]-b[0])/2.75).toFixed(0),h=((b[3]-b[1])/2.75).toFixed(0);
console.log((c?'[+] ':'    ')+(t||'')+(d?' ⟨'+d+'⟩':'')+'  '+w+'x'+h+'dp');}"
}
