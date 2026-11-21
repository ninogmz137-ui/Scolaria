/**
 * CorpsCarnet — corps de l'Accueil, le MÊME pour tous les niveaux (lot 6 ; CLAUDE.md § Accueil, COMPONENTS §18.3), dans
 * cet ordre :
 *   1. « À faire · N » : Signer, Autoriser, Répondre, Justifier, Lire — étiquette, titre, « échéance · [prénom] a signé »,
 *      chevron ; ouvre le détail du mot ou la page d'absence. Absente si vide.
 *   2. « Aujourd'hui et demain » : événements et rendez-vous fixes (barre de couleur + libellé de catégorie), « À prévoir »
 *      et devoirs cochables (« Coché par [prénom] · [heure] » sur sa propre ligne). Jamais un mot comme événement.
 *   3. « Nouveau dans le carnet » : observations et compétences, notes (collège / lycée), photos (vignette), documents,
 *      avec leur source. Carnet vide : carte d'invitation « Ajoutez la première pièce du carnet » + « Ajouter ».
 *   4. Suggestion de l'assistant : une ligne, sa source dessous, sans titre ni nom de personnage ; absente si rien.
 * Maternelle : pas de devoirs (useAgendaSemaine n'en a pas). Tout vient de l'enfant sélectionné (jamais d'un autre carnet).
 */

import { View, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { C, RADIUS, SHADOW } from '../../constants/design';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text, Pressable } from '../ui';
import PastilleCategorie from '../PastilleCategorie';
import MiniatureCarnet, { aUneImage } from '../MiniatureCarnet';
import ScolariaSymbol from '../ScolariaSymbol';
import { LibelleSurFondu } from './SurFondu';
import { Segments } from '../../screens/suivi/ApprentissagesVue';
import type { ElementCarnet } from '../../services/carnetService';
import { ligneSourceCarnet } from '../../screens/suivi/CarnetVue';
import { categorieDiscipline, LIBELLES_EVENEMENT, TYPES_CONTENU } from '../../theme/categories';
import { libelleNiveau, ligneSource, type ElementSuivi } from '../../utils/competences';
import type { ElementJour, LigneAFaire, Suggestion } from '../../utils/accueil';
import type { NoteAccueil } from '../../hooks/useAccueilReel';

const NAVY = '#0F172A';

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

function Carte({ children }: { children: React.ReactNode }) {
  return <View style={st.carte}>{children}</View>;
}

type Nouveau =
  | { cle: string; date: string; obs: ElementSuivi }
  | { cle: string; date: string; imp: ElementCarnet }
  | { cle: string; date: string; note: NoteAccueil };

