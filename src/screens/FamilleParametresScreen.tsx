/**
 * FamilleParametresScreen — écran unique « Famille & paramètres », ouvert par ☰.
 *
 * Remplace l'ancien panneau burger, ReglagesScreen et « Mon compte » (EditProfile).
 * Page profonde (COMPONENTS §8) : fond #F2F1EE, groupes blancs, rows simples, aucune glass card.
 *
 * Espaces enseignant / élève : même écran (route param `espace`), sans les sections famille.
 *
 * N'affiche que ce qui fonctionne : pas de code de déverrouillage ni de retour haptique
 * (aucune implémentation dans l'app), pas d'aide (aucun écran).
 */

import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChevronRight,
  Plus,
  Image as ImageIcon,
  Bell,
  Clock,
  Moon,
  Mic,
  Shield,
  FileText,
  Download,
  Trash2,
  Info,
  LogOut,
} from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { getChildInitials } from '../utils/childInitials';
import { FontFamily } from '../hooks/useSolariaFonts';
import { DeepScreenHeader } from '../components/DeepScreenHeader';
import ScolariaSymbol from '../components/ScolariaSymbol';
import { Text, Pressable } from '../components/ui';

// ─── Tokens (COMPONENTS §8) ────────────────────────────
const NAVY = '#0F172A';
const INDIGO = '#4338CA';
const RED = '#EF4444';
const TEXT55 = 'rgba(15,23,42,0.55)';
const TEXT35 = 'rgba(15,23,42,0.35)';
const BORDER_L = 'rgba(15,23,42,0.05)';
const GROUP_GAP_BG = 'rgba(15,23,42,0.04)';
const BG = '#F2F1EE';
/** Indigo neutre en attendant l'affichage de child.color (Phase B, lot B2). */
const CHILD_AVATAR_BG = INDIGO;

type Espace = 'famille' | 'enseignant' | 'eleve';

// ─── Préférences locales ───────────────────────────────
// Enregistrées sur l'appareil ; appliquées quand les notifications push et les réglages
// d'Aria côté serveur existeront.
const PREFS_KEY = '@scolaria:prefs';

type Prefs = {
  notifMotsMessages: boolean;
  notifResume18h: boolean;
  notifSilence: boolean;
  ariaActive: boolean;
  ariaTon: string;
};

const DEFAULT_PREFS: Prefs = {
  notifMotsMessages: true,
  notifResume18h: true,
  notifSilence: true,
  ariaActive: true,
  ariaTon: 'Calme',
};

const ARIA_TONS = ['Calme', 'Concis', 'Encourageant', 'Détaillé'];

function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => {
        if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
      })
      .catch(() => {});
  }, []);

  const update = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { prefs, update };
}

// ─── Briques ───────────────────────────────────────────

function Group({ title, children, first }: { title: string; children: React.ReactNode; first?: boolean }) {
  return (
    <>
      {!first && <View style={st.groupGap} />}
      <Text style={st.groupTitle}>{title}</Text>
      <View style={st.group}>{children}</View>
    </>
  );
}

interface RowProps {
  icon?: React.ReactNode;
  leading?: React.ReactNode;
  label: string;
  description?: string;
  value?: string;
  last?: boolean;
  danger?: boolean;
  accent?: boolean;
  toggle?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
}

function Row({ icon, leading, label, description, value, last, danger, accent, toggle, onToggle, onPress }: RowProps) {
  const isToggle = toggle !== undefined;
  const content = (
    <>
      {leading ?? (icon ? <View style={st.rowIcon}>{icon}</View> : null)}
      <View style={st.rowText}>
        <Text
          style={[st.rowLabel, danger && { color: RED }, accent && { color: INDIGO }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {description ? <Text style={st.rowDescription} numberOfLines={2}>{description}</Text> : null}
      </View>
      {value !== undefined && <Text style={st.rowValue} numberOfLines={1}>{value}</Text>}
      {isToggle ? (
        <Switch
          value={toggle}
          onValueChange={onToggle}
          trackColor={{ false: 'rgba(15,23,42,0.18)', true: INDIGO }}
          thumbColor="#FFFFFF"
          accessibilityLabel={label}
        />
      ) : onPress && !danger ? (
        <ChevronRight size={16} color={TEXT35} strokeWidth={2} />
      ) : null}
    </>
  );

  const rowStyle = [st.row, !last && st.rowBorder];
  if (isToggle) {
    return (
      <Pressable style={rowStyle} onPress={() => onToggle?.(!toggle)} accessibilityRole="switch">
        {content}
      </Pressable>
    );
  }
  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [...rowStyle, pressed && st.rowPressed]}
        onPress={onPress}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }
  return <View style={rowStyle}>{content}</View>;
}

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <View style={[st.avatar, { backgroundColor: color }]}>
      <Text style={st.avatarText}>{initials}</Text>
    </View>
  );
}

