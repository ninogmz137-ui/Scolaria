import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';

export default function AriaScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aria</Text>
      <Text style={styles.subtitle}>Votre assistant scolaire intelligent</Text>
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
