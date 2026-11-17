/**
 * FilMessagesScreen — un fil (tous les échanges avec un même interlocuteur), page profonde (lot 3a).
 * Mêmes données que la liste (useFilsMessages) ; chaque élément s'ouvre comme avant.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeepScreenHeader } from '../../components/DeepScreenHeader';
import LigneMessage from '../../components/messages/LigneMessage';
import { C } from '../../constants/design';
import { useFilsMessages } from '../../hooks/useFilsMessages';

export default function FilMessagesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { fils } = useFilsMessages();
  const fil = fils.find((x) => x.cle === route.params?.cle);
  const elements = fil?.elements ?? [];
  return (
    <View style={st.racine}>
      <DeepScreenHeader title={fil?.titre ?? route.params?.titre ?? ''} onBack={() => navigation.goBack()} withTopInset />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {elements.map((e, i) => (
          <LigneMessage key={e.cle} {...e.props} separateur={i < elements.length - 1} />
        ))}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({ racine: { flex: 1, backgroundColor: C.bg } });
