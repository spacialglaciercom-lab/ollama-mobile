import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';

import { useJulesSettingsStore } from '../store/useJulesSettingsStore';
import { useProviderStore } from '../store/useProviderStore';

export function JulesDebugger() {
  const { providers, testAllConnections } = useJulesSettingsStore();
  const activeProvider = useProviderStore((s) => s.getActiveProvider());

  const handleTest = async () => {
    const results = await testAllConnections();
    const allOk = Object.values(results).every((v) => v);
    Alert.alert(
      'Connection Test',
      allOk ? 'All connections successful' : 'Some connections failed'
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Jules Debugger</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Provider</Text>
        <Text style={styles.text}>Name: {activeProvider?.name || 'None'}</Text>
        <Text style={styles.text}>Type: {activeProvider?.type || 'None'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Jules Providers</Text>
        <Text style={styles.text}>Count: {providers.length}</Text>
        {providers.map((p) => (
          <Text key={p.id} style={styles.text}>
            - {p.name} ({p.isConnected ? 'Connected' : 'Disconnected'})
          </Text>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleTest}>
        <Text style={styles.buttonText}>Test Connections</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#000' },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  section: { marginBottom: 16, padding: 12, backgroundColor: '#1c1c1e', borderRadius: 8 },
  sectionTitle: { color: '#30d158', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  text: { color: '#fff', fontSize: 14, marginBottom: 4 },
  button: { backgroundColor: '#30d158', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#000', fontWeight: 'bold' },
});
