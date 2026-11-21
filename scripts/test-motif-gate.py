# Essai HORS LIGNE d'un motif plus étroit pour la porte « no-force-push » (aucune écriture dans gates.json).
# Reproduit exactement le mécanisme du hook : re.search(motif, json.dumps(tool_input), re.IGNORECASE).
import json, os, re, sys

JETON = r'(?:\\"[^"]*?\\"|\'[^\']*\'|[^\s;&|]+)'
OPTION = (r'(?:\s+(?:-[Cc]\s+' + JETON +
          r'|--(?:git-dir|work-tree|namespace|exec-path|super-prefix|config-env)(?:=' + JETON + r'|\s+' + JETON + r')'
          r'|--?[A-Za-z][\w-]*(?:=' + JETON + r')?))*')
GIT = r'(?:(?<![\w./-])|(?<=\\n))git(?:\.exe)?\\?["\']?'
PUSH = r'\s+push(?=[\s"\'\\;&|)]|$)'
# Reste du segment : ne franchit ni « ; & | », ni un saut de ligne JSON (\n non précédé d'un antislash), ni la frontière « ", " » entre champs.
SEGMENT = r'(?:(?!", ")(?!(?<!\\)\\n)[^;&|])*?'
FORCE = r'(?:\s--force|\s-[a-z]*f[a-z]*(?=[\s"\'\\;&|)]|$)|\s(?:\\?["\'])?\+[^\s"\'\\])'
NOUVEAU = GIT + OPTION + PUSH + SEGMENT + FORCE

gates = json.load(open(os.path.expanduser('~/.claude/gates.json'), encoding='utf-8'))
ANCIEN = next(g['pattern'] for g in gates['gates'] if g['name'] == 'no-force-push')


def bloque(motif, commande, description='x'):
    entree = json.dumps({'command': commande, 'description': description})
    return re.search(motif, entree, re.IGNORECASE) is not None


# (commande, description, doit_bloquer)
CAS = [
    # ── Faux positifs : doivent PASSER ───────────────────────────────────────────────
    ('node -e "out.push(x)"', 'x', False),
    ('node -e "arr.push(a +1)"', 'x', False),
    ('node -e "o.push( +x )"', 'x', False),
    ("node -e \"const o=[];o.push('+x')\"", 'x', False),
    ('echo "arr.push(a +1); x -f"', 'x', False),
    ('echo "out.push(x) -f"', 'x', False),
    ('grep -n "push" -f motifs.txt fichier.txt', 'x', False),
    ('grep -rn "out.push(" src -f motifs.txt', 'x', False),
    ('python -c "a=[]; a.push(1)"', 'x', False),
    ('echo push && ls -f', 'x', False),
    ('rm -f x.tmp && git push origin main', 'x', False),
    ('ls -f; git push origin main', 'x', False),
    ('curl -s https://exemple.test/api/push?f=1', 'x', False),
    ('npm run test -- -f && echo push', 'x', False),
    ('git stash push -m "wip"', 'x', False),
    ('git status', 'x', False),
    ('git push origin main', 'x', False),
    ('git push -u origin main', 'x', False),
    ('git push origin main --follow-tags', 'x', False),
    ('git push --set-upstream origin feat-f', 'x', False),
    ('git push origin HEAD:main', 'x', False),
    ('git push --tags', 'x', False),
    ('git push --dry-run', 'x', False),
    ('git push origin main 2>&1 | tail -3', 'x', False),
    ('git -C repo push origin main', 'x', False),
    ('git log --oneline -5 && node -e "list.push(1 +2)"', 'x', False),
    ('git push origin main', 'affiche -f', False),
    ('echo bonjour -f', 'git push', False),
    ('node scripts/analyse.mjs > out.txt', "lecture de out.push( +x ) -f", False),
    # ── Vrais force push : doivent être BLOQUÉS ───────────────────────────────────────
    ('git push -f', 'x', True),
    ('git push --force', 'x', True),
    ('git push origin main -f', 'x', True),
    ('git push -fu origin main', 'x', True),
    ('git push -uf origin main', 'x', True),
    ('git push --force-with-lease=main', 'x', True),
    ('git push --force-with-lease', 'x', True),
    ('git push origin HEAD --force-if-includes', 'x', True),
    ('git push origin +main', 'x', True),
    ('git push origin "+main"', 'x', True),
    ('git push origin +HEAD:main', 'x', True),
    ('git -C x push -f', 'x', True),
    ('git -C "C:\\mon dossier\\depot" push --force', 'x', True),
    ('git -c user.name=x push -f origin main', 'x', True),
    ('git --no-pager push -f', 'x', True),
    ('git --git-dir=.git push -f', 'x', True),
    ('cd x && git push -f', 'x', True),
    ('git add . && git commit -m x && git push -f origin main', 'x', True),
    ('bash -c "git push -f"', 'x', True),
    ('git.exe push -f', 'x', True),
    ('"C:\\Program Files\\Git\\cmd\\git.exe" push -f', 'x', True),
    ('GIT_TERMINAL_PROMPT=0 git push origin main -f', 'x', True),
    ('git status\ngit push -f', 'x', True),
    ('git push  -f', 'x', True),
    ('git push -f;', 'x', True),
    ('git push origin main -f 2>&1 | tail', 'x', True),
    ('(git push -f)', 'x', True),
    ('git push origin main --force &', 'x', True),
    ('git push origin main', 'x', False),
]

nouveau_faux_positifs, nouveau_manques, ancien_faux_positifs = [], [], []
for cmd, desc, attendu in CAS:
    n, a = bloque(NOUVEAU, cmd, desc), bloque(ANCIEN, cmd, desc)
    if n != attendu:
        (nouveau_manques if attendu else nouveau_faux_positifs).append(cmd)
    if a and not attendu:
        ancien_faux_positifs.append(cmd)

print(f'{len(CAS)} commandes ({sum(1 for c in CAS if not c[2])} à laisser passer, {sum(1 for c in CAS if c[2])} à bloquer)')
print(f'ancien motif : {len(ancien_faux_positifs)} faux positif(s) sur les commandes anodines :')
for c in ancien_faux_positifs:
    print('   -', json.dumps(c, ensure_ascii=False))
print(f'nouveau motif : {len(nouveau_faux_positifs)} faux positif(s), {len(nouveau_manques)} force push non bloqué(s)')
for c in nouveau_faux_positifs:
    print('   FAUX POSITIF :', json.dumps(c, ensure_ascii=False))
for c in nouveau_manques:
    print('   MANQUÉ       :', json.dumps(c, ensure_ascii=False))
# Limite connue (non comptée) : un « git push -f » CITÉ dans une chaîne (message de commit) reste bloqué, par sécurité.
LIMITE = 'git commit -m "doc : expliquer pourquoi git push -f est interdit"'
print('limite connue (reste bloqué, voulu) :', json.dumps(LIMITE, ensure_ascii=False), '->', bloque(NOUVEAU, LIMITE))
print('NOUVEAU =', json.dumps(NOUVEAU))
sys.exit(1 if nouveau_faux_positifs or nouveau_manques else 0)
