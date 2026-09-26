/**
 * Souvenirs de démo (famille Moreau) — MODE DÉMO UNIQUEMENT. Univers : voir l'en-tête de suivi.ts.
 *
 * Albums de classe (saisis par l'enseignant), dessins et travaux ajoutés par la famille, jalons
 * (« première fois »). Visibilité : foyer (défaut) ou privé (« Visible par vous seul »).
 * Illustrations dessinées pour l'app (IllustrationSouvenir) : JAMAIS de photo d'enfant réel.
 * Dates RELATIVES à aujourd'hui (il y a n jours), comme l'Agenda et les Messages de démo.
 */

import type { ElementCarnet } from '../../services/carnetService';

function ilYa(jours: number): string {
  const t = new Date();
  const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - jours);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const SOUVENIRS: Record<string, () => ElementCarnet[]> = {
  'demo-lea': () => [
    {
      id: 'lea-s1', categorie: 'souvenir', type: 'album', titre: 'La rentrée des grands',
      note: 'Premiers jours en grande section, dans la classe des Papillons.',
      date: ilYa(18), source: 'ecole', auteur: 'Mme Laurent', visibilite: 'foyer', illustration: 'classe',
    },
    {
      id: 'lea-s2', categorie: 'souvenir', type: 'dessin', titre: 'Ma maison',
      note: 'Dessin fait à la maison, avec le soleil « qui sourit ».',
      date: ilYa(6), source: 'parent', visibilite: 'foyer', illustration: 'maison',
    },
    {
      id: 'lea-s3', categorie: 'souvenir', type: 'jalon', titre: 'Écrit son prénom toute seule',
      date: ilYa(2), source: 'parent', visibilite: 'prive', illustration: 'soleil',
    },
  ],
  'demo-lucas': () => [
    {
      id: 'lucas-s1', categorie: 'souvenir', type: 'jalon', titre: 'Premier exposé : les volcans',
      note: 'Trois minutes devant la classe, avec une maquette.',
      date: ilYa(5), source: 'parent', visibilite: 'foyer', illustration: 'fusee',
    },
    {
      id: 'lucas-s2', categorie: 'souvenir', type: 'album', titre: 'Rentrée en CM2 B',
      date: ilYa(16), source: 'ecole', auteur: 'Mme Dupont', visibilite: 'foyer', illustration: 'classe',
    },
    {
      id: 'lucas-s3', categorie: 'souvenir', type: 'dessin', titre: 'L’arbre de la cour',
      note: 'Arts plastiques, en classe.',
      date: ilYa(9), source: 'parent', visibilite: 'foyer', illustration: 'arbre',
    },
  ],
  'demo-emma': () => [
    {
      id: 'emma-s1', categorie: 'souvenir', type: 'jalon', titre: 'Première médaille au cross du collège',
      date: ilYa(4), source: 'parent', visibilite: 'foyer', illustration: 'medaille',
    },
    {
      id: 'emma-s2', categorie: 'souvenir', type: 'dessin', titre: 'Carnet de croquis',
      note: 'Gardé pour nous : Emma préfère ne pas le montrer.',
      date: ilYa(11), source: 'parent', visibilite: 'prive', illustration: 'arbre',
    },
  ],
};

export function getSouvenirsDemo(childId: string | undefined): ElementCarnet[] {
  const liste = childId ? SOUVENIRS[childId]?.() ?? [] : [];
  return liste.sort((a, b) => b.date.localeCompare(a.date));
}
