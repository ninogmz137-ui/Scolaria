import json, re, sys

ANCIEN = r"push.*--force|push.*-f"
# Motif proposé : le mot « push », puis, DANS LE MÊME SEGMENT de commande (ni ; & | ni frontière de champ JSON),
#   --force… (force-with-lease, =…, force-if-includes) | drapeau court groupé contenant f (-f, -fu, -uf) | refspec « +branche »
NOUVEAU = (
    r"""\bpush\b(?:(?!", ")[^;&|])*"""
    r"""(?:\s--force|\s-[a-z]*f[a-z]*(?=[\s"'\\]|$)|\s(?:\\?["'])?\+[^\s"'\\])"""
)

BLOQUER = [
    "git push --force",
    "git push -f",
    "git push origin main -f",
    "git push -fu origin main",
    "git push -uf origin main",
    "git push -u -f origin main",
    "git push --force-with-lease",
    "git push --force-with-lease=main",
    "git push --force-with-lease=main:abc123 origin main",
    "git push --force-if-includes origin main",
    "git push origin +main",
    "git push origin +HEAD:main",
    "git push origin \"+main\"",
    "git push origin +refs/heads/feature:refs/heads/feature",
    "git -C C:\\Users\\admin\\Scolaria push -f",
    "git -C dossier push --force origin main",
    "git push origin main --force",
    "GIT PUSH -F",
    "git push origin main -vf",
    "cd /c/x && git push -f origin main",
    "git add . && git commit -m ok && git push --force-with-lease=main origin main",
    "git push origin HEAD:main -f",
    "git.exe push -f",
    "git push -fq",
]
AUTORISER = [
    "git push origin main",
    "git push",
    "git push -u origin main",
    "git push -v origin main",
    "git push --dry-run origin main",
    "git push --set-upstream origin feature",
    "git push origin feature/ajout-force-bruteforce",       # le mot force dans un nom de branche, pas un drapeau
    "git push origin fix-flag",                              # tiret dans un nom, pas un drapeau
    "git commit -m \"ajout du filtre\" && git push",
    "npx supabase@latest db push --linked",
    "npx supabase@latest db push --dry-run --linked",
    "npx supabase@latest db query --linked -f fichier.sql",  # -f sans push
    "cd C:\\Users\\admin\\AppData\\Local\\Temp\\claude\\C--Users-admin-Scolaria\\31fb900c-fa7d-4a2b-9c1d\\scratchpad && git push origin main",  # faux positif vu : id de session « -fa7d »
    "cp C:\\tmp\\31fb900c-fa7d\\x.sql y.sql && npx supabase db push --linked",
    "git push origin main && ls -f",                          # -f après un séparateur
    "git push origin main; rm -f fichier.tmp",
    "git push origin main | tee -f x",
    "git commit -m \"correctif\" -a && git push origin main",
    "git status && git pull --ff-only && git push origin main",
    "echo a + b",
    "git log --oneline -5",
    "git push origin main 2>&1 | tail -3",
    "git fetch origin && git rebase -f origin/main",          # pas un push
    "git push origin main --tags",
    "git push origin main --follow-tags",
    "git push origin v1.2.3",
]

def verifie(motif, cmd, desc=""):
    entree = json.dumps({"command": cmd, "description": desc})
    return re.search(motif, entree, re.IGNORECASE) is not None

# champ description séparé : ne doit pas se combiner avec la commande
SEPARES = [
    ("git push origin main", "pousse sans -f ni --force"),
    ("git push origin main", "affiche +1 ligne"),
]

if __name__ == "__main__":
    echecs = 0
    print("— motif ancien (comparaison) —")
    for c in BLOQUER:
        if not verifie(ANCIEN, c):
            print("  l'ancien LAISSE PASSER :", c)
    for c in AUTORISER:
        if verifie(ANCIEN, c):
            print("  l'ancien BLOQUE à tort :", c)
    print("— motif nouveau —")
    for c in BLOQUER:
        ok = verifie(NOUVEAU, c)
        if not ok:
            echecs += 1
            print("  ECHEC (devait bloquer) :", c)
    for c in AUTORISER:
        ok = not verifie(NOUVEAU, c)
        if not ok:
            echecs += 1
            print("  ECHEC (devait autoriser) :", c)
    for c, d in SEPARES:
        if verifie(NOUVEAU, c, d):
            echecs += 1
            print("  ECHEC (champs JSON combinés) :", c, "/", d)
    print(f"{len(BLOQUER)} blocages + {len(AUTORISER)} autorisations + {len(SEPARES)} champs séparés ; échecs : {echecs}")
    print("MOTIF JSON :", json.dumps(NOUVEAU))
    sys.exit(1 if echecs else 0)
