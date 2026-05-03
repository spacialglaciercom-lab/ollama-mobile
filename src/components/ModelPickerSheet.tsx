import React, { useState } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { useModelStore } from '../store/useModelStore';
import { useServerStore } from '../store/useServerStore';
import { ModelPullSheet } from './ModelPullSheet';

interface ModelPickerSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ModelPickerSheet({ visible, onClose }: ModelPickerSheetProps) {
  const { models, selectedModel, selectModel, fetchModels, loading } = useModelStore();
  const server = useServerStore(state => state.getActiveServer());
  const [showPull, setShowPull] = useState(false);

  const handleSelect = (name: string) => {
    selectModel(name);
    onClose();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '';
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)}GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)}MB`;
    return '';
  };

  return (
    <>
      <Modal visible={visible && !showPull} animationType="slide" transparent>
        <View style={styles.scrim}>
          <TouchableOpacity style={styles.scrimTouch} onPress={onClose} />
          <View style={styles.sheet}>
            <View style={styles.handle}>
              <View style={styles.handleBar} />
            </View>
            <View style={styles.sheetNav}>
              <Text style={styles.sheetTitle}>Model</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.sheetDone}>Done</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={models}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modelRow}
                  onPress={() => handleSelect(item.name)}
                >
                  <View style={styles.modelDot}>
                    {selectedModel === item.name && (
                      <View style={styles.modelDotInner} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.modelName,
                      selectedModel === item.name && styles.modelNameActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text style={styles.modelSize}>{formatSize(item.size)}</Text>
                </TouchableOpacity>
              )}
              refreshing={loading}
              onRefresh={fetchModels}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    {loading ? 'Loading...' : 'No models found'}
                  </Text>
                </View>
              }
            />

            {server?.type !== 'zeroclaw' && (
              <TouchableOpacity
                style={styles.pullBtn}
                onPress={() => setShowPull(true)}
              >
                <Text style={styles.pullBtnText}>Pull new model</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <ModelPullSheet
        visible={showPull}
        onClose={() => setShowPull(false)}
        onComplete={() => {
          fetchModels();
          setShowPull(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scrimTouch: { flex: 1 },
  sheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '55%',
  },
  handle: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#3a3a3c' },
  sheetNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(84,84,88,0.65)',
  },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  sheetDone: { color: '#0a84ff', fontSize: 17 },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(84,84,88,0.65)',
  },
  modelDot: { width: 20, alignItems: 'center', justifyContent: 'center' },
  modelDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#30d158' },
  modelName: { flex: 1, fontSize: 17, color: 'rgba(235,235,245,0.8)' },
  modelNameActive: { color: '#fff', fontWeight: '500' },
  modelSize: { fontSize: 15, color: 'rgba(235,235,245,0.3)' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: 'rgba(235,235,245,0.3)', fontSize: 17 },
  pullBtn: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: 'rgba(48,209,88,0.12)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(48,209,88,0.3)',
  },
  pullBtnText: { color: '#30d158', fontSize: 15, fontWeight: '600' },
});
