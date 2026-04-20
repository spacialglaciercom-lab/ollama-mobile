import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { readFile, writeFile } from '../../../src/api/gitClient';

// ── Syntax highlighting via regex tokenization ──

type TokenType = 'keyword' | 'string' | 'comment' | 'number' | 'type' | 'function' | 'operator' | 'plain';

interface Token {
  text: string;
  type: TokenType;
}

const KEYWORDS = new Set([
  // JS/TS
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
  'switch', 'case', 'break', 'continue', 'new', 'this', 'class', 'extends', 'import',
  'export', 'default', 'from', 'as', 'type', 'interface', 'enum', 'async', 'await',
  'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'void',
  'null', 'undefined', 'true', 'false', 'static', 'get', 'set', 'super', 'yield',
  // Python
  'def', 'elif', 'pass', 'lambda', 'with', 'raise', 'except', 'global', 'nonlocal',
  'assert', 'del', 'print', 'self', 'None', 'True', 'False', 'and', 'or', 'not',
  'is', 'from', 'import',
  // Rust
  'fn', 'pub', 'mut', 'impl', 'trait', 'struct', 'mod', 'use', 'crate', 'match',
  'loop', 'move', 'ref', 'where', 'unsafe', 'dyn', 'Self',
  // Go
  'go', 'chan', 'select', 'defer', 'range', 'map', 'package',
  // General
  'require', 'module', 'exports',
]);

const TYPE_HINTS = new Set([
  'string', 'number', 'boolean', 'any', 'never', 'unknown', 'object', 'void',
  'Promise', 'Array', 'Record', 'Map', 'Set', 'Date', 'Error', 'RegExp',
  'int', 'float', 'double', 'char', 'byte', 'long', 'short',
  'i32', 'i64', 'u32', 'u64', 'f32', 'f64', 'str', 'Vec', 'Option', 'Result',
  'String', 'bool', 'HashMap',
]);

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    // Whitespace
    if (line[i] === ' ' || line[i] === '\t') {
      let start = i;
      while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i++;
      tokens.push({ text: line.slice(start, i), type: 'plain' });
      continue;
    }

    // Single-line comment
    if (line[i] === '/' && line[i + 1] === '/') {
      tokens.push({ text: line.slice(i), type: 'comment' });
      break;
    }
    if (line[i] === '#') {
      tokens.push({ text: line.slice(i), type: 'comment' });
      break;
    }

    // String
    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const quote = line[i];
      let start = i;
      i++;
      while (i < line.length && line[i] !== quote) {
        if (line[i] === '\\') i++;
        i++;
      }
      if (i < line.length) i++;
      tokens.push({ text: line.slice(start, i), type: 'string' });
      continue;
    }

    // Number
    if (/[0-9]/.test(line[i])) {
      let start = i;
      while (i < line.length && /[0-9.xXa-fA-F]/.test(line[i])) i++;
      tokens.push({ text: line.slice(start, i), type: 'number' });
      continue;
    }

    // Word (keyword / type / identifier)
    if (/[a-zA-Z_$]/.test(line[i])) {
      let start = i;
      while (i < line.length && /[a-zA-Z0-9_$]/.test(line[i])) i++;
      const word = line.slice(start, i);

      // Check if followed by ( → function call
      const nextNonSpace = line.slice(i).trimStart()[0];
      if (nextNonSpace === '(') {
        tokens.push({ text: word, type: 'function' });
      } else if (KEYWORDS.has(word)) {
        tokens.push({ text: word, type: 'keyword' });
      } else if (TYPE_HINTS.has(word) || word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
        tokens.push({ text: word, type: 'type' });
      } else {
        tokens.push({ text: word, type: 'plain' });
      }
      continue;
    }

    // Operator / punctuation
    if (/[+\-*/%=<>!&|^~?:;,.{}()\[\]@]/.test(line[i])) {
      let start = i;
      while (i < line.length && /[+\-*/%=<>!&|^~?:;,.{}()\[\]@]/.test(line[i])) i++;
      tokens.push({ text: line.slice(start, i), type: 'operator' });
      continue;
    }

    // Fallback
    tokens.push({ text: line[i], type: 'plain' });
    i++;
  }

  return tokens;
}

const TOKEN_COLORS: Record<TokenType, string> = {
  keyword: '#ff79c6',
  string: '#f1fa8c',
  comment: '#6272a4',
  number: '#bd93f9',
  type: '#8be9fd',
  function: '#50fa7b',
  operator: '#ff79c6',
  plain: '#f8f8f2',
};

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'TypeScript', tsx: 'TSX', js: 'JavaScript', jsx: 'JSX',
    py: 'Python', rs: 'Rust', go: 'Go', rb: 'Ruby',
    java: 'Java', json: 'JSON', md: 'Markdown', css: 'CSS',
    html: 'HTML', yaml: 'YAML', yml: 'YAML', toml: 'TOML',
    sh: 'Shell', sql: 'SQL', graphql: 'GraphQL', txt: 'Text',
  };
  return map[ext] || ext.toUpperCase();
}

