import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';

interface ModelPickerProps {
  models: string[];
  selectedModel: string | null;
  onSelect: (name: string) => void;
  visible: boolean;
  onClose: () => void;
}

export function ModelPicker({
  models,
  selectedModel,
  onSelect,
  visible,
  onClose,
}: ModelPickerProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Select Model</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={models}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modelItem,
                  item === selectedModel && styles.modelItemSelected,
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.modelItemText,
                    item === selectedModel && styles.modelItemTextSelected,
                  ]}
                >
                  {item}
                </Text>
                {item === selectedModel && (
                  <Text style={styles.checkMark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomColor: '#2a2a2a',
    borderBottomWidth: 1,
  },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  closeText: { color: '#8B5CF6', fontSize: 16 },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomColor: '#2a2a2a',
    borderBottomWidth: 1,
  },
  modelItemSelected: { backgroundColor: '#2a1a4a' },
  modelItemText: { color: '#ccc', fontSize: 16 },
  modelItemTextSelected: { color: '#fff', fontWeight: '600' },
  checkMark: { color: '#8B5CF6', fontSize: 18 },
});