/**
 * PermissionsScreen — « Autorisations » : qui a accès au carnet de l'enfant actif.
 *
 * Affiche UNIQUEMENT les vrais responsables légaux de l'enfant (table responsables, RPC
 * responsables_enfant — M2f), les invitations en attente, et « Inviter un responsable ».
 * Aucun rôle fictif (famille proche, accompagnant…) : les accès partiels pour les proches
 * sont une idée future (VISION), pas une fonction.
 *
 * Invitation : acceptée par l'invité dont l'email de compte est confirmé (M2c). Personne ne
 * s'ajoute seul ; on ne peut retirer que soi-même (Famille & paramètres, B4).
 */

import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, UserPlus, LogOut } from 'lucide-react-native';
import RgpdBottomSheet from '../../components/rgpd/RgpdBottomSheet';
import { DeepGroup, DeepRow, DeepAvatar, DEEP } from '../../components/DeepList';
import { useActiveChild } from '../../contexts/ActiveChildContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  getResponsablesEnfant,
  getInvitationsEnAttente,
  inviterResponsable,
  envoyerEmailInvitation,
  annulerInvitation,
  renvoyerInvitation,
  type ResponsableEnfant,
} from '../../services/database';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text, TextInput, Pressable } from '../../components/ui';
import { de } from '../../utils/francais';
import { libelleInvitationInvitant } from '../../utils/invitationExpiree';
import { MOI_DEMO, autreResponsableDemo } from '../../data/demo/responsables';
import { NOM_APP } from '../../constants/marque';
import { apercuDepartCarnet, quitterCarnet, texteConfirmationDepart } from '../../services/quitterCarnet';

const LIENS: Record<ResponsableEnfant['lien'], string> = {
  parent: 'Parent',
  tuteur: 'Tuteur légal',
  autre: 'Responsable légal',
};

