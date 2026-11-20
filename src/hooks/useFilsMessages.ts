/**
 * useFilsMessages — données de l'onglet Messages (lot 3a, CLAUDE.md § Messages, COMPONENTS §6 et §18.4).
 *
 * - « À traiter » : les mots qui attendent une action de MOI (même donnée que l'Accueil).
 * - « Conversations » : UN FIL PAR INTERLOCUTEUR (enseignant, classe, école…) : conversations et mots déjà
 *   traités regroupés par expéditeur ; les mots reçus ailleurs (imports de la famille) forment leur propre fil.
 *   Un fil n'existe que s'il contient au moins un élément (jamais de fil vide).
 * Compte réel (lot 3c) : fils lus en base par filsService (fil foyer avec l'enseignant, « Seulement moi »,
 * fil de classe en annonce seule), rangés dans messagerieStore ; démo : conversations de démo. Rien d'inventé.
 */

import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import MiniatureCarnet, { aUneImage } from '../components/MiniatureCarnet';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Building2, CalendarX, FileText } from 'lucide-react-native';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { getConversations, markConversationRead, subscribe } from '../stores/messagerieStore';
import type { Conversation } from '../data/messagerieData';
import { useMotsEnfant } from './useMotsEnfant';
import { useEnseignantRattache } from './useEnseignantRattache';
import { useCarnetReel } from './useCarnetReel';
import { useOuvrirFichierCarnet } from './useOuvrirFichierCarnet';
import { aTraiter, monNomComplet, type MotCarnet } from '../services/motsService';
import { carnetDemo, type ElementCarnet } from '../services/carnetService';
import { rafraichirFils } from '../services/filsService';
import { classerErreur, type TypeErreur } from '../services/erreurs';
import type { LigneMessageProps } from '../components/messages/LigneMessage';

/** Un élément d'un fil (conversation, mot ou mot importé), affiché par LigneMessage. */
export type ElementFil = { cle: string; tri: string; props: Omit<LigneMessageProps, 'separateur'> };

export interface Fil {
  cle: string;
  titre: string;
  /** Élément le plus récent d'abord. */
  elements: ElementFil[];
}

export const FIL_IMPORTS = 'imports';

