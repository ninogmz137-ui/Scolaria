/**
 * FamilleParametresScreen — écran unique « Famille et paramètres », ouvert par ☰ (lot 6 ; CLAUDE.md § Pages profondes).
 * Page profonde (COMPONENTS §8) : fond Brume, groupes de rows sur blanc, aucune carte.
 *
 * Groupes (dans l'ordre de CLAUDE.md), en n'affichant QUE ce qui fonctionne aujourd'hui :
 *   1. Mes enfants → fiche de l'enfant ; Ajouter un enfant.
 *   2. Responsables → par enfant : inviter, qui voit quoi, me retirer (écran Autorisations).
 *   3. Mon profil.
 *   4. Notifications : ABSENT tant qu'aucune notification push n'existe (CLAUDE.md § Notifications : jamais une option
 *      affichée sans effet).
 *   5. Assistant → activé ou non (préférence APPLIQUÉE : aucun appel au modèle si désactivé, ariaPreferences).
 *   6. Confidentialité et données → télécharger un carnet, effacer des données.
 *   7. À propos · Se déconnecter (pas d'« Aide » : aucun écran d'aide n'existe).
 * Retirés au lot 6 : Apparence (fonds d'écran supprimés), ton de l'assistant (lu par rien), langue de la saisie vocale
 * (rien de branché), préférences locales en double (@scolaria:prefs lues désormais par ariaPreferences seul).
 *
 * Espaces enseignant / élève : même écran (route param `espace`), sans les groupes famille.
 */

import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Plus, Users, Trash2, Download, Info, LogOut, Wrench } from 'lucide-react-native';
import { C } from '../constants/design';
import { lirePreferencesAria, enregistrerPreferencesAria, surChangementAria } from '../services/ariaPreferences';
import { useAuth } from '../contexts/AuthContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import { DeepScreenHeader } from '../components/DeepScreenHeader';
import EtatErreur from '../components/EtatErreur';
import { DeepGroup, DeepRow, DeepAvatar } from '../components/DeepList';
import ScolariaSymbol from '../components/ScolariaSymbol';
import { Text } from '../components/ui';
import ChildAvatar from '../components/ChildAvatar';
import { NOM_APP } from '../constants/marque';
import { de } from '../utils/francais';

const NAVY = '#0F172A';
const INDIGO = '#4338CA';
const RED = '#EF4444';
const TEXT55 = 'rgba(15,23,42,0.55)';
const TEXT35 = 'rgba(15,23,42,0.35)';

type Espace = 'famille' | 'enseignant' | 'eleve';

/** « Assistant activé » : la préférence que l'assistant applique réellement (ariaPreferences), suivie en direct. */
function useAssistantActif(): [boolean, (v: boolean) => void] {
  const [actif, setActif] = useState(true);
  useEffect(() => {
    lirePreferencesAria().then((p) => setActif(p.ariaActive));
    return surChangementAria((p) => setActif(p.ariaActive));
  }, []);
  return [actif, (v: boolean) => { setActif(v); enregistrerPreferencesAria({ ariaActive: v }); }];
}

