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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, UserPlus } from 'lucide-react-native';
import RgpdBottomSheet from '../../components/rgpd/RgpdBottomSheet';
import { DeepGroup, DeepRow, DeepAvatar, DEEP } from '../../components/DeepList';
import { useActiveChild } from '../../contexts/ActiveChildContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  getResponsablesEnfant,
  getInvitationsEnAttente,
  inviterResponsable,
  type ResponsableEnfant,
} from '../../services/database';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text, TextInput, Pressable } from '../../components/ui';

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
  const { selectedChild } = useActiveChild();
  const { isDemo, user } = useAuth();
  const prenomEnfant = selectedChild?.name?.split(' ')[0] ?? '';

  const [responsables, setResponsables] = useState<ResponsableEnfant[]>([]);
  const [invitations, setInvitations] = useState<{ id: string; invited_email: string }[]>([]);
  const [chargement, setChargement] = useState(true);
  const [formOuvert, setFormOuvert] = useState(false);
  const [email, setEmail] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    if (!selectedChild?.id) return;
    setChargement(true);
    if (isDemo) {
      // Démo : famille Moreau, deux responsables.
      const moi = (user?.user_metadata?.family_name as string | undefined) ?? 'Moreau';
      setResponsables([
        { user_id: 'demo-moi', prenom: '', nom: moi, lien: 'parent', est_moi: true, depuis: '' },
        { user_id: 'demo-marc', prenom: 'Marc', nom: 'Moreau', lien: 'parent', est_moi: false, depuis: '' },
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
    setEnvoi(true);
    const { error } = await inviterResponsable(selectedChild.id, adresse);
    setEnvoi(false);
    if (error) {
      Alert.alert(
        'Invitation impossible',
        'Une invitation est peut-être déjà en attente pour cette adresse. Réessayez plus tard.',
      );
      return;
    }
    setEmail('');
    setFormOuvert(false);
    Alert.alert(
      'Invitation envoyée',
      `${adresse} devra se connecter avec cette adresse (confirmée) et accepter l’invitation dans les 7 jours.`,
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
          Les responsables légaux de {prenomEnfant || 'l’enfant'} ont accès à tout son carnet.
          Chacun garde privés ses messages avec l’enseignant et ses ajouts marqués « privé ».
        </Text>

        <DeepGroup title={`Responsables légaux de ${prenomEnfant}`} first>
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
              description="Invitation en attente"
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
                L’autre responsable reçoit l’accès au carnet de {prenomEnfant} après avoir accepté,
                depuis un compte Scolaria à cette adresse.
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
