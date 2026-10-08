/**
 * CorpsCarnet — corps de l'Accueil de MATERNELLE et de PRIMAIRE (COMPONENTS §18.3), dans l'ordre :
 *   1. « À faire »  : mots à traiter (pilule « Signer »), devoirs (primaire, cochables, teintés par discipline),
 *                     « À prévoir » (cochables, mémorisés sur l'appareil) ;
 *   2. « Cette semaine » : prochain événement de l'Agenda ;
 *   3. « Nouveau dans le carnet » : observations (pastille de leur domaine) et mots importés (miniature des photos) ;
 *   4. « Aujourd'hui » (primaire seulement) : journée type du jour, discipline par discipline.
 * La carte Aria est posée après ce bloc par l'écran. Maternelle : ni devoirs, ni journée type.
 * Aucune section vide n'est affichée ; tout vient de l'enfant sélectionné (jamais d'un autre carnet).
 */

import { useMemo, type ReactNode } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text, Pressable } from '../ui';
import PastilleCategorie from '../PastilleCategorie';
import MiniatureCarnet, { aUneImage } from '../MiniatureCarnet';
import { LibelleSurFondu } from './SurFondu';
import { demanderSignature } from '../messages/ActionsMot';
import { jourCourt, heureCourte } from '../messages/CarteATraiter';
import { Segments } from '../../screens/suivi/ApprentissagesVue';
import { aTraiter, type MotCarnet } from '../../services/motsService';
import type { ElementCarnet } from '../../services/carnetService';
import { ligneSourceCarnet } from '../../screens/suivi/CarnetVue';
import { categorieDiscipline, TYPES_CONTENU, type Categorie } from '../../theme/categories';
import { libelleNiveau, ligneSource, type ElementSuivi } from '../../utils/competences';
import { isoJour } from '../../data/demo/accueil';
import type { EvtAccueil } from '../../hooks/useAgendaSemaine';

const NAVY = '#0F172A';
const TYPES_EVENEMENT = new Set(['evenement', 'sortie', 'examen', 'reunion', 'activite']);

// ─── Cases rondes ────────────────────────────────────────────────────────────

function CaseRonde({ cochee, onPress, libelle }: { cochee: boolean; onPress: () => void; libelle: string }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={11}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: cochee }}
      accessibilityLabel={libelle}
      style={[st.case, cochee && st.caseCochee]}
    >
      {cochee ? <Text style={st.coche}>✓</Text> : null}
    </Pressable>
  );
}

// ─── Lignes « À faire » ──────────────────────────────────────────────────────

interface LigneAFaire {
  cle: string;
  categorie: Categorie;
  titre: string;
  sousTitre: string;
  /** Mot à signer : pilule « Signer » à droite. */
  signer?: () => void;
  /** Devoir / À prévoir : case ronde cochable. */
  case?: { cochee: boolean; basculer: () => void };
  /** Ouvre le détail (mots). */
  ouvrir?: () => void;
}

function Ligne({ l, dernier }: { l: LigneAFaire; dernier: boolean }) {
  const contenu = (
    <>
      <PastilleCategorie categorie={l.categorie} />
      <View style={st.textes}>
        <Text style={[st.titre, l.case?.cochee && st.titreFait]} numberOfLines={2}>{l.titre}</Text>
        <Text style={st.sousTitre} numberOfLines={2}>{l.sousTitre}</Text>
      </View>
    </>
  );
  return (
    <View style={[st.ligne, !dernier && st.ligneFiletee]}>
      {l.ouvrir ? (
        <Pressable onPress={l.ouvrir} style={st.ligneCorps} accessibilityRole="button" accessibilityLabel={`${l.titre}. ${l.sousTitre}`}>
          {contenu}
        </Pressable>
      ) : (
        <View style={st.ligneCorps}>{contenu}</View>
      )}
      {l.signer ? (
        <Pressable
          onPress={l.signer}
          hitSlop={{ top: 7, bottom: 7 }}
          style={st.pilule}
          accessibilityRole="button"
          accessibilityLabel={`Signer « ${l.titre} »`}
        >
          <Text style={st.piluleTexte}>Signer</Text>
        </Pressable>
      ) : null}
      {l.case ? (
        <CaseRonde cochee={l.case.cochee} onPress={l.case.basculer} libelle={`${l.titre}${l.case.cochee ? ', fait' : ', à faire'}`} />
      ) : null}
    </View>
  );
}

