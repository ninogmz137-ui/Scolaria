/**
 * MotDetailScreen — Detail view for a mot du cahier de liaison.
 * Shows content + sign button for unsigned mots.
 */

import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, Check } from 'lucide-react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';

export default function MotDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const insets = useSafeAreaInsets();
  const { title = 'Mot', signed: initialSigned = false, deadline } = route.params ?? {};
  const [signed, setSigned] = useState(initialSigned);

  const handleSign = () => {
    Alert.alert(
      'Signer ce mot',
      `Confirmez-vous la signature de "${title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Signer',
          onPress: () => {
            setSigned(true);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.content, { paddingTop: insets.top + 70 }]}>
        <View style={styles.iconCircle}>
          <FileText size={28} color="#FF8C42" strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>{title}</Text>

        {deadline && !signed && (
          <Text style={styles.deadline}>À signer avant le {deadline}</Text>
        )}

        <View style={styles.card}>
          <Text style={styles.cardText}>
            Chers parents, nous vous informons de l'organisation de cet événement.
            Merci de bien vouloir signer ce mot pour confirmer que vous en avez pris connaissance.
          </Text>
        </View>

        {signed ? (
          <View style={styles.signedBadge}>
            <Check size={16} color="#10B981" strokeWidth={2.5} />
            <Text style={styles.signedText}>Signé</Text>
          </View>
        ) : (
          <Pressable
            onPress={handleSign}
            style={({ pressed }) => [styles.signButton, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.signButtonText}>Signer ce mot</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 12,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF8C4215',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 20,
    color: '#0F172A',
    textAlign: 'center',
  },
  deadline: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: '#F59E0B',
  },
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    width: '100%',
    marginTop: 8,
  },
  cardText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
  signButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 16,
  },
  signButtonText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  signedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B98115',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 16,
  },
  signedText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#10B981',
  },
});