// ─── Écran ─────────────────────────────────────────────

export default function FamilleParametresScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const espace: Espace = route.params?.espace ?? 'famille';
  const isFamille = espace === 'famille';

  const { user, signOut, isDemo } = useAuth();
  const { children: childList, selectChild } = useActiveChild();
  const { prefs, update } = usePrefs();

  const siblingNames = childList.map((c) => c.name);
  const fullName: string =
    user?.user_metadata?.full_name ?? user?.user_metadata?.family_name ?? (isDemo ? 'Parent démo' : 'Mon compte');
  const email: string = user?.email ?? '';
  const parentInitials = fullName
    .split(' ')
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const prenomsEnfants = childList.map((c) => c.name.split(' ')[0]).join(', ');

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

  const openChild = (id: string) => {
    selectChild(id);
    navigation.navigate('ProfilEnfant');
  };

  return (
    <View style={[st.root, { paddingBottom: insets.bottom }]}>
      <DeepScreenHeader
        title={isFamille ? 'Famille & paramètres' : 'Paramètres'}
        onBack={
          navigation.canGoBack()
            ? () => navigation.goBack()
            : isFamille
              ? () => navigation.navigate('AccueilHome')
              : undefined
        }
        withTopInset
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {isDemo && (
          <Text style={st.demoNotice}>Mode démo · les données affichées sont fictives.</Text>
        )}

        {isFamille && (
          <>
            <Group title="Mes enfants" first>
              {childList.map((child) => (
                <Row
                  key={child.id}
                  leading={
                    <Avatar initials={getChildInitials(child.name, siblingNames)} color={CHILD_AVATAR_BG} />
                  }
                  label={child.name.split(' ')[0]}
                  description={child.classe}
                  onPress={() => openChild(child.id)}
                />
              ))}
              <Row
                icon={<Plus size={20} color={INDIGO} strokeWidth={2} />}
                label="Ajouter un enfant"
                accent
                last
                onPress={() => navigation.navigate('AjouterEnfant')}
              />
            </Group>

            <Group title="Responsables légaux">
              <Row
                leading={<Avatar initials={parentInitials} color={NAVY} />}
                label={`${fullName} (vous)`}
                description={prenomsEnfants ? `Responsable de ${prenomsEnfants}` : undefined}
                last
              />
            </Group>
          </>
        )}

        <Group title="Mon profil" first={!isFamille}>
          <Row
            leading={<Avatar initials={parentInitials} color={NAVY} />}
            label={fullName}
            description={email || undefined}
            last
          />
        </Group>

        {isFamille && (
          <Group title="Apparence">
            <Row
              icon={<ImageIcon size={20} color={TEXT55} strokeWidth={2} />}
              label="Fond de l’Accueil"
              last
              onPress={() => navigation.navigate('WallpaperPicker')}
            />
          </Group>
        )}

        <Group title="Notifications">
          <Row
            icon={<Bell size={20} color={TEXT55} strokeWidth={2} />}
            label="Mots et messages"
            description="Mots à signer, messages de l’enseignant et de la direction"
            toggle={prefs.notifMotsMessages}
            onToggle={(v) => update('notifMotsMessages', v)}
          />
          <Row
            icon={<Clock size={20} color={TEXT55} strokeWidth={2} />}
            label="Résumé à 18h"
            description="Photos, annonces et informations en une seule notification"
            toggle={prefs.notifResume18h}
            onToggle={(v) => update('notifResume18h', v)}
          />
          <Row
            icon={<Moon size={20} color={TEXT55} strokeWidth={2} />}
            label="Silence de 20h à 7h"
            description="Sauf urgence de l’école"
            toggle={prefs.notifSilence}
            onToggle={(v) => update('notifSilence', v)}
            last
          />
        </Group>

        {isFamille && (
          <Group title="Aria">
            <Row
              icon={<ScolariaSymbol size={18} color={TEXT55} />}
              label="Aria activée"
              toggle={prefs.ariaActive}
              onToggle={(v) => update('ariaActive', v)}
            />
            <View style={[st.tonesBlock, st.rowBorder]}>
              <Text style={st.rowLabel}>Personnalité</Text>
              <Text style={st.rowDescription}>Le ton qu’Aria utilise avec vous.</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={st.tones}
              >
                {ARIA_TONS.map((ton, idx) => {
                  const active = prefs.ariaTon === ton;
                  return (
                    <Pressable
                      key={ton}
                      onPress={() => update('ariaTon', ton)}
                      style={[st.tonePill, active && st.tonePillActive, idx < ARIA_TONS.length - 1 && st.tonePillMargin]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[st.tonePillText, active && st.tonePillTextActive]}>{ton}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
            <Row
              icon={<Mic size={20} color={TEXT55} strokeWidth={2} />}
              label="Langue de la saisie vocale"
              value="Français"
              last
            />
          </Group>
        )}

        <Group title="Confidentialité & données">
          <Row
            icon={<Shield size={20} color={TEXT55} strokeWidth={2} />}
            label="Autorisations"
            onPress={() => navigation.navigate('PermissionsRGPD')}
          />
          <Row
            icon={<FileText size={20} color={TEXT55} strokeWidth={2} />}
            label="Journal d’accès"
            onPress={() => navigation.navigate('JournalAcces')}
          />
          <Row
            icon={<Download size={20} color={TEXT55} strokeWidth={2} />}
            label="Exporter mes données"
            onPress={() => navigation.navigate('ExportDonnees')}
          />
          <Row
            icon={<Trash2 size={20} color={TEXT55} strokeWidth={2} />}
            label="Droit à l’effacement"
            last
            onPress={() => navigation.navigate('Effacement')}
          />
        </Group>

        <Group title="Compte">
          <Row
            icon={<Info size={20} color={TEXT55} strokeWidth={2} />}
            label="À propos"
            onPress={() => navigation.navigate('APropos')}
          />
          <Row
            icon={<LogOut size={20} color={RED} strokeWidth={2} />}
            label={isDemo ? 'Quitter la démo' : 'Se déconnecter'}
            danger
            last
            onPress={handleLogout}
          />
        </Group>

        <Text style={st.footer}>Scolaria · Le carnet de scolarité numérique · Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────

const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  demoNotice: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    lineHeight: 16,
    color: TEXT55,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  groupGap: {
    height: 8,
    backgroundColor: GROUP_GAP_BG,
    marginTop: 8,
  },
  groupTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    lineHeight: 14,
    color: TEXT55,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  group: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER_L,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    backgroundColor: '#FFFFFF',
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER_L,
  },
  rowPressed: {
    backgroundColor: 'rgba(15,23,42,0.04)',
  },
  rowIcon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  rowLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    color: NAVY,
  },
  rowDescription: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    lineHeight: 14,
    color: TEXT55,
    marginTop: 1,
  },
  rowValue: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: TEXT55,
    marginRight: 6,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  tonesBlock: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  tones: {
    flexDirection: 'row',
    marginTop: 10,
  },
  tonePill: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tonePillMargin: {
    marginRight: 6,
  },
  tonePillActive: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  tonePillText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: TEXT55,
  },
  tonePillTextActive: {
    color: '#FFFFFF',
  },
  footer: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    lineHeight: 14,
    color: TEXT35,
    textAlign: 'center',
    paddingTop: 20,
    paddingHorizontal: 16,
  },
});