function Carte({ children }: { children: ReactNode }) {
  return <View style={st.carte}>{children}</View>;
}

// ─── Corps ───────────────────────────────────────────────────────────────────

export default function CorpsCarnet({
  primaire,
  hauteurFondu,
  mots,
  monNom,
  demo,
  evenements,
  onBasculerDevoir,
  coches,
  onBasculerCoche,
  apprentissages,
  imports,
  onOuvrirMot,
  onOuvrirAgenda,
  onOuvrirImport,
  onOuvrirSuivi,
}: {
  primaire: boolean;
  hauteurFondu: number;
  mots: MotCarnet[];
  monNom: string;
  demo: boolean;
  evenements: EvtAccueil[];
  onBasculerDevoir: (id: string) => void;
  coches: string[];
  onBasculerCoche: (id: string) => void;
  apprentissages: ElementSuivi[];
  imports: ElementCarnet[];
  onOuvrirMot: (m: MotCarnet) => void;
  onOuvrirAgenda: () => void;
  onOuvrirImport: (e: ElementCarnet) => void;
  onOuvrirSuivi: () => void;
}) {
  const aujourdhui = isoJour(new Date());

  // 1. À faire
  const lignes = useMemo<LigneAFaire[]>(() => {
    const res: LigneAFaire[] = [];
    for (const m of mots.filter(aTraiter)) {
      const reponse = m.type === 'autorisation' || m.type === 'participation';
      const delai = m.echeance ? `avant le ${jourCourt(m.echeance)}` : reponse ? 'à répondre' : 'à signer';
      res.push({
        cle: `mot-${m.id}`,
        categorie: TYPES_CONTENU[m.type === 'autorisation' ? 'autorisation' : m.type === 'participation' ? 'a-repondre' : 'mot'],
        titre: m.titre,
        sousTitre: [m.expediteur, delai].join(' · '),
        ouvrir: () => onOuvrirMot(m),
        signer: reponse ? undefined : () => demanderSignature(m, monNom, demo),
      });
    }
    if (primaire) {
      const devoirs = evenements
        .filter((e) => e.type === 'devoir')
        .sort((a, b) => Number(a.fait) - Number(b.fait) || a.date.localeCompare(b.date));
      for (const e of devoirs) {
        res.push({
          cle: `devoir-${e.id}`,
          categorie: categorieDiscipline(e.matiere),
          titre: e.titre,
          sousTitre: [e.matiere, e.date === aujourdhui ? 'pour aujourd’hui' : `pour le ${jourCourt(e.date)}`].filter(Boolean).join(' · '),
          case: { cochee: e.fait, basculer: () => onBasculerDevoir(e.id) },
        });
      }
    }
    for (const m of mots) {
      if (!m.evenement || m.evenement.date < aujourdhui) continue;
      for (const item of m.aPrevoir) {
        const id = `${m.id}|${item}`;
        res.push({
          cle: `prevoir-${id}`,
          categorie: TYPES_CONTENU['a-prevoir'],
          titre: item,
          sousTitre: `À prévoir · ${m.evenement.titre}, ${jourCourt(m.evenement.date)}`,
          case: { cochee: coches.includes(id), basculer: () => onBasculerCoche(id) },
        });
      }
    }
    return res;
  }, [mots, primaire, evenements, coches, monNom, demo, aujourdhui, onOuvrirMot, onBasculerDevoir, onBasculerCoche]);

  // 2. Cette semaine : prochain événement
  const prochain = useMemo(() => {
    const maintenant = new Date();
    const hhmm = `${String(maintenant.getHours()).padStart(2, '0')}:${String(maintenant.getMinutes()).padStart(2, '0')}`;
    return evenements
      .filter((e) => TYPES_EVENEMENT.has(e.type) && (e.date > aujourdhui || (e.date === aujourdhui && (e.fin ?? e.debut) >= hhmm)))
      .sort((a, b) => (a.date + a.debut).localeCompare(b.date + b.debut))[0];
  }, [evenements, aujourdhui]);

  // 3. Nouveau dans le carnet : observations + mots importés, du plus récent au plus ancien
  const nouveaux = useMemo(
    () =>
      [
        ...apprentissages.map((e) => ({ date: e.date, obs: e, imp: undefined as ElementCarnet | undefined })),
        ...imports.map((e) => ({ date: e.date, obs: undefined as ElementSuivi | undefined, imp: e })),
      ]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 4),
    [apprentissages, imports],
  );

  // 4. Aujourd'hui : journée type (primaire)
  const journee = useMemo(
    () => (primaire ? evenements.filter((e) => e.type === 'cours' && e.date === aujourdhui).sort((a, b) => a.debut.localeCompare(b.debut)) : []),
    [primaire, evenements, aujourdhui],
  );

  return (
    <>
      {lignes.length > 0 && (
        <>
          <LibelleSurFondu texte="À faire" hauteur={hauteurFondu} premier />
          <Carte>
            {lignes.map((l, i) => (
              <Ligne key={l.cle} l={l} dernier={i === lignes.length - 1} />
            ))}
          </Carte>
        </>
      )}

      {prochain && (
        <>
          <LibelleSurFondu texte="Cette semaine" hauteur={hauteurFondu} premier={lignes.length === 0} />
          <Pressable
            onPress={onOuvrirAgenda}
            style={st.evenement}
            accessibilityRole="button"
            accessibilityLabel={`${prochain.titre}, ${jourCourt(prochain.date)}. Ouvrir l’agenda`}
          >
            <Text style={st.titre} numberOfLines={2}>{prochain.titre}</Text>
            <Text style={st.sousTitre} numberOfLines={2}>
              {[
                jourCourt(prochain.date),
                `${heureCourte(prochain.debut)}${prochain.fin ? `–${heureCourte(prochain.fin)}` : ''}`,
                prochain.lieu,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Pressable>
        </>
      )}

      {nouveaux.length > 0 && (
        <>
          <LibelleSurFondu texte="Nouveau dans le carnet" hauteur={hauteurFondu} premier={lignes.length === 0 && !prochain} />
          <Carte>
            {nouveaux.map((n, i) => {
              const dernier = i === nouveaux.length - 1;
              if (n.obs) {
                const o = n.obs;
                return (
                  <Pressable key={`o-${o.id}`} onPress={onOuvrirSuivi} style={[st.ligne, !dernier && st.ligneFiletee]} accessibilityRole="button">
                    <PastilleCategorie categorie={categorieDiscipline(o.domaine)} />
                    <View style={st.textes}>
                      <Text style={st.sousTitre} numberOfLines={2}>{o.domaine}</Text>
                      <Text style={st.texteObs}>{o.texte}</Text>
                      {primaire && o.niveau && o.echelle ? (
                        <View style={st.niveau}>
                          <Segments niveau={o.niveau} echelle={o.echelle} />
                          <Text style={st.niveauTexte}>{libelleNiveau(o.niveau, o.echelle)}</Text>
                        </View>
                      ) : null}
                      <Text style={st.source}>{ligneSource(o)}</Text>
                    </View>
                  </Pressable>
                );
              }
              const e = n.imp!;
              const photo = aUneImage(e);
              return (
                <Pressable key={`i-${e.id}`} onPress={() => onOuvrirImport(e)} style={[st.ligne, !dernier && st.ligneFiletee]} accessibilityRole="button">
                  <PastilleCategorie categorie={TYPES_CONTENU[photo ? 'photo' : 'document']} />
                  <View style={st.textes}>
                    <Text style={st.titre} numberOfLines={2}>{e.titre}</Text>
                    <Text style={st.source}>
                      {`${ligneSourceCarnet(e)}${e.visibilite === 'prive' ? ' · visible par vous seul' : ''}`}
                    </Text>
                  </View>
                  {photo ? (
                    <View style={st.miniature}>
                      <MiniatureCarnet element={e} taille={48} rayon={10} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </Carte>
        </>
      )}

      {journee.length > 0 && (
        <>
          <LibelleSurFondu texte="Aujourd’hui" hauteur={hauteurFondu} premier={lignes.length === 0 && !prochain && nouveaux.length === 0} />
          <Carte>
            {journee.map((c, i) => (
              <View key={c.id} style={[st.cours, i < journee.length - 1 && st.ligneFiletee]}>
                <Text style={st.heure}>{heureCourte(c.debut)}</Text>
                <PastilleCategorie categorie={categorieDiscipline(c.matiere ?? c.titre)} taille={34} rayon={11} />
                <Text style={st.nomCours} numberOfLines={1}>{c.matiere ?? c.titre}</Text>
              </View>
            ))}
          </Carte>
        </>
      )}
    </>
  );
}

const st = StyleSheet.create({
  // Carte blanche d'écran principal : fond OPAQUE, ombre iOS seulement (leçon du 26 sept : élévation sous fond
  // translucide = rectangle gris sur Android).
  carte: {
    marginHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
    ...Platform.select({
      ios: { shadowColor: NAVY, shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 0 },
      default: {},
    }),
  },
  ligne: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, minHeight: 58 },
  ligneFiletee: { borderBottomWidth: 1, borderBottomColor: 'rgba(15,23,42,0.06)' },
  ligneCorps: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  textes: { flex: 1, marginLeft: 12, marginRight: 8 },
  titre: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, lineHeight: 19, color: NAVY },
  titreFait: { color: 'rgba(15,23,42,0.45)', textDecorationLine: 'line-through' },
  sousTitre: { fontFamily: FontFamily.sansRegular, fontSize: 12, lineHeight: 16, color: 'rgba(15,23,42,0.6)', marginTop: 1 },
  texteObs: { fontFamily: FontFamily.sansRegular, fontSize: 14, lineHeight: 20, color: NAVY, marginTop: 2 },
  source: { fontFamily: FontFamily.sansRegular, fontSize: 11, lineHeight: 14, color: 'rgba(15,23,42,0.6)', marginTop: 3 },
  niveau: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  niveauTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 11, lineHeight: 14, color: NAVY },
  miniature: { marginLeft: 4 },
  // Pilule « Signer » de liste : 30 px, 14 de marge, 12 px 600 ; zone tactile 44 par hitSlop.
  pilule: {
    height: 30,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  piluleTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 12, lineHeight: 16, color: '#FFFFFF' },
  case: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caseCochee: { backgroundColor: NAVY, borderColor: NAVY },
  coche: { fontFamily: FontFamily.sansBold, fontSize: 13, lineHeight: 16, color: '#FFFFFF' },
  // Événement de l'Agenda (COMPONENTS §7) : barre indigo, fond indigo 8 %, sans emoji.
  evenement: {
    marginHorizontal: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#4338CA',
    backgroundColor: 'rgba(67,56,202,0.08)',
  },
  cours: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, minHeight: 50 },
  heure: { width: 40, fontFamily: FontFamily.sansMedium, fontSize: 13, lineHeight: 17, color: 'rgba(15,23,42,0.6)' },
  nomCours: { flex: 1, marginLeft: 10, fontFamily: FontFamily.sansMedium, fontSize: 14, lineHeight: 19, color: NAVY },
});
