# Garde-fou `no-force-push` — nouveau motif et bloc PowerShell de secours (4 oct 2026)

**Je n'ai PAS modifié `gates.json`.** Ce bloc est à exécuter par l'utilisateur, dans PowerShell (pas dans l'outil de l'agent).

## Pourquoi un nouveau motif
Le hook (`~/.claude/hooks/pre-action-gate.sh`) fait `re.search(motif, json.dumps(tool_input), re.IGNORECASE)` (Python).
L'ancien motif `push.*--force|push.*-f` :
- **laisse passer** de vrais force push : `-uf`, `-vf` (drapeaux groupés où f n'est pas en tête), et la refspec `+branche`
  (`git push origin +main`, `+HEAD:main`, `"+main"`) ;
- **bloque à tort** : `--follow-tags`, un nom de branche contenant « -f » (`fix-flag`), `git push … && ls -f`, `… ; rm -f x`,
  `… | tee -f x`, l'identifiant de session `…-fa7d…` dans un chemin.

## Nouveau motif (regex Python, insensible à la casse)
```
\bpush\b(?:(?!", ")[^;&|])*(?:\s--force|\s-[a-z]*f[a-z]*(?=[\s"'\\]|$)|\s(?:\\?["'])?\+[^\s"'\\])
```
Lecture : le mot `push`, puis — **dans le même segment** (jamais au-delà d'un `;` `&` `|`, ni d'une frontière de champ JSON `", "`) —
1. `--force` (couvre `--force-with-lease`, `--force-with-lease=…`, `--force-if-includes`) ; ou
2. un drapeau court isolé contenant `f` : `-f`, `-fu`, `-uf`, `-vf`, `-fq` (suivi d'un espace, d'un guillemet ou de la fin : `-fa7d` n'en est pas un) ; ou
3. une refspec forcée : un argument qui commence par `+` (`+main`, `+HEAD:main`, `"+main"`).

Limite connue : reste un faux positif volontaire quand le mot « push » et un drapeau `-f` figurent dans le MÊME segment (ex. un message de commit qui les cite).

Test hors ligne : `python3 scratchpad/test_gate.py` (copie conservée dans le dépôt : `scripts/test-gate-no-force-push.py`) —
24 commandes à bloquer, 26 à autoriser (dont tous les faux positifs déjà vus), 2 cas de champs JSON séparés : **0 échec**.

## Bloc PowerShell de secours (à copier-coller)
Il : (1) sauvegarde `gates.json` (copie datée) ; (2) remplace **seulement** la ligne du motif de `no-force-push`, par remplacement de texte
exact (le reste du fichier, fins de ligne comprises, reste identique ; aucune re-sérialisation) ; (3) écrit en UTF-8 **sans BOM**
(un BOM empêcherait Python de charger le fichier et désactiverait silencieusement TOUS les garde-fous) ; (4) vérifie que le fichier se
charge (PowerShell ET Python), que chaque motif compile, et rejoue des cas ; (5) restaure la copie si une vérification échoue.

```powershell
$g    = Join-Path $env:USERPROFILE '.claude\gates.json'
$sauv = "$g.$(Get-Date -Format 'yyyyMMdd-HHmmss').bak"
Copy-Item -LiteralPath $g -Destination $sauv
Write-Host "Copie : $sauv"

$ancien = '"pattern": "push.*--force|push.*-f",'
$nouveau = @'
"pattern": "\\bpush\\b(?:(?!\", \")[^;&|])*(?:\\s--force|\\s-[a-z]*f[a-z]*(?=[\\s\"'\\\\]|$)|\\s(?:\\\\?[\"'])?\\+[^\\s\"'\\\\])",
'@.Trim()

$texte = [System.IO.File]::ReadAllText($g)
$n = ([regex]::Matches($texte, [regex]::Escape($ancien))).Count
if ($n -ne 1) { throw "Ligne ancienne trouvée $n fois (attendu : 1). Rien n'a été modifié." }
$texte = $texte.Replace($ancien, $nouveau)
[System.IO.File]::WriteAllText($g, $texte, (New-Object System.Text.UTF8Encoding($false)))

# --- Vérifications ---
$ok = $true
try {
  $j = Get-Content -LiteralPath $g -Raw | ConvertFrom-Json
  $regle = $j.gates | Where-Object { $_.name -eq 'no-force-push' }
  if (-not $regle -or $regle.level -ne 'block' -or $regle.enabled -ne $true) { throw 'règle no-force-push absente ou modifiée' }
  Write-Host "PowerShell : fichier chargé, $($j.gates.Count) règles ; no-force-push = block"
  $bloquer   = @('git push -f','git push -uf origin main','git push --force-with-lease=main','git push origin +main','git -C x push -fu')
  $autoriser = @('git push origin main','git push -u origin main','git push origin main --follow-tags','npx supabase db push --linked','git push && ls -f')
  foreach ($c in $bloquer)   { $e = ('{"command": "' + $c + '"}'); if (-not [regex]::IsMatch($e, $regle.pattern, 'IgnoreCase')) { Write-Host "ECHEC (devait bloquer) : $c"; $ok = $false } }
  foreach ($c in $autoriser) { $e = ('{"command": "' + $c + '"}'); if ([regex]::IsMatch($e, $regle.pattern, 'IgnoreCase'))     { Write-Host "ECHEC (devait autoriser) : $c"; $ok = $false } }
} catch { Write-Host "ECHEC PowerShell : $($_.Exception.Message)"; $ok = $false }

$py = "import json,re,os; g=json.load(open(os.path.expanduser('~/.claude/gates.json'),encoding='utf-8')); [re.compile(x['pattern']) for x in g['gates'] if x.get('pattern')]; print('Python : fichier chargé,', len(g['gates']), 'motifs compilés')"
python3 -c $py
if ($LASTEXITCODE -ne 0) { $ok = $false }
if ((((Get-Content -LiteralPath $g -Encoding Byte -TotalCount 3) -join ',')) -eq '239,187,191') { Write-Host 'ECHEC : BOM présent'; $ok = $false }

if ($ok) { Write-Host 'TOUT EST BON. Copie de secours conservée :' $sauv }
else { Copy-Item -LiteralPath $sauv -Destination $g -Force; Write-Host 'ECHEC : gates.json RESTAURÉ depuis la copie.' }
```