export default function FamilleParametresScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const espace: Espace = route.params?.espace ?? 'famille';
  const isFamille = espace === 'famille';

  const { user, signOut, isDemo, demoDev } = useAuth();
  const { children: childList, selectChild, erreur: erreurEnfants, reloadChildren } = useActiveChild();
  const [assistantActif, setAssistantActif] = useAssistantActif();

  const fullName: string =
    user?.user_metadata?.full_name ?? user?.user_metadata?.family_name ?? (isDemo ? 'Parent démo' : 'Mon compte');
  const email: string = user?.email ?? '';
  const parentInitials = fullName
    .split(' ')
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = () => {
    Alert.alert(
      isDemo ? 'Quitter la démo ?' : 'Se déconnecter ?',
      isDemo ? 'Vous reviendrez à l’écran d’ouverture.' : 'Vous reviendrez à l’écran de connexion.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: isDemo ? 'Quitter' : 'Se déconnecter', style: 'destructive', onPress: () => signOut() },
      ],
    );
  };

  const ouvrirPour = (id: string, ecran: string) => {
    selectChild(id);
    navigation.navigate(ecran);
  };

  return (
    <View style={[st.root, { paddingBottom: insets.bottom }]}>
      <DeepScreenHeader
        title={isFamille ? 'Famille et paramètres' : 'Paramètres'}
        onBack={
          navigation.canGoBack()
            ? () => navigation.goBack()
            : isFamille
              ? () => navigation.navigate('AccueilHome')
              : undefined
        }
        withTopInset
      />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {isDemo && <Text style={st.demoNotice}>Mode démo · les données affichées sont fictives.</Text>}

        {isFamille && (
          <>
            {erreurEnfants ? <EtatErreur type={erreurEnfants} onReessayer={() => reloadChildren()} compact /> : null}
            {/* 1. Mes enfants */}
            <DeepGroup title="Mes enfants" first>
              {childList.map((child) => (
                <DeepRow
                  key={child.id}
                  leading={
                    <View style={{ marginRight: 12 }}>
                      <ChildAvatar child={child} size={32} />
                    </View>
                  }
                  label={child.name.split(' ')[0]}
                  description={child.classe}
                  onPress={() => ouvrirPour(child.id, 'ProfilEnfant')}
                />
              ))}
              <DeepRow
                icon={<Plus size={20} color={INDIGO} strokeWidth={2} />}
                label="Ajouter un enfant"
                accent
                last
                onPress={() => navigation.navigate('AjouterEnfant')}
              />
            </DeepGroup>

            {/* 2. Responsables : un carnet à la fois (écran Autorisations de l'enfant). */}
            {childList.length > 0 && (
              <DeepGroup title="Responsables">
                {childList.map((child, i) => (
                  <DeepRow
                    key={child.id}
                    icon={<Users size={20} color={TEXT55} strokeWidth={2} />}
                    label={`Responsables ${de(child.name.split(' ')[0])}`}
                    description="Inviter, qui voit quoi, me retirer"
                    last={i === childList.length - 1}
                    onPress={() => ouvrirPour(child.id, 'PermissionsRGPD')}
                  />
                ))}
              </DeepGroup>
            )}
          </>
        )}

        {/* 3. Mon profil */}
        <DeepGroup title="Mon profil" first={!isFamille}>
          <DeepRow leading={<DeepAvatar initials={parentInitials} color={NAVY} />} label={fullName} description={email || undefined} last />
        </DeepGroup>

        {isFamille && (
          <>
            {/* 5. Assistant (4. Notifications : absent tant qu'aucune notification n'existe). */}
            <DeepGroup title="Assistant">
              <DeepRow
                icon={<ScolariaSymbol size={18} color={TEXT55} />}
                label="Assistant activé"
                description="Désactivé, il n’envoie plus rien et ne propose plus de suggestion."
                toggle={assistantActif}
                onToggle={setAssistantActif}
                last
              />
            </DeepGroup>

            {/* 6. Confidentialité et données : export et effacement réels (archive .zip ; M25, exécution serveur). */}
            <DeepGroup title="Confidentialité et données">
              <DeepRow
                icon={<Download size={20} color={TEXT55} strokeWidth={2} />}
                label="Télécharger un carnet"
                description="Données, photos et documents, dans une archive"
                onPress={() => navigation.navigate('ExportDonnees')}
              />
              <DeepRow
                icon={<Trash2 size={20} color={TEXT55} strokeWidth={2} />}
                label="Effacer des données"
                description="Un carnet ou votre compte, annulable 30 jours"
                last
                onPress={() => navigation.navigate('Effacement')}
              />
            </DeepGroup>
          </>
        )}

        {/* 7. À propos · se déconnecter */}
        <DeepGroup title="À propos et compte">
          <DeepRow icon={<Info size={20} color={TEXT55} strokeWidth={2} />} label="À propos" onPress={() => navigation.navigate('APropos')} />
          {/* Développement uniquement (__DEV__) : démo SANS déconnecter le compte réel. Retiré du bundle de production. */}
          {__DEV__ && demoDev && !isDemo && (
            <DeepRow
              icon={<Wrench size={20} color={TEXT55} strokeWidth={2} />}
              label="Passer en démo"
              description="Développement : le compte réel reste connecté"
              onPress={demoDev.passer}
            />
          )}
          {__DEV__ && demoDev && isDemo && demoDev.compteReelEnAttente && (
            <DeepRow
              icon={<Wrench size={20} color={TEXT55} strokeWidth={2} />}
              label="Revenir à mon compte"
              description="Développement : retour à la session réelle"
              onPress={demoDev.revenir}
            />
          )}
          <DeepRow
            icon={<LogOut size={20} color={RED} strokeWidth={2} />}
            label={isDemo ? 'Quitter la démo' : 'Se déconnecter'}
            danger
            last
            onPress={handleLogout}
          />
        </DeepGroup>

        <Text style={st.footer}>{`${NOM_APP} · Le carnet de scolarité numérique · Version 1.0.0`}</Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  demoNotice: { fontFamily: FontFamily.sansRegular, fontSize: 12, lineHeight: 16, color: TEXT55, paddingHorizontal: 16, paddingTop: 12 },
  footer: { fontFamily: FontFamily.sansRegular, fontSize: 11, lineHeight: 14, color: TEXT35, textAlign: 'center', paddingTop: 20, paddingHorizontal: 16 },
});
