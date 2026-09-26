/**
 * MessagerieScreen — onglet « Messages » (B4, décisions du 26 sept 2026 : tasks/b4-decisions.md ;
 * COMPONENTS §6 « Messages » et §7 « Card message »).
 *
 * - Segmented « Général · [prénom] » : Général par défaut, puis retour au dernier segment consulté.
 *   · Général : le collectif (établissement, direction, mairie).
 *   · [Prénom] : ce qui concerne seulement cet enfant (fils avec les enseignants, absences).
 *     Le modèle par foyer, les options d'envoi et « Envoyé aussi à » arrivent en B4b.
 * - Barre : recherche en pill pleine largeur + menu « Tout ⌄ » (Tout · Non lus · Tout marquer comme lu).
 * - Liste à plat façon X (LigneMessage) : pas de bandeau, pas de rouge, pas de résumé Aria, pas de rôle,
 *   pas de tag de catégorie.
 * - Un enfant = un carnet : uniquement les données de l'enfant sélectionné.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Platform, Modal, StatusBar, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated from 'react-native-reanimated';
import { School, CalendarX, Search, ChevronDown, Check, FileText } from 'lucide-react-native';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useTopbarScrollHandler } from '../contexts/TopbarScrollContext';
import { getBottomBarScrollPadding } from '../components/navigation/BottomBar';
import { FontFamily } from '../hooks/useSolariaFonts';
import {
  getConversations,
  markConversationRead,
  markAllConversationsRead,
  subscribe,
} from '../stores/messagerieStore';
import type { Conversation } from '../data/messagerieData';
import { C } from '../constants/design';
import { Text, TextInput, Pressable } from '../components/ui';
import { AucunEnfantOnglet } from '../components/AucunEnfant';
import Segmented from '../components/Segmented';
import LigneMessage, { SEPARATEURS_MESSAGES, type LigneMessageProps } from '../components/messages/LigneMessage';
import CarteATraiter from '../components/messages/CarteATraiter';
import { useMotsEnfant } from '../hooks/useMotsEnfant';
import { useEnseignantRattache } from '../hooks/useEnseignantRattache';
import { aTraiter, marquerTousMotsLus, monNomComplet, type MotCarnet } from '../services/motsService';
import { carnetDemo, getCarnetItems, lienFichier, surChangementCarnet, type ElementCarnet } from '../services/carnetService';
import { demanderAjoutCarnet } from '../services/ouvertureAjout';
import { de } from '../utils/francais';

const NAVY = '#0F172A';
const TEXT55 = 'rgba(15,23,42,0.55)';

// ─── Segment : Général par défaut, puis le dernier consulté ─────────────

type Segment = 'general' | 'enfant';
const CLE_SEGMENT = 'messages.segment';
let dernierSegment: Segment | null = null;

function memoriserSegment(s: Segment) {
  dernierSegment = s;
  AsyncStorage.setItem(CLE_SEGMENT, s).catch(() => {});
}

// ─── Filtre (menu « Tout ⌄ ») ────────────────────────────

type Filtre = 'tout' | 'non_lus' | 'a_signer';
const LIBELLES_FILTRE: Record<Filtre, string> = { tout: 'Tout', non_lus: 'Non lus', a_signer: 'À signer' };

/** Une ligne de la liste à plat (conversation, mot ou mot importé). */
type Ligne = { cle: string; tri: string; props: Omit<LigneMessageProps, 'separateur'> };

// ─── Dates ───────────────────────────────────────────────

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

function initialesDe(nom: string): string {
  // Même convention que les conversations : « Mme Laurent » → « ML », « M. Petit » → « MP ».
  const mots = nom.split(/\s+/).filter(Boolean);
  return mots.map((p) => p[0]).join('').toUpperCase().slice(0, 2) || '?';
}

// ─── Écran ───────────────────────────────────────────────

