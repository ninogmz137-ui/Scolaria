/**
 * useAgendaSemaine — l'Agenda de l'enfant actif sur les 7 jours qui viennent (aujourd'hui compris), pour l'Accueil
 * de maternelle / primaire : prochain événement (« Cette semaine »), devoirs (« À faire »), journée type (« Aujourd'hui »).
 * Mêmes données que l'écran Agenda : démo = DemoContext.getAgenda ; compte réel = agenda_events.
 * Un enfant = un carnet : changer d'enfant vide tout AVANT le chargement ; un échec de chargement est une erreur,
 * jamais « rien de prévu » ; une coche non enregistrée est annulée à l'écran et signalée.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useDemoData } from '../contexts/DemoContext';
import { getAgendaEvents, toggleEventDone } from '../services/database';
import { classerErreur, leverSiErreur, type TypeErreur } from '../services/erreurs';
import { isoJour } from '../data/demo/accueil';

export interface EvtAccueil {
  id: string;
  titre: string;
  /** cours · devoir · examen · activite · reunion · sortie · evenement */
  type: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  debut: string;
  fin?: string;
  matiere?: string;
  lieu?: string;
  fait: boolean;
}

const JOURS_VUS = 7;

export function useAgendaSemaine(childId: string | undefined, isDemo: boolean, actif: boolean) {
  const { getAgenda, toggleAgendaDone } = useDemoData();
  const [reels, setReels] = useState<EvtAccueil[]>([]);
  const [erreur, setErreur] = useState<TypeErreur | null>(null);
  const [version, setVersion] = useState(0);
  const dernierEnfant = useRef<string | undefined>(undefined);

  // Démo : lecture directe du contexte (la coche y est déjà gérée).
  const demo = useMemo(() => {
    if (!isDemo || !childId || !actif) return [];
    const debut = new Date();
    const fin = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate() + JOURS_VUS);
    const [d0, d1] = [isoJour(debut), isoJour(fin)];
    return getAgenda(childId)
      .filter((e) => e.date >= d0 && e.date <= d1)
      .map<EvtAccueil>((e) => ({
        id: e.id,
        titre: e.title,
        type: e.type,
        date: e.date,
        debut: e.startTime,
        fin: e.endTime || undefined,
        matiere: e.subject || undefined,
        lieu: e.room || undefined,
        fait: e.is_completed ?? false,
      }));
  }, [isDemo, childId, actif, getAgenda]);

  useEffect(() => {
    let annule = false;
    if (dernierEnfant.current !== childId) {
      dernierEnfant.current = childId;
      setReels([]);
      setErreur(null);
    }
    if (isDemo || !childId || !actif) return;
    (async () => {
      const debut = new Date();
      debut.setHours(0, 0, 0, 0);
      const fin = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate() + JOURS_VUS, 23, 59, 59, 999);
      const res = await getAgendaEvents(childId, { startDate: debut.toISOString(), endDate: fin.toISOString() });
      leverSiErreur(res.error);
      const lignes = ((res.data ?? []) as any[]).map<EvtAccueil>((r) => {
        const d = new Date(r.start_time);
        const f = r.end_time ? new Date(r.end_time) : null;
        const hhmm = (x: Date) => `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
        return {
          id: String(r.id),
          titre: String(r.title),
          type: String(r.event_type ?? 'cours'),
          date: isoJour(d),
          debut: hhmm(d),
          fin: f ? hhmm(f) : undefined,
          matiere: r.subject ? String(r.subject) : undefined,
          lieu: r.location ? String(r.location) : undefined,
          fait: !!r.is_done,
        };
      });
      if (annule) return;
      setReels(lignes);
      setErreur(null);
    })().catch((e) => {
      if (!annule) setErreur(classerErreur(e));
    });
    return () => {
      annule = true;
    };
  }, [childId, isDemo, actif, version]);

  const basculer = useCallback(
    (id: string) => {
      if (isDemo) {
        toggleAgendaDone(id);
        return;
      }
      const actuel = reels.find((e) => e.id === id);
      if (!actuel) return;
      const fait = !actuel.fait;
      const poser = (valeur: boolean) => setReels((cur) => cur.map((e) => (e.id === id ? { ...e, fait: valeur } : e)));
      poser(fait);
      const annuler = () => {
        poser(!fait);
        Alert.alert('Non enregistré', 'La modification n’a pas pu être enregistrée (pas de connexion ?). Réessayez.');
      };
      toggleEventDone(id, fait)
        .then((r) => {
          if (r?.error) annuler();
        })
        .catch(annuler);
    },
    [isDemo, reels, toggleAgendaDone],
  );

  return {
    evenements: isDemo ? demo : reels,
    erreur,
    recharger: () => setVersion((v) => v + 1),
    basculer,
  };
}