function initiales(prenom: string, nom: string): string {
  return ((prenom[0] ?? '') + (nom[0] ?? '')).toUpperCase() || '?';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PermissionsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { selectedChild, reloadChildren } = useActiveChild();
  const { isDemo, user } = useAuth();
  const [retrait, setRetrait] = useState(false);
  const prenomEnfant = selectedChild?.name?.split(' ')[0] ?? '';

  const [responsables, setResponsables] = useState<ResponsableEnfant[]>([]);
  const [invitations, setInvitations] = useState<{ id: string; invited_email: string; expires_at: string }[]>([]);
  const [chargement, setChargement] = useState(true);
  const [formOuvert, setFormOuvert] = useState(false);
  const [email, setEmail] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    if (!selectedChild?.id) return;
    setChargement(true);
    if (isDemo) {
      // Démo : vous + l'autre responsable (Marc, même foyer ; Julien, autre foyer pour Emma).
      setResponsables([
        { user_id: 'demo-moi', prenom: MOI_DEMO.prenom, nom: MOI_DEMO.nom, lien: 'parent', est_moi: true, depuis: '' },
        (() => {
          const autre = autreResponsableDemo(selectedChild.id);
          return { user_id: autre.id, prenom: autre.prenom, nom: autre.nom, lien: 'parent' as const, est_moi: false, depuis: '' };
        })(),
      ]);
      setInvitations([]);
    } else {
      const [r, i] = await Promise.all([
        getResponsablesEnfant(selectedChild.id),
        getInvitationsEnAttente(selectedChild.id),
      ]);
      setResponsables(r.data);
      setInvitations(i.data);
    }
    setChargement(false);
  }, [selectedChild?.id, isDemo, user]);

  useEffect(() => {
    charger();
  }, [charger]);

  // « Me retirer de ce carnet » (M28) : moi seul, jamais le dernier responsable.
  const seulResponsable = !isDemo && !chargement && responsables.length <= 1;
  const retirer = async () => {
    if (!selectedChild || retrait) return;
    if (isDemo) {
      Alert.alert('Mode démo', 'Aucun retrait n’est enregistré en mode démo.');
      return;
    }
    const apercu = await apercuDepartCarnet(selectedChild.id);
    Alert.alert(`Vous retirer du carnet ${de(prenomEnfant)} ?`, texteConfirmationDepart(prenomEnfant, apercu), [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Me retirer',
        style: 'destructive',
        onPress: async () => {
          setRetrait(true);
          const erreur = await quitterCarnet(selectedChild.id);
          setRetrait(false);
          if (erreur === 'dernier_responsable') {
            Alert.alert('Retrait impossible', 'Vous êtes le seul responsable de ce carnet : invitez un autre responsable d’abord, ou effacez le carnet.');
          } else if (erreur) {
            Alert.alert('Retrait impossible', 'Le retrait n’a pas pu être enregistré. Réessayez.');
          } else {
            await reloadChildren();
            navigation.goBack();
          }
        },
      },
    ]);
  };

  // Invitation non traitée (valable 7 jours) : renvoyer (annule l'ancienne, en crée une nouvelle, renvoie l'email)
  // ou annuler. Disponible aussi quand elle a EXPIRÉ (M34) : réinviter la même adresse n'est plus bloqué.
  const [occupe, setOccupe] = useState(false);
  const renvoyer = async (inv: { id: string; invited_email: string }) => {
    setOccupe(true);
    const { data: nouvelle, error } = await renvoyerInvitation(inv.id);
    if (error || !nouvelle) {
      setOccupe(false);
      Alert.alert('Invitation non renvoyée', 'Elle n’a pas pu être renvoyée. Vérifiez la connexion, puis réessayez.');
      return;
    }
    const { envoye } = await envoyerEmailInvitation(nouvelle);
    setOccupe(false);
    Alert.alert(
      envoye ? 'Invitation renvoyée' : 'Invitation renouvelée',
      envoye
        ? `Un nouvel email a été envoyé à ${inv.invited_email}. Elle est valable 7 jours.`
        : `L’email n’a pas pu être envoyé. Prévenez ${inv.invited_email} : l’invitation l’attend pendant 7 jours dans ${NOM_APP}.`,
    );
    charger();
  };
  const annuler = async (inv: { id: string; invited_email: string }) => {
    setOccupe(true);
    const { error } = await annulerInvitation(inv.id);
    setOccupe(false);
    if (error) {
      Alert.alert('Invitation non annulée', 'Elle n’a pas pu être annulée. Vérifiez la connexion, puis réessayez.');
      return;
    }
    charger();
  };
  const gererInvitation = (inv: { id: string; invited_email: string; expires_at: string }) => {
    if (occupe) return;
    const { expiree } = libelleInvitationInvitant(inv.expires_at);
    Alert.alert(
      inv.invited_email,
      expiree
        ? 'Cette invitation a expiré (elle est valable 7 jours). Vous pouvez la renvoyer ou l’annuler.'
        : 'Cette invitation est en attente (valable 7 jours). Vous pouvez la renvoyer ou l’annuler.',
      [
        { text: 'Renvoyer', onPress: () => renvoyer(inv) },
        { text: 'Annuler l’invitation', style: 'destructive', onPress: () => annuler(inv) },
        { text: 'Fermer', style: 'cancel' },
      ],
    );
  };

  const envoyer = async () => {
    const adresse = email.trim().toLowerCase();
    if (!EMAIL_RE.test(adresse)) {
      Alert.alert('Adresse invalide', 'Vérifiez l’adresse e-mail.');
      return;
    }
    if (isDemo) {
      Alert.alert('Mode démo', 'Aucune invitation n’est envoyée en mode démo.');
      return;
    }
    if (!selectedChild) return;
    setEnvoi(true);
    const { data: invitation, error } = await inviterResponsable(selectedChild.id, adresse);
    if (error || !invitation) {
      setEnvoi(false);
      Alert.alert(
        'Invitation impossible',
        'Une invitation est déjà en attente pour cette adresse : appuyez dessus dans la liste ci-dessus pour la renvoyer ou l’annuler. Sinon, vérifiez la connexion et réessayez.',
      );
      return;
    }
    // Email d'invitation (L4) : message FIDÈLE au résultat, jamais « envoyé » si rien n'est parti.
    const { envoye } = await envoyerEmailInvitation(invitation.id);
    setEnvoi(false);
    setEmail('');
    setFormOuvert(false);
    Alert.alert(
      envoye ? 'Invitation envoyée' : 'Invitation enregistrée',
      envoye
        ? `Un email a été envoyé à ${adresse}. Cette personne devra se connecter avec cette adresse (confirmée) et accepter l’invitation dans les 7 jours.`
        : `L’email n’a pas pu être envoyé. Prévenez ${adresse} : en se connectant à ${NOM_APP} avec cette adresse (confirmée) dans les 7 jours, l’invitation l’attendra.`,
    );
    charger();
  };

  return (
    <RgpdBottomSheet>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: 56, paddingBottom: insets.bottom + 24 }}
      >
        <Text style={st.title}>Autorisations</Text>
        <Text style={st.subtitle}>
          Les responsables légaux {prenomEnfant ? de(prenomEnfant) : 'de l’enfant'} ont accès à tout son carnet.
          Chacun garde privés ses messages avec l’enseignant et ses ajouts marqués « privé ».
        </Text>

        <DeepGroup title={`Responsables légaux ${de(prenomEnfant)}`} first>
          {chargement ? (
            <DeepRow label="Chargement…" last />
          ) : responsables.length === 0 ? (
            <DeepRow label="Aucun responsable trouvé pour cet enfant" last />
          ) : (
            responsables.map((r, i) => {
              const nomComplet = [r.prenom, r.nom].filter(Boolean).join(' ') || 'Responsable';
              return (
                <DeepRow
                  key={r.user_id}
                  leading={<DeepAvatar initials={initiales(r.prenom, r.nom)} color={DEEP.navy} />}
                  label={r.est_moi ? `${nomComplet} (vous)` : nomComplet}
                  description={LIENS[r.lien] ?? LIENS.autre}
                  last={i === responsables.length - 1 && invitations.length === 0}
                />
              );
            })
          )}
          {invitations.map((inv, i) => (
            <DeepRow
              key={inv.id}
              icon={<Mail size={20} color={DEEP.text55} strokeWidth={2} />}
              label={inv.invited_email}
              description={`${libelleInvitationInvitant(inv.expires_at).texte} · appuyez pour renvoyer ou annuler`}
              onPress={() => gererInvitation(inv)}
              last={i === invitations.length - 1}
            />
          ))}
        </DeepGroup>

        <DeepGroup>
          <DeepRow
            icon={<UserPlus size={20} color={DEEP.indigo} strokeWidth={2} />}
            label="Inviter un responsable"
            accent
            last={!formOuvert}
            onPress={() => setFormOuvert(!formOuvert)}
          />
          {formOuvert && (
            <View style={st.form}>
              <Text style={st.formHint}>
                L’autre responsable reçoit l’accès au carnet {de(prenomEnfant)} après avoir accepté,
                {`depuis un compte ${NOM_APP} à cette adresse.`}
              </Text>
              <TextInput
                style={st.input}
                placeholder="adresse@exemple.fr"
                placeholderTextColor="rgba(15,23,42,0.30)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Adresse e-mail du responsable"
              />
              <Pressable
                style={[st.primary, (envoi || email.trim() === '') && { opacity: 0.4 }]}
                onPress={envoyer}
                disabled={envoi || email.trim() === ''}
                accessibilityRole="button"
              >
                <Text style={st.primaryText}>{envoi ? 'Envoi…' : 'Envoyer l’invitation'}</Text>
              </Pressable>
            </View>
          )}
        </DeepGroup>

        <DeepGroup title="Quitter ce carnet">
          {seulResponsable ? (
            <DeepRow
              label="Me retirer de ce carnet"
              description="Vous êtes le seul responsable : invitez un autre responsable d’abord, ou effacez le carnet (Effacer des données)."
              last
            />
          ) : (
            <DeepRow
              icon={<LogOut size={20} color="#EF4444" strokeWidth={2} />}
              label="Me retirer de ce carnet"
              description="Vous perdez l’accès ; vos ajouts privés sont supprimés, vos ajouts partagés restent"
              danger
              last
              onPress={retrait ? undefined : retirer}
            />
          )}
        </DeepGroup>
      </ScrollView>
    </RgpdBottomSheet>
  );
}

const st = StyleSheet.create({
  title: {
    fontFamily: FontFamily.sansBold,
    fontSize: 20,
    lineHeight: 26,
    color: DEEP.navy,
    paddingHorizontal: 16,
  },
  subtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    lineHeight: 18,
    color: DEEP.text55,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  form: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  formHint: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    lineHeight: 17,
    color: DEEP.text55,
    marginBottom: 10,
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    color: DEEP.navy,
    marginBottom: 12,
  },
  primary: {
    height: 52,
    width: '100%',
    maxWidth: 240,
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: DEEP.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
