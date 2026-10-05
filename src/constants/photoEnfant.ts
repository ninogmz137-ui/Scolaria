/**
 * Interrupteur de la photo de l'enfant (sprint « Carnet vivant », lot 4).
 *
 * false : AUCUN point d'entrée n'existe (cercle de l'en-tête sans badge ni action, ligne « Photo » du profil, étape de
 * création, feuille de photo) et aucune photo n'est lue : masqué, pas grisé. Tant que M35 n'est pas appliquée à Paris,
 * la colonne children.photo_path et le bucket « child-photos » n'y existent pas.
 * Passe à true dans un commit À PART, APRÈS l'application de M35 à Paris (et le déploiement d'executer-effacements).
 */
export const PHOTO_ENFANT_ACTIVE = false;
