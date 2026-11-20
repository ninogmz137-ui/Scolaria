/**
 * useAgendaSemaine — l'Agenda de l'enfant actif sur les 7 jours qui viennent (aujourd'hui compris), pour l'Accueil
 * de maternelle / primaire : prochain événement (« Cette semaine »), devoirs (« À faire »), journée type (« Aujourd'hui »).
 * Mêmes données que l'écran Agenda : démo = DemoContext.getAgenda ; compte réel = agenda_events.
 * Un enfant = un carnet : changer d'enfant vide tout AVANT le chargement ; un échec de chargement est une erreur,
 * jamais « rien de prévu » ; une coche non enregistrée est annulée à l'écran et signalée.
 * Devoirs (lot 4a) : même source et même fonction de coche que l'Agenda (devoirsService.cocherDevoir) ; toute
 * coche faite ailleurs (Agenda) recharge l'Accueil (useVersionDevoirs), sans geste particulier.
 */

import { dateAujourdhuiParis, jourParis, heureParis, aujourdhuiParis, bornesParis, decalerJour } from '../utils/jourParis';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useDemoData } from '../contexts/DemoContext';
import { getAgendaEvents } from '../services/database';
import { cocherDevoir, chargerCoches, chargerAuteursCoche } from '../services/devoirsService';
import { auteurCoche, construireDevoirs, libelleCoche, type AuteursCoche, type CocheLue } from '../utils/devoirs';
import { heureParisIso, jourParisIso } from '../utils/jourParis';
import { signalerDevoirs } from '../stores/devoirsStore';
import { useVersionDevoirs } from './useVersionDevoirs';
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
  /** Devoir coché : ligne source « Coché par [prénom] · [heure] » (ou « Fait » hors du foyer de l’auteur). */
  coche?: string | null;
}

const JOURS_VUS = 7;

/** Ligne source d'un devoir, avec la même règle que la vue « Devoirs » de l'Agenda. */
function ligneCoche(d: { fait: boolean; faitJour?: string | null; faitHeure?: string | null }, auteur: string | null): string | null {
  const auj = aujourdhuiParis();
  return libelleCoche(d, auteur, auj, decalerJour(auj, -1));
}

/** Ligne source de chaque devoir de la semaine (même construction que l'Agenda : utils/devoirs). */
function cochesParId(lignes: any[], coches: CocheLue[], auteurs: AuteursCoche): Map<string, string | null> {
  const devoirs = construireDevoirs(lignes.filter((r) => r.event_type === 'devoir'), coches, jourParisIso, heureParisIso);
  return new Map(devoirs.map((d) => [d.id, ligneCoche(d, auteurCoche(d.faitPar, auteurs))]));
}

export function useAgendaSemaine(childId: string | undefined, isDemo: boolean, actif: boolean) {
  const { getAgenda, toggleAgendaDone } = useDemoData();
  const [reels, setReels] = useState<EvtAccueil[]>([]);
  const [erreur, setErreur] = useState<TypeErreur | null>(null);
  const [version, setVersion] = useState(0);
  const dernierEnfant = useRef<string | undefined>(undefined);
  const versionDevoirs = useVersionDevoirs(childId);

  // Démo : lecture directe du contexte (la coche y est déjà gérée).
  const demo = useMemo(() => {
    if (!isDemo || !childId || !actif) return [];
    const debut = dateAujourdhuiParis();
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
        coche: e.type === 'devoir' ? ligneCoche(
          { fait: !!e.is_completed, faitJour: e.coche_le ? jourParisIso(e.coche_le) : null, faitHeure: e.coche_le ? heureParisIso(e.coche_le) : null },
          e.coche_le ? 'vous' : null,
        ) : null,
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
      const jour0 = aujourdhuiParis();
      const bornes = bornesParis(jour0, decalerJour(jour0, JOURS_VUS));
      const [res, coches, auteurs] = await Promise.all([
        getAgendaEvents(childId, { startDate: bornes.debut, endDate: bornes.fin }),
        chargerCoches(childId),
        chargerAuteursCoche(childId),
      ]);
      leverSiErreur(res.error);
      const lignesCoches = cochesParId((res.data ?? []) as any[], coches, auteurs);
      const lignes = ((res.data ?? []) as any[]).map<EvtAccueil>((r) => {
        const d = new Date(r.start_time);
        const f = r.end_time ? new Date(r.end_time) : null;
        return {
          id: String(r.id),
          titre: String(r.title),
          type: String(r.event_type ?? 'cours'),
          date: jourParis(d),
          debut: heureParis(d),
          fin: f ? heureParis(f) : undefined,
          matiere: r.subject ? String(r.subject) : undefined,
          lieu: r.location ? String(r.location) : undefined,
          fait: !!r.is_done,
          coche: r.event_type === 'devoir' ? lignesCoches.get(String(r.id)) ?? null : null,
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
  }, [childId, isDemo, actif, version, versionDevoirs]);

  const basculer = useCallback(
    (id: string) => {
      if (isDemo) {
        toggleAgendaDone(id);
        signalerDevoirs(childId);
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
      if (!childId) return;
      cocherDevoir(id, fait, childId).catch(annuler);
    },
    [isDemo, reels, toggleAgendaDone, childId],
  );

  return {
    evenements: isDemo ? demo : reels,
    erreur,
    recharger: () => setVersion((v) => v + 1),
    basculer,
  };
}
