/**
 * useScolarite — données de l'onglet Scolarité, chargées UNE fois pour l'enfant sélectionné et partagées
 * par le sommaire (niveau 1) et les pages profondes des rubriques (niveau 2) : aucun second appel réseau
 * à l'ouverture d'une rubrique (lot 2, CLAUDE.md § Scolarité).
 *
 * Contenu : cycle de l'enfant, compétences / observations, éléments du carnet (souvenirs, documents),
 * années (en cours + archives), erreurs de chargement, « Réessayer ».
 * Les notes du collège / lycée (liées au trimestre choisi à l'écran) restent dans NotesScreen.
 *
 * Un enfant = un carnet : au changement d'enfant, tout ce qui venait de l'ancien est vidé AVANT les
 * chargements (effet déclaré avant eux), pour qu'un chargement en échec ne laisse jamais voir les
 * données d'un autre enfant (leçons du 24 sept. et du 4 oct. 2026).
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSchoolMode, getSchoolModeFromBirthDate } from '../contexts/SchoolModeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useDemoData } from '../contexts/DemoContext';
import { getSuiviDemo, REGLAGES_DEMO } from '../data/demo/suivi';
import { getCompetences, getAcademicYears, getGrades } from '../services/database';
import type { Decoupage, ElementSuivi } from '../utils/competences';
import { carnetDemo, type ElementCarnet } from '../services/carnetService';
import { useCarnetReel } from './useCarnetReel';
import { classerErreur, type TypeErreur } from '../services/erreurs';
import { getLivretsDemo } from '../data/demo/livrets';
import { getSouvenirsDemo } from '../data/demo/souvenirs';
import { getAnneesDemo, type AnneeParcours } from '../data/demo/parcours';
import type { Cycle } from '../utils/niveau';

export interface Scolarite {
  /** Cycle saisi de l'enfant (fait foi) ; repli sur la date de naissance. */
  cycle: Cycle | null;
  isMaternelle: boolean;
  isPrimaire: boolean;
  /** Découpage de l'année (périodes / semestres / trimestres). */
  decoupage: Decoupage;
  competences: ElementSuivi[];
  erreurCompetences: TypeErreur | null;
  /** Tout le carnet (démo : ajouts de la session + données fixes ; réel : carnet_items), plus récent d'abord. */
  carnet: ElementCarnet[];
  livrets: ElementCarnet[];
  souvenirs: ElementCarnet[];
  erreurCarnet: TypeErreur | null;
  annees: AnneeParcours[];
  anneeEnCours: AnneeParcours | undefined;
  anneesArchives: AnneeParcours[];
  erreurAnnees: TypeErreur | null;
  /** Collège / lycée : la note la plus récente (aperçu du sommaire) ; null sans note ou hors collège. */
  derniereNote: DerniereNote | null;
  erreurNote: TypeErreur | null;
  /** Incrémenté par « Réessayer » : tout lecteur qui en dépend relit ses données. */
  versionSuivi: number;
  reessayer: () => void;
}

export interface DerniereNote {
  valeur: number;
  sur: number;
  intitule: string;
  matiere: string;
  /** YYYY-MM-DD */
  date: string;
}

const ScolariteContext = createContext<Scolarite | null>(null);