function MessagerieContenu() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const scrollHandler = useTopbarScrollHandler();
  const { selectedChild } = useActiveChild();
  const prenom = selectedChild?.name.split(' ')[0] ?? '';
  const childId = selectedChild?.id ?? '';

  const [segment, setSegment] = useState<Segment>(dernierSegment ?? 'general');
  useEffect(() => {
    if (dernierSegment) return;
    AsyncStorage.getItem(CLE_SEGMENT)
      .then((v) => {
        if (v === 'general' || v === 'enfant') {
          dernierSegment = v;
          setSegment(v);
        }
      })
      .catch(() => {});
  }, []);
  const changerSegment = (s: Segment) => {
    memoriserSegment(s);
    setSegment(s);
  };

  // Rafraîchissement : au focus et à chaque changement du store.
  const [version, setVersion] = useState(0);
  useEffect(() => subscribe(() => setVersion((v) => v + 1)), []);
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState<Filtre>('tout');
  const [menu, setMenu] = useState<{ top: number; right: number } | null>(null);
  const boutonFiltre = useRef<View | null>(null);
  useFocusEffect(
    useCallback(() => {
      setVersion((v) => v + 1);
      return () => setMenu(null);
    }, []),
  );

  const conversations = useMemo(() => (childId ? getConversations(childId) : []), [childId, version]);

  // Mots du carnet : la MÊME donnée que l'Accueil (« À faire »).
  const { mots, charge, isDemo } = useMotsEnfant(childId);
  const [monNom, setMonNom] = useState('vous');
  useEffect(() => {
    if (childId) monNomComplet(childId, isDemo).then(setMonNom);
  }, [childId, isDemo]);
  const enseignantRattache = useEnseignantRattache();

  // Mots importés par la famille (carnet_items, catégorie « mot ») : « Visible par vous seul »
  // respecté par la base (RLS : privé = auteur seul) et affiché.
  const [versionCarnet, setVersionCarnet] = useState(0);
  useEffect(() => surChangementCarnet(() => setVersionCarnet((v) => v + 1)), []);
  const [importsReels, setImportsReels] = useState<ElementCarnet[]>([]);
  useEffect(() => {
    let annule = false;
    if (isDemo || !childId) {
      setImportsReels([]);
      return;
    }
    getCarnetItems(childId).then((items) => {
      if (!annule) setImportsReels(items.filter((e) => e.categorie === 'mot'));
    });
    return () => {
      annule = true;
    };
  }, [isDemo, childId, versionCarnet, version]);
  const imports = isDemo ? carnetDemo(childId).filter((e) => e.categorie === 'mot') : importsReels;

  const ouvrirConversation = (c: Conversation) => {
    markConversationRead(c.id);
    navigation.navigate('ConversationDetailScreen', { conversationId: c.id });
  };
  const ouvrirMot = (m: MotCarnet) =>
    navigation.navigate('MotDetailScreen', { motId: m.id, childId: m.childId, expediteur: m.expediteur });
  const ouvrirImport = async (e: ElementCarnet) => {
    if (e.deMoi) {
      navigation.navigate('AjouterAuCarnet', { element: e });
      return;
    }
    const url = await lienFichier(e, isDemo);
    if (url) Linking.openURL(url);
  };

  const q = recherche.trim().toLowerCase();
  const correspond = (...textes: (string | undefined)[]) => !q || textes.some((t) => t?.toLowerCase().includes(q));

  // Général = le collectif (établissement, direction, mairie, mots, mots importés) ;
  // [prénom] = enseignants et absences. Liste à plat, de la plus récente à la plus ancienne.
  const convsDuSegment = conversations.filter((c) =>
    segment === 'general' ? c.avatarType === 'school' : c.avatarType !== 'school',
  );
  const lignesConvs: Ligne[] = convsDuSegment
    .filter((c) => correspond(c.name, c.lastMessage))
    .map((c) => ({
      cle: `c-${c.id}`,
      tri: `${c.lastDate}T${c.lastTime}`,
      props: {
        nom: c.name,
        date: dateCourte(c.lastDate),
        apercu: c.lastMessage,
        nonLu: c.unread,
        initiales: c.avatarType === 'initials' ? c.initials ?? initialesDe(c.name) : undefined,
        Icone: c.avatarType === 'school' ? School : c.avatarType === 'absence' ? CalendarX : undefined,
        onPress: () => ouvrirConversation(c),
      },
    }));
  // Les mots « à traiter » sont dans la carte en tête ; la liste garde les autres.
  const lignesMots: Ligne[] =
    segment !== 'general'
      ? []
      : mots
          .filter((m) => !aTraiter(m) && correspond(m.titre, m.expediteur, m.contenu))
          .map((m) => {
            const personne = /^(Mme|M\.|Mlle)\s/.test(m.expediteur);
            return {
              cle: `m-${m.id}`,
              tri: `${m.date}T00:00`,
              props: {
                nom: m.expediteur,
                date: dateCourte(m.date),
                apercu: m.titre,
                nonLu: !m.lu,
                initiales: personne ? initialesDe(m.expediteur) : undefined,
                Icone: personne ? undefined : School,
                onPress: () => ouvrirMot(m),
              },
            };
          });
  const lignesImports: Ligne[] =
    segment !== 'general'
      ? []
      : imports
          .filter((e) => correspond(e.titre, e.note))
          .map((e) => ({
            cle: `i-${e.id}`,
            tri: `${e.date}T00:00`,
            props: {
              nom: e.titre,
              date: dateCourte(e.date),
              apercu: e.note || 'Mot reçu ailleurs',
              nonLu: false,
              Icone: FileText,
              source: `Importé par ${e.deMoi === false ? e.auteur ?? 'un responsable' : 'vous'}`,
              prive: e.visibilite === 'prive',
              onPress: () => ouvrirImport(e),
            },
          }));
  const visibles =
    filtre === 'a_signer'
      ? []
      : [...lignesConvs, ...lignesMots, ...lignesImports]
          .filter((l) => filtre !== 'non_lus' || l.props.nonLu)
          .sort((a, b) => b.tri.localeCompare(a.tri));
  const carte = segment === 'general' ? mots.filter((m) => aTraiter(m) && correspond(m.titre, m.expediteur, m.contenu)) : [];
  // Compte réel dont l'école n'est pas (encore) sur Scolaria : état vide informatif.
  const ecoleAbsente =
    segment === 'general' && !isDemo && !enseignantRattache && mots.length === 0 && convsDuSegment.length === 0 && !q && filtre === 'tout';

  // Menu « Tout ⌄ » : Modal plein écran bord à bord → + hauteur de la barre d'état sur Android
  // (measureInWindow mesure depuis le bas de la barre d'état ; tasks/lessons.md, 26 sept).
  const ouvrirMenu = () => {
    boutonFiltre.current?.measureInWindow((x, y, w, h) => {
      const decalage = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
      setMenu({ top: y + h + 6 + decalage, right: 16 });
    });
  };
  const choisirFiltre = (f: Filtre) => {
    setFiltre(f);
    setMenu(null);
  };
  const toutMarquerLu = () => {
    if (childId) markAllConversationsRead(childId);
    marquerTousMotsLus(mots, isDemo);
    setMenu(null);
  };

  const Separe = SEPARATEURS_MESSAGES;

  return (
    <View style={st.racine}>
      <View style={[st.entete, { paddingTop: insets.top + 64 }]}>
        <Segmented
          options={[
            { id: 'general', libelle: 'Général' },
            { id: 'enfant', libelle: prenom || 'Enfant' },
          ]}
          valeur={segment}
          onChange={changerSegment}
        />
        <View style={st.barre}>
          <View style={st.recherche}>
            <Search size={18} color={TEXT55} strokeWidth={2} />
            <TextInput
              value={recherche}
              onChangeText={setRecherche}
              placeholder="Rechercher"
              placeholderTextColor="rgba(15,23,42,0.35)"
              style={st.rechercheTexte}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel="Rechercher dans les messages"
            />
          </View>
          <View ref={boutonFiltre} collapsable={false}>
            <Pressable
              onPress={ouvrirMenu}
              style={st.filtre}
              accessibilityRole="button"
              accessibilityLabel={`Afficher : ${LIBELLES_FILTRE[filtre]}`}
            >
              <Text style={st.filtreTexte}>{LIBELLES_FILTRE[filtre]}</Text>
              <ChevronDown size={16} color={NAVY} strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      </View>

      <Animated.ScrollView
        style={st.defilement}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: getBottomBarScrollPadding(insets.bottom) }}
      >
        {carte.length > 0 && <CarteATraiter mots={carte} monNom={monNom} demo={isDemo} onOuvrir={ouvrirMot} />}
        {ecoleAbsente ? (
          <View style={st.vide}>
            <Text style={st.videTexte}>{`Les mots de l’école ${de(prenom)} arriveront ici quand elle utilisera Scolaria.`}</Text>
            <Pressable
              onPress={() => demanderAjoutCarnet({ onglet: 'MessagerieTab', categorie: 'mot' })}
              style={({ pressed }) => [st.pill, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
            >
              <Text style={st.pillTexte}>Ajouter un mot reçu ailleurs</Text>
            </Pressable>
          </View>
        ) : visibles.length === 0 && carte.length === 0 && charge ? (
          <View style={st.vide}>
            <Text style={st.videTitre}>
              {q ? 'Aucun résultat' : filtre === 'non_lus' ? 'Tout est lu' : filtre === 'a_signer' ? 'Rien à signer' : 'Rien pour l’instant'}
            </Text>
            <Text style={st.videTexte}>
              {q
                ? 'Modifiez votre recherche.'
                : filtre === 'a_signer'
                  ? 'Les mots à signer apparaissent en tête de Général.'
                  : segment === 'general'
                    ? `Les messages de l’école ${de(prenom)} arriveront ici.`
                    : `Les échanges avec les enseignants ${de(prenom)} arriveront ici.`}
            </Text>
          </View>
        ) : (
          visibles.map((l, i) => <LigneMessage key={l.cle} {...l.props} separateur={Separe && i < visibles.length - 1} />)
        )}
      </Animated.ScrollView>

      <Modal
        visible={!!menu}
        transparent
        animationType="none"
        onRequestClose={() => setMenu(null)}
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(null)} accessibilityLabel="Fermer le menu" />
        {menu && (
          <View style={[st.menu, { top: menu.top, right: menu.right }]}>
            {(Object.keys(LIBELLES_FILTRE) as Filtre[]).map((f) => (
              <Pressable key={f} onPress={() => choisirFiltre(f)} style={st.menuLigne} accessibilityRole="button">
                <View style={st.menuCoche}>{filtre === f && <Check size={16} color={NAVY} strokeWidth={2} />}</View>
                <Text style={[st.menuTexte, filtre === f && st.menuTexteActif]}>{LIBELLES_FILTRE[f]}</Text>
              </Pressable>
            ))}
            <View style={st.menuSeparateur} />
            <Pressable onPress={toutMarquerLu} style={st.menuLigne} accessibilityRole="button">
              <View style={st.menuCoche} />
              <Text style={st.menuTexte}>Tout marquer comme lu</Text>
            </Pressable>
          </View>
        )}
      </Modal>
    </View>
  );
}

