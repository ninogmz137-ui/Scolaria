# Porte « no-force-push » : motif plus étroit (PRÉPARÉ, NON APPLIQUÉ)

*11 oct. 2026. `~/.claude/gates.json` n'a PAS été modifié : lecture seule. Le bloc ci-dessous est à exécuter par l'utilisateur, s'il le décide.*

## Constat sur le motif actuel (lu dans gates.json)

`\bpush\b(?:(?!", ")[^;&|])*(?:\s--force|\s-[a-z]*f[a-z]*(?=[\s"'\\]|$)|\s(?:\\?["'])?\+[^\s"'\\])`

Il bloque tout « push » (le mot) suivi, dans le même segment, de `--force`, d'un drapeau court contenant `f`, ou de ` +x`. Le mot « push » n'est pas lié à `git` :
`out.push(x) -f`, `arr.push(a +1)`, `grep "push" -f motifs.txt` sont bloqués (8 faux positifs sur les 30 commandes anodines de l'essai).
Autre constat : la porte ne vise que l'outil `Bash` ; l'outil PowerShell n'est pas couvert par ce motif.

## Motif proposé

Exige `git` (ou `git.exe`, éventuellement entre guillemets) en position de commande, puis ses options globales (`-C x`, `-c k=v`, `--git-dir=…`, `--no-pager`…), puis `push` comme sous-commande, puis, **dans le même segment** (sans franchir `;` `&` `|` ni un saut de ligne ni la frontière entre champs JSON), `--force*`, un drapeau court contenant `f` (`-f`, `-fu`, `-uf`) ou une référence `+x`.

Essai hors ligne : `scripts/test-motif-gate.py` (relit le motif actuel dans gates.json, ne l'écrit pas) : **58 commandes** (30 à laisser passer, 28 à bloquer) : **0 faux positif, 0 force push manqué** ; l'ancien motif : 8 faux positifs.

| À bloquer (vérifiés) | À laisser passer (vérifiés) |
|---|---|
| `git push -f`, `--force`, `-fu`, `-uf`, `--force-with-lease`, `--force-with-lease=main`, `--force-if-includes`, `+main`, `"+main"`, `+HEAD:main` | `out.push(x)`, `arr.push(a +1)`, `o.push( +x )`, `o.push('+x')` |
| `git -C x push -f`, `git -C "C:\mon dossier\depot" push --force`, `git -c k=v push -f`, `git --no-pager push -f`, `git --git-dir=.git push -f` | `grep "push" -f motifs.txt`, `echo "out.push(x) -f"`, `rm -f x && git push origin main` |
| `cd x && git push -f`, `bash -c "git push -f"`, `git.exe push -f`, `"…\git.exe" push -f`, `VAR=1 git push … -f`, `(git push -f)`, `git push -f;`, saut de ligne puis `git push -f`, `… &` | `git push origin main`, `-u`, `--tags`, `--dry-run`, `--follow-tags`, `HEAD:main`, `git stash push -m x`, `git push … 2>&1 \| tail` |

**Limites connues (dites, non cachées)**
1. Un `git push -f` **cité dans une chaîne** (message de commit, `echo "…"`) reste bloqué : sans analyse des guillemets, il est indiscernable d'une vraie commande. Direction sûre ; contournement habituel : message par fichier (`git commit -F`) ou Write.
2. Les alias git (`git config alias.p push`, puis `git p -f`) ne sont pas vus : le motif ne résout pas les alias.
3. Un chemin de dépôt contenant `\n` littéral n'est pas un cas réel (le test distingue `\\new` d'un vrai saut de ligne).

## Bloc PowerShell (sauvegarde datée, remplacement exact, sans BOM, vérification) : NON EXÉCUTÉ

```powershell
$f = Join-Path $env:USERPROFILE '.claude\gates.json'
$sauv = "$f.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -LiteralPath $f -Destination $sauv
$brut = [System.IO.File]::ReadAllText($f)

$ancien = @'
"\\bpush\\b(?:(?!\", \")[^;&|])*(?:\\s--force|\\s-[a-z]*f[a-z]*(?=[\\s\"'\\\\]|$)|\\s(?:\\\\?[\"'])?\\+[^\\s\"'\\\\])"
'@.Trim()

$nouveau = @'
"(?:(?<![\\w./-])|(?<=\\\\n))git(?:\\.exe)?\\\\?[\"\\']?(?:\\s+(?:-[Cc]\\s+(?:\\\\\"[^\"]*?\\\\\"|\\'[^\\']*\\'|[^\\s;&|]+)|--(?:git-dir|work-tree|namespace|exec-path|super-prefix|config-env)(?:=(?:\\\\\"[^\"]*?\\\\\"|\\'[^\\']*\\'|[^\\s;&|]+)|\\s+(?:\\\\\"[^\"]*?\\\\\"|\\'[^\\']*\\'|[^\\s;&|]+))|--?[A-Za-z][\\w-]*(?:=(?:\\\\\"[^\"]*?\\\\\"|\\'[^\\']*\\'|[^\\s;&|]+))?))*\\s+push(?=[\\s\"\\'\\\\;&|)]|$)(?:(?!\", \")(?!(?<!\\\\)\\\\n)[^;&|])*?(?:\\s--force|\\s-[a-z]*f[a-z]*(?=[\\s\"\\'\\\\;&|)]|$)|\\s(?:\\\\?[\"\\'])?\\+[^\\s\"\\'\\\\])"
'@.Trim()

$n = ([regex]::Matches($brut, [regex]::Escape($ancien))).Count
if ($n -ne 1) { throw "Ancien motif trouvé $n fois (attendu : 1) : rien n'est modifié." }
$texte = $brut.Replace($ancien, $nouveau)
[System.IO.File]::WriteAllText($f, $texte, (New-Object System.Text.UTF8Encoding($false)))

# Vérifications : JSON valide, pas de BOM, une seule porte modifiée, motif compilé par Python (le moteur du hook)
$octets = [System.IO.File]::ReadAllBytes($f)
if ($octets[0] -eq 0xEF -and $octets[1] -eq 0xBB -and $octets[2] -eq 0xBF) { throw 'BOM présent' }
$j = Get-Content -LiteralPath $f -Raw | ConvertFrom-Json
($j.gates | Where-Object { $_.name -eq 'no-force-push' }).level
python3 -c "import json,re,os; g=json.load(open(os.path.expanduser('~/.claude/gates.json'),encoding='utf-8')); [re.compile(x['pattern']) for x in g['gates'] if x.get('pattern')]; print('motifs compilés :', len(g['gates']))"
python3 (Join-Path (Get-Location) 'scripts\test-motif-gate.py')   # depuis le dossier du dépôt : doit afficher « 0 faux positif(s), 0 force push non bloqué(s) »

# Retour arrière (si besoin) :
# Copy-Item -LiteralPath $sauv -Destination $f -Force
```

Note : avant d'appliquer, le test `scripts/test-motif-gate.py` lit le motif ACTUEL de gates.json (il sert aussi de témoin : il doit alors lister ses 8 faux positifs) ; après application, il compare le nouveau motif aux mêmes 58 commandes (son propre motif est inscrit dans le script, identique à celui du bloc).