function useChargementScolarite(): Scolarite {
  const { selectedChild } = useActiveChild();
  const { mode } = useSchoolMode();
  const { isDemoMode, getSubjects: getDemoSubjects, getGrades: getDemoGrades } = useDemoData();

  const schoolMode = selectedChild?.birthDate ? getSchoolModeFromBirthDate(selectedChild.birthDate) : mode;
  const cycle = selectedChild?.cycle ?? null;
  const isMaternelle = cycle ? cycle === 'maternelle' : schoolMode === 'maternelle';
  const isPrimaire = cycle ? cycle === 'primaire' : schoolMode === 'primaire';

  const [competences, setCompetences] = useState<ElementSuivi[]>([]);
  const [annees, setAnnees] = useState<AnneeParcours[]>([]);
  const [erreurCompetences, setErreurCompetences] = useState<TypeErreur | null>(null);
  const [erreurAnnees, setErreurAnnees] = useState<TypeErreur | null>(null);
  const [versionSuivi, setVersionSuivi] = useState(0);

  const [derniereNote, setDerniereNote] = useState<DerniereNote | null>(null);
  const [erreurNote, setErreurNote] = useState<TypeErreur | null>(null);

  // Changement d'enfant : vider AVANT les chargements (déclaré en premier).
  useEffect(() => {
    setCompetences([]);
    setAnnees([]);
    setDerniereNote(null);
    setErreurCompetences(null);
    setErreurAnnees(null);
    setErreurNote(null);
  }, [selectedChild?.id]);

  // Collège / lycée : dernière note, pour l'aperçu du sommaire (le détail reste dans Notes v7).
  useEffect(() => {
    let annule = false;
    if (isPrimaire || isMaternelle || !selectedChild) {
      setDerniereNote(null);
      return;
    }
    if (isDemoMode) {
      const matieres = getDemoSubjects(selectedChild.id);
      const n = [...getDemoGrades(selectedChild.id)].sort((a, b) => b.date.localeCompare(a.date))[0];
      setDerniereNote(
        n
          ? {
              valeur: n.value,
              sur: n.outOf,
              intitule: n.title,
              matiere: matieres.find((m) => m.id === n.subjectId)?.name ?? '',
              date: n.date.slice(0, 10),
            }
          : null,
      );
      return;
    }
    getGrades(selectedChild.id, { limit: 1 }).then(({ data, error }) => {
      if (annule) return;
      if (error) {
        setErreurNote(classerErreur(error));
        return;
      }
      setErreurNote(null);
      const r = (data ?? [])[0] as any;
      setDerniereNote(
        r
          ? {
              valeur: Number(r.value),
              sur: Number(r.max_value ?? 20),
              intitule: r.type ?? '',
              matiere: r.subjects?.name ?? '',
              date: String(r.date ?? '').slice(0, 10),
            }
          : null,
      );
    });
    return () => {
      annule = true;
    };
  }, [isPrimaire, isMaternelle, isDemoMode, selectedChild, versionSuivi, getDemoSubjects, getDemoGrades]);

  // Découpage : démo = réglage de l'école de démo ; compte réel = défaut du niveau (périodes) tant que la
  // résolution serveur (decoupage_annee) n'est pas branchée côté app.
  const decoupage: Decoupage =
    (isDemoMode && selectedChild ? REGLAGES_DEMO[selectedChild.id]?.decoupage : undefined) ?? 'periodes';

  // Maternelle (observations) et primaire (compétences) : démo = src/data/demo/suivi.ts ; réel = table competences.
  useEffect(() => {
    let annule = false;
    if (!(isPrimaire || isMaternelle) || !selectedChild) {
      setCompetences([]);
      return;
    }
    if (isDemoMode) {
      setCompetences(getSuiviDemo(selectedChild.id));
      return;
    }
    if (isMaternelle) {
      // Pas encore de table d'observations : état vide (jamais de donnée inventée).
      setCompetences([]);
      return;
    }
    getCompetences(selectedChild.id).then(({ data, error }) => {
      if (annule) return;
      if (error) {
        setErreurCompetences(classerErreur(error));
        return;
      }
      setErreurCompetences(null);
      setCompetences(
        data.map((c) => ({
          id: c.id,
          domaine: c.domaine,
          texte: c.competence,
          niveau: c.niveau,
          echelle: c.echelle,
          periode: c.periode ?? undefined,
          date: c.date,
          source: c.source,
        })),
      );
    });
    return () => {
      annule = true;
    };
  }, [isPrimaire, isMaternelle, isDemoMode, selectedChild, versionSuivi]);

  // Carnet : le hook relit la liste après un ajout / une modification (surChangementCarnet).
  const { items: carnetReel, erreur: erreurCarnet, recharger: rechargerCarnet } = useCarnetReel(
    selectedChild?.id,
    isDemoMode,
    versionSuivi,
  );
  // Démo : ajouts de la session (en mémoire) + données de démo fixes. Recalculé à chaque rendu (les ajouts
  // de la session ne passent pas par un état React).
  const carnet: ElementCarnet[] = isDemoMode
    ? [...carnetDemo(selectedChild?.id), ...getLivretsDemo(selectedChild?.id), ...getSouvenirsDemo(selectedChild?.id)]
        .sort((a, b) => b.date.localeCompare(a.date))
    : carnetReel;
  const livrets = carnet.filter((e) => e.categorie === 'livret');
  const souvenirs = carnet.filter((e) => e.categorie === 'souvenir');

  // Années : démo = parcours de démo ; réel = academic_years (année active + archives).
  useEffect(() => {
    let annule = false;
    if (!selectedChild) {
      setAnnees([]);
      return;
    }
    if (isDemoMode) {
      setAnnees(getAnneesDemo(selectedChild.id));
      return;
    }
    getAcademicYears(selectedChild.id).then(({ data, error }) => {
      if (annule) return;
      if (error) {
        setErreurAnnees(classerErreur(error));
        return;
      }
      setErreurAnnees(null);
      setAnnees(
        (data ?? []).map((a) => ({
          id: a.id,
          annee: a.annee_scolaire,
          niveau: a.niveau,
          etablissement: a.etablissement ?? '',
          statut: a.statut,
        })),
      );
    });
    return () => {
      annule = true;
    };
  }, [selectedChild?.id, isDemoMode, versionSuivi]);
  const anneeEnCours = annees.find((a) => a.statut === 'active');
  const anneesArchives = annees.filter((a) => a.statut !== 'active').sort((a, b) => b.annee.localeCompare(a.annee));

  const reessayer = () => {
    setVersionSuivi((v) => v + 1);
    rechargerCarnet();
  };

  return {
    cycle,
    isMaternelle,
    isPrimaire,
    decoupage,
    competences,
    erreurCompetences,
    carnet,
    livrets,
    souvenirs,
    erreurCarnet,
    annees,
    anneeEnCours,
    anneesArchives,
    erreurAnnees,
    derniereNote,
    erreurNote,
    versionSuivi,
    reessayer,
  };
}

/** À poser autour de la pile de l'onglet Scolarité : une seule source pour le sommaire et les rubriques. */
export function ScolariteProvider({ children }: { children: ReactNode }) {
  const valeur = useChargementScolarite();
  return <ScolariteContext.Provider value={valeur}>{children}</ScolariteContext.Provider>;
}

export function useScolarite(): Scolarite {
  const valeur = useContext(ScolariteContext);
  if (!valeur) throw new Error('useScolarite() doit être utilisé sous <ScolariteProvider>.');
  return valeur;
}