export default function FileEditorScreen() {
  const { id, path: filePath } = useLocalSearchParams<{ id: string; path: string }>();
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      if (!id || !filePath) return;
      try {
        const text = await readFile(id, filePath);
        setContent(text);
        setOriginalContent(text);
      } catch (err: any) {
        setContent('');
        setOriginalContent('');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, filePath]);

  const handleChange = (text: string) => {
    setContent(text);
    setSaved(text === originalContent);
  };

  const handleSave = async () => {
    if (!id || !filePath || saved) return;
    setSaving(true);
    try {
      await writeFile(id, filePath, content);
      setOriginalContent(content);
      setSaved(true);
    } catch (err: any) {
      // Could show error
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = () => {
    setContent(originalContent);
    setSaved(true);
  };

  const fileName = filePath?.split('/').pop() || 'file';
  const lang = getLanguageFromPath(filePath || '');

  // Render highlighted lines
  const lines = content.split('\n');
  const lineCount = lines.length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>&lt; Back</Text>
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <Text style={styles.navTitle} numberOfLines={1}>{fileName}</Text>
          <Text style={styles.navLang}>{lang}</Text>
        </View>
        <View style={styles.navActions}>
          {!saved && (
            <TouchableOpacity style={styles.undoBtn} onPress={handleUndo}>
              <Text style={styles.undoBtnText}>Undo</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.saveBtn, (saved || saving) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saved || saving}
          >
            <Text style={styles.saveBtnText}>{saving ? '...' : saved ? 'Saved' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <View style={styles.editorContainer}>
          {/* Line numbers + highlighted view */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.codeScroll}
            contentContainerStyle={styles.codeContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.codeRow}>
              {/* Line numbers column */}
              <View style={styles.lineNumbers}>
                {lines.map((_, idx) => (
                  <Text key={idx} style={styles.lineNumber}>
                    {idx + 1}
                  </Text>
                ))}
              </View>

              {/* Editable text with syntax highlighting overlay */}
              <View style={styles.codeInputWrap}>
                {/* Highlighted overlay (non-interactive) */}
                <View style={styles.highlightOverlay} pointerEvents="none">
                  {lines.map((line, idx) => (
                    <View key={idx} style={styles.highlightLine}>
                      {tokenizeLine(line).map((token, ti) => (
                        <Text key={ti} style={{ color: TOKEN_COLORS[token.type], fontSize: 13, fontFamily: 'monospace' }}>
                          {token.text}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>

                {/* Invisible TextInput for actual editing */}
                <TextInput
                  style={styles.codeInput}
                  value={content}
                  onChangeText={handleChange}
                  multiline
                  scrollEnabled={false}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="default"
                />
              </View>
            </View>
          </ScrollView>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e0e10' },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(84,84,88,0.65)',
  },
  backBtn: { padding: 4 },
  backBtnText: { color: '#0a84ff', fontSize: 17 },
  navCenter: { flex: 1, alignItems: 'center' },
  navTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  navLang: { color: 'rgba(235,235,245,0.3)', fontSize: 11, marginTop: 1 },
  navActions: { flexDirection: 'row', gap: 8 },
  undoBtn: {
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  undoBtnText: { color: '#ff9f0a', fontSize: 14, fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#30d158',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#000', fontSize: 14, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'rgba(235,235,245,0.3)', fontSize: 16 },
  editorContainer: { flex: 1 },
  codeScroll: { flex: 1 },
  codeContent: { minHeight: '100%' },
  codeRow: { flexDirection: 'row' },
  lineNumbers: {
    width: 44,
    paddingTop: 10,
    paddingBottom: 40,
    paddingHorizontal: 8,
    backgroundColor: '#0a0a0c',
    alignItems: 'flex-end',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(84,84,88,0.3)',
  },
  lineNumber: {
    color: 'rgba(235,235,245,0.15)',
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 20,
    height: 20,
  },
  codeInputWrap: {
    flex: 1,
    position: 'relative',
  },
  highlightOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  highlightLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: 20,
    lineHeight: 20,
  },
  codeInput: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: 'transparent',
    lineHeight: 20,
    paddingTop: 10,
    paddingHorizontal: 8,
    paddingBottom: 40,
    textAlignVertical: 'top',
    minHeight: '100%',
  },
});