export default function CorpsCarnet({
  hauteurFondu,
  primaire,
  aFaire,
  onOuvrirAFaire,
  elements,
  onBasculerDevoir,
  onBasculerPrevoir,
  onOuvrirAgenda,
  apprentissages,
  imports,
  notes,
  onOuvrirScolarite,
  onOuvrirImport,
  onAjouter,
  suggestion,
  onOuvrirAssistant,
}: {
  hauteurFondu: number;
  /** Primaire : segments de niveau des compétences. */
  primaire: boolean;
  aFaire: LigneAFaire[];
  onOuvrirAFaire: (l: LigneAFaire) => void;
  elements: ElementJour[];
  onBasculerDevoir: (evtId: string) => void;
  onBasculerPrevoir: (e: Extract<ElementJour, { sorte: 'prevoir' }>) => void;
  onOuvrirAgenda: () => void;
  apprentissages: ElementSuivi[];
  imports: ElementCarnet[];
  notes: NoteAccueil[];
  onOuvrirScolarite: () => void;
  onOuvrirImport: (e: ElementCarnet) => void;
  onAjouter: () => void;
  suggestion: Suggestion | null;
  onOuvrirAssistant: () => void;
}) {
  // 3. Nouveau dans le carnet : du plus récent au plus ancien, quatre au plus.
  const nouveaux: Nouveau[] = [
    ...apprentissages.map((o) => ({ cle: `o-${o.id}`, date: o.date, obs: o })),
    ...imports.map((e) => ({ cle: `i-${e.id}`, date: e.date, imp: e })),
    ...notes.map((n) => ({ cle: `n-${n.id}`, date: n.iso, note: n })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  let premier = true;
  const libelle = (texte: string) => {
    const l = <LibelleSurFondu texte={texte} hauteur={hauteurFondu} premier={premier} />;
    premier = false;
    return l;
  };

  return (
    <>
      {aFaire.length > 0 && (
        <>
          {libelle(`À faire · ${aFaire.length}`)}
          <Carte>
            {aFaire.map((l, i) => (
              <Pressable
                key={l.cle}
                onPress={() => onOuvrirAFaire(l)}
                style={[st.ligne, i < aFaire.length - 1 && st.ligneFiletee]}
                accessibilityRole="button"
                accessibilityLabel={`${l.etiquette} : ${l.titre}. ${l.sousTitre}`}
              >
                <View style={st.etiquette}>
                  <Text style={st.etiquetteTexte}>{l.etiquette}</Text>
                </View>
                <View style={st.textes}>
                  <Text style={st.titre} numberOfLines={2}>{l.titre}</Text>
                  <Text style={st.sousTitre} numberOfLines={2}>{l.sousTitre}</Text>
                </View>
                <ChevronRight size={16} color="rgba(15,23,42,0.35)" strokeWidth={2} />
              </Pressable>
            ))}
          </Carte>
        </>
      )}

      {libelle('Aujourd’hui et demain')}
      {elements.length > 0 ? (
        <Carte>
          {elements.map((e, i) => {
            const dernier = i === elements.length - 1;
            if (e.sorte === 'evenement' || e.sorte === 'rendezvous') {
              const categorie = e.sorte === 'rendezvous' ? 'Rendez-vous' : LIBELLES_EVENEMENT[e.typeEvt] ?? 'Événement';
              return (
                <Pressable key={e.cle} onPress={onOuvrirAgenda} style={[st.ligne, !dernier && st.ligneFiletee]} accessibilityRole="button" accessibilityLabel={`${e.titre}. ${e.sousTitre}. Ouvrir l’agenda`}>
                  <View style={st.barre} />
                  <View style={st.textes}>
                    <Text style={st.titre} numberOfLines={2}>{e.titre}</Text>
                    <Text style={st.sousTitre} numberOfLines={2}>{`${categorie} · ${e.sousTitre}`}</Text>
                  </View>
                </Pressable>
              );
            }
            if (e.sorte === 'devoir') {
              return (
                <View key={e.cle} style={[st.ligne, !dernier && st.ligneFiletee]}>
                  <PastilleCategorie categorie={categorieDiscipline(e.matiere)} />
                  <View style={st.textes}>
                    <Text style={[st.titre, e.fait && st.titreFait]} numberOfLines={2}>{e.titre}</Text>
                    <Text style={st.sousTitre} numberOfLines={1}>{`Devoir · ${e.sousTitre}`}</Text>
                    {e.source ? <Text style={st.source} numberOfLines={1}>{e.source}</Text> : null}
                  </View>
                  <CaseRonde cochee={e.fait} onPress={() => onBasculerDevoir(e.evtId)} libelle={`${e.titre}${e.fait ? ', fait' : ', à faire'}`} />
                </View>
              );
            }
            return (
              <View key={e.cle} style={[st.ligne, !dernier && st.ligneFiletee]}>
                <PastilleCategorie categorie={TYPES_CONTENU['a-prevoir']} />
                <View style={st.textes}>
                  <Text style={[st.titre, e.fait && st.titreFait]} numberOfLines={2}>{e.titre}</Text>
                  <Text style={st.sousTitre} numberOfLines={2}>{e.sousTitre}</Text>
                  {e.source ? <Text style={st.source} numberOfLines={1}>{e.source}</Text> : null}
                </View>
                <CaseRonde cochee={e.fait} onPress={() => onBasculerPrevoir(e)} libelle={`${e.titre}${e.fait ? ', prévu' : ', à prévoir'}`} />
              </View>
            );
          })}
        </Carte>
      ) : (
        <Text style={st.vide}>Rien de prévu aujourd’hui ni demain.</Text>
      )}

      {libelle('Nouveau dans le carnet')}
      {nouveaux.length > 0 ? (
        <Carte>
          {nouveaux.map((n, i) => {
            const dernier = i === nouveaux.length - 1;
            if ('obs' in n) {
              const o = n.obs;
              return (
                <Pressable key={n.cle} onPress={onOuvrirScolarite} style={[st.ligne, !dernier && st.ligneFiletee]} accessibilityRole="button">
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
            if ('note' in n) {
              const g = n.note;
              return (
                <Pressable key={n.cle} onPress={onOuvrirScolarite} style={[st.ligne, !dernier && st.ligneFiletee]} accessibilityRole="button">
                  <PastilleCategorie categorie={categorieDiscipline(g.subject)} />
                  <View style={st.textes}>
                    <Text style={st.titre} numberOfLines={1}>{g.subject}</Text>
                    <Text style={st.source}>{`Note du ${g.date}`}</Text>
                  </View>
                  <Text style={st.note}>
                    {g.grade}
                    <Text style={st.bareme}>{`/${g.scale}`}</Text>
                  </Text>
                </Pressable>
              );
            }
            const e = n.imp;
            const photo = aUneImage(e);
            return (
              <Pressable key={n.cle} onPress={() => onOuvrirImport(e)} style={[st.ligne, !dernier && st.ligneFiletee]} accessibilityRole="button">
                <PastilleCategorie categorie={TYPES_CONTENU[photo ? 'photo' : 'document']} />
                <View style={st.textes}>
                  <Text style={st.titre} numberOfLines={2}>{e.titre}</Text>
                  <Text style={st.source}>{`${ligneSourceCarnet(e)}${e.visibilite === 'prive' ? ' · visible par vous seul' : ''}`}</Text>
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
      ) : (
        <View style={st.invitation}>
          <Text style={st.invitationTexte}>Ajoutez la première pièce du carnet.</Text>
          <Pressable onPress={onAjouter} style={st.pilule} accessibilityRole="button">
            <Text style={st.piluleTexte}>Ajouter</Text>
          </Pressable>
        </View>
      )}

      {suggestion ? (
        <Pressable onPress={onOuvrirAssistant} style={st.suggestion} accessibilityRole="button" accessibilityLabel={`${suggestion.texte} ${suggestion.source}. Ouvrir l’assistant`}>
          <View style={st.suggestionSymbole}>
            <ScolariaSymbol size={14} color={C.indigo} />
          </View>
          <View style={st.textes}>
            <Text style={st.suggestionTexte}>{suggestion.texte}</Text>
            <Text style={st.source}>{suggestion.source}</Text>
          </View>
        </Pressable>
      ) : null}
    </>
  );
}

const st = StyleSheet.create({
  // Carte blanche d'écran principal : fond OPAQUE, ombre iOS seulement (leçon du 26 sept).
  carte: {
    marginHorizontal: 14,
    borderRadius: RADIUS.card,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.border,
    ...SHADOW.card,
  },
  ligne: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, minHeight: 58 },
  ligneFiletee: { borderBottomWidth: 1, borderBottomColor: 'rgba(15,23,42,0.06)' },
  textes: { flex: 1, marginLeft: 12, marginRight: 8 },
  titre: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, lineHeight: 19, color: NAVY },
  titreFait: { color: 'rgba(15,23,42,0.45)', textDecorationLine: 'line-through' },
  sousTitre: { fontFamily: FontFamily.sansRegular, fontSize: 12, lineHeight: 16, color: 'rgba(15,23,42,0.6)', marginTop: 1 },
  texteObs: { fontFamily: FontFamily.sansRegular, fontSize: 14, lineHeight: 20, color: NAVY, marginTop: 2 },
  source: { fontFamily: FontFamily.sansRegular, fontSize: 11, lineHeight: 14, color: 'rgba(15,23,42,0.6)', marginTop: 3 },
  niveau: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  niveauTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 11, lineHeight: 14, color: NAVY },
  miniature: { marginLeft: 4 },
  note: { fontFamily: FontFamily.sansBold, fontSize: 18, lineHeight: 22, color: NAVY },
  bareme: { fontFamily: FontFamily.sansMedium, fontSize: 12, color: 'rgba(15,23,42,0.45)' },
  // Étiquette d'action (indigo = la seule couleur d'action), à gauche de la ligne.
  etiquette: {
    minWidth: 70,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(67,56,202,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiquetteTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 12, lineHeight: 16, color: '#4338CA' },
  // Événement / rendez-vous : barre de couleur (indigo) + libellé de catégorie écrit (COMPONENTS §7 : jamais la couleur seule).
  barre: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: '#4338CA', marginLeft: 2, marginRight: 4 },
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
  vide: { marginHorizontal: 20, paddingVertical: 6, fontFamily: FontFamily.sansMedium, fontSize: 14, lineHeight: 19, color: 'rgba(15,23,42,0.55)' },
  // Carte d'invitation (rubrique vide : jamais masquée) — une phrase + une pilule.
  invitation: {
    marginHorizontal: 14,
    padding: 16,
    borderRadius: RADIUS.card,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.border,
    ...SHADOW.card,
  },
  invitationTexte: { fontFamily: FontFamily.sansMedium, fontSize: 14, lineHeight: 20, color: NAVY },
  pilule: {
    alignSelf: 'flex-start',
    marginTop: 12,
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  piluleTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, lineHeight: 18, color: '#FFFFFF' },
  // Suggestion de l'assistant : UNE ligne, symbole 14 px, source dessous ; pas de carte (COMPONENTS §18.3).
  suggestion: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 14, marginTop: 18, paddingHorizontal: 6, paddingVertical: 6, minHeight: 44 },
  suggestionSymbole: { marginTop: 2 },
  suggestionTexte: { fontFamily: FontFamily.sansMedium, fontSize: 13, lineHeight: 18, color: NAVY },
});
