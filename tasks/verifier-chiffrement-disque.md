# Vérifier le chiffrement du disque sous Windows (marche à suivre pour TOI — je ne l'exécute pas)

But : savoir si le disque qui contient `C:\Users\admin\ScolariaBackups` (les sauvegardes, qui contiennent des données personnelles) est chiffré. Tant que ce n'est pas établi,
la politique de confidentialité ne doit PAS affirmer que les sauvegardes sont chiffrées (brouillon § 6 bis). Lecture seule : aucune de ces commandes ne modifie quoi que ce soit.
Je n'ai besoin d'aucune clé de récupération ni d'aucun mot de passe : ne me les donne jamais.

## 1. Vérification par l'interface (la plus simple)
1. Menu Démarrer → taper **« Gérer BitLocker »** → ouvrir « Gérer BitLocker » (Panneau de configuration).
2. Regarder la ligne du lecteur **C:** (système d'exploitation) :
   - « **BitLocker activé** » = chiffré ;
   - « **BitLocker désactivé** » = NON chiffré ;
   - la page n'existe pas / « non disponible » : voir l'étape 3.
3. Autre lieu : **Paramètres → Confidentialité et sécurité → Chiffrement de l'appareil** (présent selon le matériel) : « Activé » = chiffré.

## 2. Vérification par PowerShell (en tant qu'administrateur)
Menu Démarrer → « PowerShell » → clic droit → **Exécuter en tant qu'administrateur**, puis coller **une** de ces lignes :

```powershell
manage-bde -status C:
```
À lire : **« État de la conversion : Entièrement chiffré »** ET **« État de la protection : Protection activée »** = chiffré et protégé.
« Entièrement déchiffré » / « Protection désactivée » = NON chiffré. « Chiffrement en cours » = pas encore terminé.

```powershell
Get-BitLockerVolume -MountPoint C: | Select-Object MountPoint, VolumeStatus, ProtectionStatus, EncryptionPercentage
```
À lire : `VolumeStatus = FullyEncrypted`, `ProtectionStatus = On`, `EncryptionPercentage = 100`.

## 3. Si BitLocker n'est pas proposé
Windows 11 Pro l'inclut. Si l'option est absente ou grisée : vérifier l'édition (Paramètres → Système → Informations système → « Édition » : Pro) et la présence d'une puce TPM
(`Get-Tpm` dans PowerShell administrateur : `TpmPresent : True`). Sans TPM, BitLocker demande une stratégie de groupe : à ne pas faire sans en parler.

## 4. Ce qu'il faut me dire (une ligne suffit)
« C: chiffré / non chiffré / en cours » **et** « la clé de récupération est conservée ailleurs que sur ce PC : oui / non ». Rien d'autre.

## 5. Ensuite
- **Chiffré et protégé** → je peux retirer le [À VÉRIFIER] correspondant dans le brouillon (en gardant « chiffrement du disque », jamais « sauvegardes chiffrées »).
- **Non chiffré** → décision à prendre : activer BitLocker sur C: (clé de récupération gardée HORS du PC : papier ou gestionnaire de mots de passe), ou déplacer les sauvegardes sur un disque chiffré (voir `tasks/sauvegarde.md`, « Copie chiffrée sur un disque externe »). Ne pas activer sans avoir conservé la clé de récupération ailleurs : sans elle, un incident matériel peut rendre le disque illisible.
- Vérifier aussi, si une copie existe sur un disque externe, que ce disque est lui aussi chiffré (même vérification avec sa lettre : `manage-bde -status E:`).
