/**
 * EffacementScreen — droit à l'effacement, RÉEL (L7, M25, décision D6).
 *
 * - Effacer le carnet de l'enfant affiché : seulement si vous êtes son unique responsable (M2e). Le bouton
 *   « me retirer de ce carnet » n'existe pas encore dans l'app (todo) : l'écran ne le promet pas.
 * - Effacer mon compte : aperçu des carnets effacés (seul responsable) / gardés (autre responsable).
 * - Effacement 30 jours après la demande, annulable jusque-là ; invisible dès la demande.
 * - L'exécution est faite par le serveur (Edge Function « executer-effacements ») : l'app ne supprime rien
 *   elle-même.
 * Remplace l'écran factice (fausses quantités, « exécution sous 72 h », demande que rien ne traitait).
 */

import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2, UserX, RotateCcw } from 'lucide-react-native';
import RgpdBottomSheet from '../../components/rgpd/RgpdBottomSheet';
import { DeepGroup, DeepRow, DEEP } from '../../components/DeepList';
import { useActiveChild } from '../../contexts/ActiveChildContext';
import { useAuth } from '../../contexts/AuthContext';
import { getResponsablesEnfant } from '../../services/database';
import {
  mesEffacements,
  apercuEffacementCompte,
  demanderEffacementEnfant,
  demanderEffacementCompte,
  annulerEffacement,
  dateEffacement,
  type Effacement,
} from '../../services/effacement';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text } from '../../components/ui';
import { de } from '../../utils/francais';

const MESSAGE_ERREUR: Record<string, string> = {
  plusieurs_responsables: 'Ce carnet a plusieurs responsables : il ne peut être effacé que par son unique responsable.',
  compte_non_famille: 'L’effacement d’un compte enseignant n’est pas encore disponible dans l’app.',
  deja_demande: 'Un effacement est déjà demandé.',
  indisponible: 'La demande n’a pas pu être enregistrée. Réessayez.',
};