/** Garde : compte réel sans enfant → état vide (jamais de données d'un autre carnet). */
export default function MessagerieScreen() {
  const { selectedChild } = useActiveChild();
  if (!selectedChild) return <AucunEnfantOnglet />;
  return <MessagerieContenu />;
}

const st = StyleSheet.create({
  racine: { flex: 1, backgroundColor: C.bg },
  entete: { paddingHorizontal: 16, paddingBottom: 6 },
  barre: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  recherche: {
    flex: 1,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  rechercheTexte: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: NAVY,
    paddingVertical: 0,
    ...Platform.select({ android: { includeFontPadding: false }, default: {} }),
  },
  filtre: {
    height: 36,
    minWidth: 44,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15,23,42,0.06)',
  },
  filtreTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 13, color: NAVY },
  defilement: { flex: 1 },
  pill: {
    marginTop: 18,
    height: 52,
    maxWidth: 280,
    alignSelf: 'center',
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillTexte: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#FFFFFF' },
  vide: { paddingHorizontal: 24, paddingTop: 40, alignItems: 'center' },
  videTitre: { fontFamily: FontFamily.sansBold, fontSize: 16, color: NAVY, textAlign: 'center' },
  videTexte: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    lineHeight: 20,
    color: TEXT55,
    textAlign: 'center',
    marginTop: 6,
  },
  menu: {
    position: 'absolute',
    minWidth: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  menuLigne: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, minHeight: 44 },
  menuCoche: { width: 18, alignItems: 'center' },
  menuTexte: { fontFamily: FontFamily.sansMedium, fontSize: 14, color: NAVY },
  menuTexteActif: { fontFamily: FontFamily.sansBold },
  menuSeparateur: { height: 1, backgroundColor: 'rgba(15,23,42,0.08)', marginVertical: 3 },
});
