/**
 * useAccueilReel — ce que l'Accueil d'un COMPTE RÉEL affiche en plus des mots : l'agenda du jour, les derniers
 * apprentissages (compétences, primaire) et les dernières notes (collège / lycée), de l'enfant actif, lus dans la
 * base (mêmes tables que l'Agenda et le Suivi). Démo : toujours vide (l'Accueil lit ses données de démo).
 * « Rien de prévu aujourd'hui » n'apparaît donc que si l'Agenda est réellement vide ce jour-là.
 * Un échec de chargement ne laisse JAMAIS les données d'un autre enfant et n'est jamais pris pour un vide :
 * `erreur` (réseau, session, serveur) + `recharger()` (« Réessayer »).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAgendaEvents, getGrades } from '../services/database';
import { chargerCompetencesOuErreur } from '../services/suiviService';
import { classerErreur, leverSiErreur, type TypeErreur } from '../services/erreurs';
import { heureFr, type DemoAujourdhui } from '../data/demo/accueil';
import { jourMois, type ElementSuivi } from '../utils/competences';
import { aDesNotes, type Cycle } from '../utils/niveau';

export interface NoteAccueil {
  id: string;
  subject: string;
  grade: string;
  scale: string;
  date: string;
}

export function useAccueilReel(childId: string | undefined, isDemo: boolean, cycle: Cycle | null | undefined) {
  const [aujourdhui, setAujourdhui] = useState<DemoAujourdhui[]>([]);
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
      setAujourdhui([]);
      setApprentissages([]);
      setNotes([]);
      setErreur(null);
    }
    if (isDemo || !childId) return;

    (async () => {
      const debut = new Date();
      debut.setHours(0, 0, 0, 0);
      const fin = new Date(debut);
      fin.setHours(23, 59, 59, 999);

      const resEvenements = await getAgendaEvents(childId, { startDate: debut.toISOString(), endDate: fin.toISOString() });
      leverSiErreur(resEvenements.error);
      const evenements: DemoAujourdhui[] = ((resEvenements.data ?? []) as any[]).map((r) => {
        const d = new Date(r.start_time);
        const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        return { id: String(r.id), kind: 'event' as const, title: String(r.title), meta: String(r.location || r.subject || ''), time: heureFr(hhmm) };
      });

      const comp = await chargerCompetencesOuErreur(childId, cycle);
      let lignesNotes: NoteAccueil[] = [];
      if (aDesNotes(cycle)) {
        const res = await getGrades(childId, { limit: 3 });
        leverSiErreur(res.error);
        lignesNotes = ((res.data ?? []) as any[]).map((g) => ({
          id: String(g.id),
          subject: String(g.subjects?.name ?? ''),
          grade: String(g.value),
          scale: String(g.max_value ?? 20),
          date: jourMois(String(g.date ?? '').slice(0, 10)),
        }));
      }
      if (annule) return;
      setAujourdhui(evenements);
      setApprentissages(comp.slice(0, 2));
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
  return { aujourdhui, apprentissages, notes, erreur, recharger };
}
