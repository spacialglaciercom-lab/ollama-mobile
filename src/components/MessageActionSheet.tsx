import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Clipboard,
  Alert,
} from 'react-native';

interface MessageActionSheetProps {
  visible: boolean;
  onClose: () => void;
  content: string;
  role: 'user' | 'assistant' | 'system';
  onRegenerate?: () => void;
}

export function MessageActionSheet({
  visible,
  onClose,
  content,
  role,
  onRegenerate,
}: MessageActionSheetProps) {
  const handleCopy = () => {
    Clipboard.setString(content);
    onClose();
  };

  const handleRegenerate = () => {
    onClose();
    onRegenerate?.();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.scrim}>
        <TouchableOpacity style={styles.scrimTouch} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle}>
            <View style={styles.handleBar} />
          </View>

          <TouchableOpacity style={styles.actionRow} onPress={handleCopy}>
            <Text style={styles.actionLabel}>Copy</Text>
          </TouchableOpacity>

          <View style={styles.sep} />

          {role === 'assistant' && onRegenerate && (
            <>
              <TouchableOpacity style={styles.actionRow} onPress={handleRegenerate}>
                <Text style={styles.actionLabelAccent}>Regenerate</Text>
              </TouchableOpacity>
              <View style={styles.sep} />
            </>
          )}

          <TouchableOpacity
            style={styles.actionRow}
            onPress={onClose}
          >
            <Text style={styles.actionLabelDanger}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    paddingBottom: 20,
  },
  handle: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#3a3a3c' },
  actionRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  actionLabel: { color: '#fff', fontSize: 20, fontWeight: '600' },
  actionLabelAccent: { color: '#30d158', fontSize: 20, fontWeight: '600' },
  actionLabelDanger: { color: '#ff453a', fontSize: 20, fontWeight: '600' },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(84,84,88,0.65)',
    marginHorizontal: 20,
  },
});