export default function EffacementScreen() {
  const insets = useSafeAreaInsets();
  const { isDemo, role } = useAuth();
  const { selectedChild, reloadChildren } = useActiveChild();
  const prenom = selectedChild?.name?.split(' ')[0] ?? '';

  const [demandes, setDemandes] = useState<Effacement[]>([]);
  const [nbResponsables, setNbResponsables] = useState<number | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    if (isDemo) {
      setNbResponsables(2); // démo : chaque enfant a deux responsables (vous + Marc / Julien)
      return;
    }
    setDemandes(await mesEffacements());
    if (selectedChild?.id) {
      const { data } = await getResponsablesEnfant(selectedChild.id);
      setNbResponsables(data.length);
    }
  }, [isDemo, selectedChild?.id]);

  useEffect(() => {
    charger();
  }, [charger]);

  const demo = () => Alert.alert('Mode démo', 'Rien n’est effacé en mode démo.');

  const effacerCarnet = () => {
    if (isDemo) return demo();
    if (!selectedChild) return;
    Alert.alert(
      `Effacer le carnet ${de(prenom)} ?`,
      `Tout le carnet ${de(prenom)} sera effacé dans 30 jours : années, mots, souvenirs, livrets, photos et documents. ` +
        `Il disparaît de l’app dès maintenant. Vous pourrez annuler pendant 30 jours.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: async () => {
            setEnvoi(true);
            const r = await demanderEffacementEnfant(selectedChild.id);
            setEnvoi(false);
            if (r.erreur) return Alert.alert('Effacement', MESSAGE_ERREUR[r.erreur]);
            await reloadChildren();
            Alert.alert(
              'Effacement demandé',
              `Le carnet ${de(prenom)} sera effacé le ${dateEffacement(r.executionLe)}. D’ici là, vous pouvez annuler depuis cet écran.`,
            );
            charger();
          },
        },
      ],
    );
  };

  const effacerCompte = async () => {
    if (isDemo) return demo();
    const apercu = await apercuEffacementCompte();
    if (!apercu) return Alert.alert('Effacement', MESSAGE_ERREUR.indisponible);
    const effaces = apercu.filter((a) => a.carnet_efface).map((a) => a.prenom_enfant);
    const gardes = apercu.filter((a) => !a.carnet_efface).map((a) => a.prenom_enfant);
    const lignes = [
      effaces.length ? `Carnets effacés (vous en êtes le seul responsable) : ${effaces.join(', ')}.` : '',
      gardes.length ? `Carnets gardés par l’autre responsable : ${gardes.join(', ')}.` : '',
      'Effacés : vos ajouts privés, vos conversations Aria, vos messages privés avec l’enseignant, vos réponses aux mots.',
      'Gardés dans le carnet de l’enfant, sans votre nom : vos ajouts partagés avec le foyer (« Ajouté par un ancien responsable »), vos signatures (« Signé par un responsable (compte supprimé) ») et vos messages du fil famille (« Ancien responsable »).',
      'Votre compte est désactivé dès maintenant et effacé dans 30 jours. Vous pourrez annuler jusque-là.',
    ].filter(Boolean);
    Alert.alert('Effacer votre compte ?', lignes.join('\n\n'), [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Effacer mon compte',
        style: 'destructive',
        onPress: async () => {
          setEnvoi(true);
          const r = await demanderEffacementCompte();
          setEnvoi(false);
          if (r.erreur) return Alert.alert('Effacement', MESSAGE_ERREUR[r.erreur]);
          // L'écran « compte en cours d'effacement » prend le relais (surChangementEffacement).
        },
      },
    ]);
  };

  const annuler = (d: Effacement) =>
    Alert.alert(
      'Annuler l’effacement ?',
      d.portee === 'enfant' ? `Le carnet ${de(d.prenom_enfant ?? '')} redeviendra visible, intact.` : 'Votre compte sera réactivé, intact.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Annuler l’effacement',
          onPress: async () => {
            const ok = await annulerEffacement(d.demande_id);
            if (!ok) return Alert.alert('Effacement', MESSAGE_ERREUR.indisponible);
            await reloadChildren();
            charger();
          },
        },
      ],
    );

  const demandesEnfant = demandes.filter((d) => d.portee === 'enfant');
  const famille = isDemo || role === 'parent';

  return (
    <RgpdBottomSheet>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 56, paddingBottom: insets.bottom + 24 }}
      >
        <Text style={st.title}>Effacer des données</Text>
        <Text style={st.subtitle}>
          L’effacement a lieu 30 jours après votre demande. Les données disparaissent de l’app dès la demande, et vous
          pouvez annuler pendant ces 30 jours.
        </Text>

        {demandesEnfant.length > 0 && (
          <DeepGroup title="Effacements demandés" first>
            {demandesEnfant.map((d, i) => (
              <DeepRow
                key={d.demande_id}
                icon={<RotateCcw size={20} color={DEEP.indigo} strokeWidth={2} />}
                label={`Carnet ${de(d.prenom_enfant ?? '')}`}
                description={`Effacé le ${dateEffacement(d.execution_prevue_le)} · toucher pour annuler`}
                accent
                last={i === demandesEnfant.length - 1}
                onPress={() => annuler(d)}
              />
            ))}
          </DeepGroup>
        )}

        {famille && selectedChild && (
          <DeepGroup title={`Carnet ${de(prenom)}`} first={demandesEnfant.length === 0}>
            {nbResponsables === 1 ? (
              <DeepRow
                icon={<Trash2 size={20} color="#EF4444" strokeWidth={2} />}
                label={`Effacer le carnet ${de(prenom)}`}
                description="Vous en êtes le seul responsable"
                danger
                last
                onPress={envoi ? undefined : effacerCarnet}
              />
            ) : (
              <DeepRow
                label={nbResponsables === null ? 'Chargement…' : `Le carnet ${de(prenom)} a ${nbResponsables} responsables`}
                description={nbResponsables === null ? undefined : 'Un carnet ne peut être effacé que par son unique responsable.'}
                last
              />
            )}
          </DeepGroup>
        )}

        <DeepGroup title="Mon compte">
          {famille ? (
            <DeepRow
              icon={<UserX size={20} color="#EF4444" strokeWidth={2} />}
              label="Effacer mon compte"
              description="Désactivé tout de suite, effacé dans 30 jours"
              danger
              last
              onPress={envoi ? undefined : effacerCompte}
            />
          ) : (
            <DeepRow label="Effacement du compte" description={MESSAGE_ERREUR.compte_non_famille} last />
          )}
        </DeepGroup>
      </ScrollView>
    </RgpdBottomSheet>
  );
}

const st = StyleSheet.create({
  title: { fontFamily: FontFamily.sansBold, fontSize: 20, lineHeight: 26, color: DEEP.navy, paddingHorizontal: 16 },
  subtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    lineHeight: 18,
    color: DEEP.text55,
    paddingHorizontal: 16,
    marginTop: 6,
  },
});
