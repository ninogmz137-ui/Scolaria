/**
 * useRendezVousJours — rendez-vous fixes de l'enfant actif aujourd'hui et demain (Accueil, lot 6), avec leur liste
 * « À prévoir » de la semaine. MÊMES données et mêmes règles que l'Agenda : rendezVousService (démo en mémoire, compte
 * réel sous RLS M43), jamais pendant les vacances scolaires de la zone de l'école, coche partagée (cocherAPrevoir),
 * « Coché par [prénom] · [heure] » dans le foyer de l'auteur seulement.
 * Un échec de chargement ou de coche ne montre jamais rien de faux : erreur exposée, coche annulée à l'écran.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { chargerRendezVous, cocherAPrevoir, type DonneesRendezVous } from '../services/rendezVousService';
import { ecouterRendezVous } from '../stores/rendezVousStore';
import { auteurCoche, libelleCoche } from '../utils/devoirs';
import { etatAPrevoir, occurrencesSemaine } from '../utils/rendezVous';
import { enVacances } from '../utils/vacances';
import { aujourdhuiParis, decalerJour, demainParis, heureParisIso, jourParisIso, lundiDuJour } from '../utils/jourParis';
import { classerErreur, type TypeErreur } from '../services/erreurs';
import type { OccurrenceRdv } from '../utils/accueil';

export function useRendezVousJours(childId: string | undefined, isDemo: boolean) {
  const [donnees, setDonnees] = useState<DonneesRendezVous | null>(null);
  const [erreur, setErreur] = useState<TypeErreur | null>(null);
  const [version, setVersion] = useState(0);
  const dernierEnfant = useRef<string | undefined>(undefined);

  useEffect(() => ecouterRendezVous(() => setVersion((v) => v + 1)), []);

  useEffect(() => {
    let annule = false;
    if (dernierEnfant.current !== childId) {
      dernierEnfant.current = childId;
      setDonnees(null);
      setErreur(null);
    }
    if (!childId) return;
    chargerRendezVous(childId, isDemo)
      .then((d) => {
        if (annule) return;
        setDonnees(d);
        setErreur(null);
      })
      .catch((e) => {
        if (!annule) setErreur(classerErreur(e));
      });
    return () => {
      annule = true;
    };
  }, [childId, isDemo, version]);

  const occurrences = useMemo<OccurrenceRdv[]>(() => {
    if (!donnees) return [];
    const auj = aujourdhuiParis();
    const jours = [auj, demainParis()];
    const res: OccurrenceRdv[] = [];
    for (const lundi of [...new Set(jours.map(lundiDuJour))]) {
      for (const o of occurrencesSemaine(donnees.rdvs, lundi, (j) => enVacances(j, donnees.zone), decalerJour)) {
        if (!jours.includes(o.jour)) continue;
        res.push({
          id: o.rdv.id,
          titre: o.rdv.titre,
          jour: o.jour,
          heure: o.rdv.heure ?? null,
          semaine: lundi,
          aPrevoir: etatAPrevoir(o.rdv, lundi, donnees.coches, donnees.auteursCoches, (id) => auteurCoche(id, donnees.noms), jourParisIso, heureParisIso,
            (x, a) => libelleCoche(x, a, auj, decalerJour(auj, -1))),
        });
      }
    }
    return res;
  }, [donnees]);

  const basculer = useCallback(
    (rdvId: string, semaine: string, item: string, coche: boolean) => {
      const rdv = donnees?.rdvs.find((r) => r.id === rdvId);
      if (!rdv) return;
      cocherAPrevoir(rdv, semaine, item, coche, isDemo)
        .then(() => setVersion((v) => v + 1))
        .catch((e: unknown) => {
          Alert.alert('Non enregistré', e instanceof Error ? e.message : 'La coche n’a pas pu être enregistrée. Réessayez.');
          setVersion((v) => v + 1);
        });
    },
    [donnees, isDemo],
  );

  return { occurrences, erreur, basculer, recharger: () => setVersion((v) => v + 1) };
}
