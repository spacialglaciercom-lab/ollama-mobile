import React, { useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useModelStore } from '../../src/store/useModelStore';
import { useServerStore } from '../../src/store/useServerStore';

export default function ModelsScreen() {
  const { models, selectedModel, loading, error, fetchModels, selectModel } =
    useModelStore();
  const activeServer = useServerStore((s) => s.getActiveServer());

  useEffect(() => {
    if (activeServer) {
      fetchModels();
    }
  }, [activeServer?.id]);

  const formatSize = (bytes: number) => {
    if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)}TB`;
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)}GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)}MB`;
    return `${bytes}B`;
  };

  const renderModel = ({ item }: { item: (typeof models)[0] }) => (
    <TouchableOpacity
      style={[
        styles.modelCard,
        selectedModel === item.name && styles.modelCardSelected,
      ]}
      onPress={() => selectModel(item.name)}
      activeOpacity={0.7}
    >
      <View style={styles.modelInfo}>
        <Text style={styles.modelName}>{item.name}</Text>
        <View style={styles.modelMeta}>
          {item.parameter_size && (
            <Text style={styles.modelMetaText}>{item.parameter_size}</Text>
          )}
          {item.quantization_level && (
            <Text style={styles.modelMetaText}>{item.quantization_level}</Text>
          )}
          {item.size > 0 && (
            <Text style={styles.modelMetaText}>{formatSize(item.size)}</Text>
          )}
        </View>
      </View>
      {selectedModel === item.name && (
        <View style={styles.selectedDot} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Models</Text>
        {activeServer && (
          <Text style={styles.serverLabel}>{activeServer.name}</Text>
        )}
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#8B5CF6" />
      ) : (
        <FlatList
          data={models}
          keyExtractor={(item) => item.name}
          renderItem={renderModel}
          contentContainerStyle={models.length === 0 ? styles.emptyList : undefined}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchModels}
              tintColor="#8B5CF6"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No models found</Text>
              <Text style={styles.emptySubtext}>
                Make sure your Ollama server is running
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '700' },
  serverLabel: { color: '#888', fontSize: 14 },
  modelCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modelCardSelected: {
    borderColor: '#8B5CF6',
    borderWidth: 1,
  },
  modelInfo: { flex: 1 },
  modelName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modelMeta: { flexDirection: 'row', marginTop: 4, gap: 8 },
  modelMetaText: {
    color: '#888',
    fontSize: 12,
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8B5CF6',
  },
  errorBanner: {
    backgroundColor: '#3a1a1a',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
  },
  errorText: { color: '#f87171', fontSize: 14 },
  loader: { flex: 1 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center' },
  emptyText: { color: '#666', fontSize: 18 },
  emptySubtext: { color: '#444', fontSize: 14, marginTop: 4 },
});