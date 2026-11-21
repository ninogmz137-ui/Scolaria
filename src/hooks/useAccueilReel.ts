/**
 * useAccueilReel — ce que « Nouveau dans le carnet » d'un COMPTE RÉEL lit en plus des ajouts de la famille : les derniers
 * apprentissages (compétences, observations) et les dernières notes (collège / lycée) de l'enfant actif, dans la base
 * (mêmes tables que Scolarité). Démo : toujours vide (l'Accueil lit ses données de démo). L'agenda du jour et du
 * lendemain vient de useAgendaSemaine (même source que l'Agenda), plus d'ici (lot 6).
 * Un échec de chargement ne laisse JAMAIS les données d'un autre enfant et n'est jamais pris pour un vide :
 * `erreur` (réseau, session, serveur) + `recharger()` (« Réessayer »).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getGrades } from '../services/database';
import { chargerCompetencesOuErreur } from '../services/suiviService';
import { classerErreur, leverSiErreur, type TypeErreur } from '../services/erreurs';
import { jourMois, type ElementSuivi } from '../utils/competences';
import { aDesNotes, type Cycle } from '../utils/niveau';

export interface NoteAccueil {
  id: string;
  subject: string;
  grade: string;
  scale: string;
  /** « 12 nov. » */
  date: string;
  /** AAAA-MM-JJ, pour le tri de « Nouveau dans le carnet ». */
  iso: string;
}

export function useAccueilReel(childId: string | undefined, isDemo: boolean, cycle: Cycle | null | undefined) {
  const [apprentissages, setApprentissages] = useState<ElementSuivi[]>([]);
  const [notes, setNotes] = useState<NoteAccueil[]>([]);
  const [erreur, setErreur] = useState<TypeErreur | null>(null);
  const [version, setVersion] = useState(0);
  const dernierEnfant = useRef<string | undefined>(undefined);

  useEffect(() => {
    let annule = false;
    // Un enfant = un carnet : changer d'enfant vide tout AVANT le chargement.
    if (dernierEnfant.current !== childId) {
      dernierEnfant.current = childId;
      setApprentissages([]);
      setNotes([]);
      setErreur(null);
    }
    if (isDemo || !childId) return;

    (async () => {
      const comp = await chargerCompetencesOuErreur(childId, cycle);
      let lignesNotes: NoteAccueil[] = [];
      if (aDesNotes(cycle)) {
        const res = await getGrades(childId, { limit: 3 });
        leverSiErreur(res.error);
        lignesNotes = ((res.data ?? []) as any[]).map((g) => {
          const iso = String(g.date ?? '').slice(0, 10);
          return {
            id: String(g.id),
            subject: String(g.subjects?.name ?? ''),
            grade: String(g.value),
            scale: String(g.max_value ?? 20),
            date: jourMois(iso),
            iso,
          };
        });
      }
      if (annule) return;
      setApprentissages(comp.slice(0, 3));
      setNotes(lignesNotes);
      setErreur(null);
    })().catch((e) => {
      if (!annule) setErreur(classerErreur(e));
    });
    return () => {
      annule = true;
    };
  }, [childId, isDemo, cycle, version]);

  const recharger = useCallback(() => setVersion((v) => v + 1), []);
  return { apprentissages, notes, erreur, recharger };
}
