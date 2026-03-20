import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';

export default function AccueilScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue sur Scolaria</Text>
      <Text style={styles.subtitle}>Votre passeport scolaire numérique</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.blueNight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.cyan,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray,
  },
});