/** « Aujourd'hui », « Hier », « Mar. », puis « 12 sept. ». */
export function dateCourte(iso: string): string {
  const aujourdHui = new Date();
  const j0 = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), aujourdHui.getDate());
  const [a, m, j] = iso.split('T')[0].split('-').map(Number);
  const d = new Date(a, m - 1, j);
  if (isNaN(d.getTime())) return iso;
  const ecart = Math.round((j0.getTime() - d.getTime()) / 86400000);
  if (ecart === 0) return 'Aujourd’hui';
  if (ecart === 1) return 'Hier';
  if (ecart > 1 && ecart < 7) return ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'][d.getDay()];
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/** « Mme Laurent » → « ML », « M. Petit » → « MP ». */
export function initialesDe(nom: string): string {
  const mots = nom.split(/\s+/).filter(Boolean);
  return mots.map((p) => p[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export function useFilsMessages() {
  const navigation = useNavigation<any>();
  const { selectedChild } = useActiveChild();
  const childId = selectedChild?.id ?? '';

  // Rafraîchissement : au focus et à chaque changement du store de démo.
  const [version, setVersion] = useState(0);
  useEffect(() => subscribe(() => setVersion((v) => v + 1)), []);
  useFocusEffect(
    useCallback(() => {
      setVersion((v) => v + 1);
    }, []),
  );

  const conversations = useMemo(() => (childId ? getConversations(childId) : []), [childId, version]);
  const { mots, charge, isDemo, erreur: erreurMots, recharger: rechargerMots } = useMotsEnfant(childId);

  // Compte réel (lot 3c) : fils lus en base et rangés dans le même magasin, au focus et au changement d'enfant.
  const [erreurFils, setErreurFils] = useState<TypeErreur | null>(null);
  const [focus, setFocus] = useState(0);
  useFocusEffect(useCallback(() => setFocus((f) => f + 1), []));
  const chargerFils = useCallback(() => {
    if (!childId || isDemo) return;
    rafraichirFils(childId)
      .then(() => setErreurFils(null))
      .catch((e) => setErreurFils(classerErreur(e)));
  }, [childId, isDemo]);
  useEffect(chargerFils, [chargerFils, focus]);
  const [monNom, setMonNom] = useState('vous');
  useEffect(() => {
    if (childId) monNomComplet(childId, isDemo).then(setMonNom);
  }, [childId, isDemo]);
  const enseignantRattache = useEnseignantRattache();

  // Mots importés par la famille (carnet_items, catégorie « mot ») ; « privé » respecté par la base (RLS).
  const { items: carnetReel, erreur: erreurCarnet, recharger: rechargerCarnet } = useCarnetReel(childId, isDemo, version);
  const imports = isDemo
    ? carnetDemo(childId).filter((e) => e.categorie === 'mot')
    : carnetReel.filter((e) => e.categorie === 'mot');
  const erreur = erreurMots ?? erreurCarnet ?? erreurFils;
  const reessayer = () => {
    rechargerMots();
    rechargerCarnet();
    chargerFils();
  };

  const ouvrirConversation = (c: Conversation) => {
    markConversationRead(c.id);
    navigation.navigate('ConversationDetailScreen', { conversationId: c.id });
  };
  const ouvrirMot = (m: MotCarnet) =>
    navigation.navigate('MotDetailScreen', { motId: m.id, childId: m.childId, expediteur: m.expediteur });
  const ouvrirFichierCarnet = useOuvrirFichierCarnet();
  const ouvrirImport = async (e: ElementCarnet) => {
    if (e.deMoi) {
      navigation.navigate('AjouterAuCarnet', { element: e });
      return;
    }
    await ouvrirFichierCarnet(e);
  };

  const aTraiterListe = mots.filter(aTraiter);

  // Regroupement par interlocuteur : l'expéditeur (nom affiché) fait la clé du fil.
  const parFil = new Map<string, Fil>();
  const ajouter = (cle: string, titre: string, el: ElementFil) => {
    const f = parFil.get(cle) ?? { cle, titre, elements: [] };
    f.elements.push(el);
    parFil.set(cle, f);
  };
  for (const c of conversations) {
    ajouter(`p:${c.name}`, c.name, {
      cle: `c-${c.id}`,
      tri: `${c.lastDate}T${c.lastTime}`,
      props: {
        nom: c.name,
        date: dateCourte(c.lastDate),
        apercu: c.lastMessage,
        nonLu: c.unread,
        initiales: c.avatarType === 'initials' ? c.initials ?? initialesDe(c.name) : undefined,
        Icone: c.avatarType === 'school' ? Building2 : c.avatarType === 'absence' ? CalendarX : undefined,
        // Fil individuel (« Seulement moi », B4b) : invisible pour l'autre responsable.
        prive: c.portee === 'individuel',
        onPress: () => ouvrirConversation(c),
      },
    });
  }
  for (const m of mots.filter((x) => !aTraiter(x))) {
    const personne = /^(Mme|M\.|Mlle)\s/.test(m.expediteur);
    ajouter(`p:${m.expediteur}`, m.expediteur, {
      cle: `m-${m.id}`,
      tri: `${m.date}T00:00`,
      props: {
        nom: m.expediteur,
        date: dateCourte(m.date),
        apercu: m.titre,
        nonLu: !m.lu,
        initiales: personne ? initialesDe(m.expediteur) : undefined,
        Icone: personne ? undefined : Building2,
        onPress: () => ouvrirMot(m),
      },
    });
  }
  for (const e of imports) {
    ajouter(FIL_IMPORTS, 'Mots reçus ailleurs', {
      cle: `i-${e.id}`,
      tri: `${e.date}T00:00`,
      props: {
        nom: e.titre,
        date: dateCourte(e.date),
        apercu: e.note || 'Mot reçu ailleurs',
        nonLu: false,
        Icone: FileText,
        avecPhoto: aUneImage(e),
        miniature: aUneImage(e) ? createElement(MiniatureCarnet, { element: e, taille: 44, rayon: 10 }) : undefined,
        source: `Importé par ${e.deMoi === false ? e.auteur ?? 'un responsable' : 'vous'}`,
        prive: e.visibilite === 'prive',
        onPress: () => ouvrirImport(e),
      },
    });
  }
  const fils = [...parFil.values()]
    .map((f) => ({ ...f, elements: f.elements.sort((a, b) => b.tri.localeCompare(a.tri)) }))
    .sort((a, b) => b.elements[0].tri.localeCompare(a.elements[0].tri));

  // Compte réel dont l'école n'est pas (encore) sur l'app : état vide informatif.
  const ecoleAbsente = !isDemo && !enseignantRattache && mots.length === 0 && conversations.length === 0;

  return {
    prenom: selectedChild?.name.split(' ')[0] ?? '',
    aTraiter: aTraiterListe,
    fils,
    monNom,
    isDemo,
    charge,
    erreur,
    reessayer,
    ecoleAbsente,
    ouvrirMot,
  };
}
