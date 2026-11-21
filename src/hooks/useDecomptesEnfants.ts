/**
 * useDecomptesEnfants — décompte de CHAQUE carnet du foyer (lot 5) : pastille rouge de l'avatar (un AUTRE enfant a du
 * nouveau) et texte en clair du sélecteur (« 1 mot à signer · 2 nouveautés » / « À jour »).
 * Règle (CLAUDE.md § Principe fondateur) : mot à traiter, message non lu, devoir pour demain non coché.
 * Une photo ou une compétence ajoutée ne compte pas.
 *
 * Mêmes sources que les écrans, un enfant à la fois (jamais de liste mêlée) : motsService.chargerMots,
 * filsService.chargerFilsReels (compte réel ; sans toucher au magasin des fils affichés) ou le magasin de démo,
 * devoirsService.chargerDevoirs (compte réel) ou l'agenda de démo. Un échec pour un enfant : pas de décompte pour lui
 * (rien d'inventé), les autres restent.
 * Rechargé : changement d'enfants, mots, fils, devoirs, retour au premier plan, et à l'ouverture du sélecteur.
 */

import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useActiveChild, type Child } from '../contexts/ActiveChildContext';
import { useAuth } from '../contexts/AuthContext';
import { useDemoData } from '../contexts/DemoContext';
import { chargerMots, surChangementMots, aTraiter, type MotCarnet } from '../services/motsService';
import { attendReponse } from '../services/motsRegles';
import { chargerFilsReels } from '../services/filsService';
import { chargerDevoirs } from '../services/devoirsService';
import { getConversations, subscribe } from '../stores/messagerieStore';
import { ecouterDevoirs } from '../stores/devoirsStore';
import { demainParis } from '../utils/jourParis';
import { aDesDevoirs } from '../utils/niveau';
import { decompter, devoirsDemainNonCoches, type Decompte } from '../utils/decompteEnfant';

function compterMots(mots: MotCarnet[]) {
  const aFaire = mots.filter(aTraiter);
  return {
    motsATraiter: aFaire.length,
    motsASignerSeulement: aFaire.filter((m) => !(attendReponse(m) && m.maReponse === null)).length,
    motsNonLus: mots.filter((m) => !m.lu && !aTraiter(m)).length,
  };
}

export function useDecomptesEnfants() {
  const { children } = useActiveChild();
  const { isDemo } = useAuth();
  const { getAgenda } = useDemoData();
  const [decomptes, setDecomptes] = useState<Map<string, Decompte>>(new Map());
  const [version, setVersion] = useState(0);
  const recharger = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => surChangementMots(recharger), [recharger]);
  useEffect(() => subscribe(recharger), [recharger]);
  useEffect(() => ecouterDevoirs(recharger), [recharger]);
  useEffect(() => {
    const s = AppState.addEventListener('change', (etat) => etat === 'active' && recharger());
    return () => s.remove();
  }, [recharger]);

  useEffect(() => {
    let annule = false;
    const demain = demainParis();
    const un = async (c: Child): Promise<[string, Decompte] | null> => {
      try {
        const avecDevoirs = aDesDevoirs(c.cycle);
        const [mots, fils, devoirs] = await Promise.all([
          chargerMots(c.id, isDemo),
          isDemo ? Promise.resolve(getConversations(c.id)) : chargerFilsReels(c.id),
          !avecDevoirs
            ? Promise.resolve([])
            : isDemo
              ? Promise.resolve(getAgenda(c.id).filter((e) => e.type === 'devoir').map((e) => ({ jour: e.date, fait: !!e.is_completed })))
              : chargerDevoirs(c.id),
        ]);
        const m = compterMots(mots);
        return [c.id, decompter({
          motsATraiter: m.motsATraiter,
          motsASignerSeulement: m.motsASignerSeulement,
          nonLus: m.motsNonLus + fils.filter((f) => f.unread).length,
          devoirsDemain: devoirsDemainNonCoches(devoirs, demain),
        })];
      } catch {
        return null;
      }
    };
    Promise.all(children.map(un)).then((res) => {
      if (annule) return;
      setDecomptes(new Map(res.filter((r): r is [string, Decompte] => r !== null)));
    });
    return () => {
      annule = true;
    };
  }, [children, isDemo, getAgenda, version]);

  return { decomptes, recharger };
}
