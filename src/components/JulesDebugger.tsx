import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert } from 'react-native';

import { createSession, getSources } from '../api/julesApiService';

interface JulesDebuggerProps {
  apiKey: string;
}

/**
 * JulesDebugger - A simple debug component for testing Jules AI API integration
 *
 * Usage:
 * <JulesDebugger apiKey="your-jules-api-key" />
 */
export default function JulesDebugger({ apiKey }: JulesDebuggerProps) {
  const [sources, setSources] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [prompt, setPrompt] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [title, setTitle] = useState('');
  const [startingBranch, setStartingBranch] = useState('main');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message]);
  };

  const handleFetchSources = async () => {
    if (!apiKey) {
      Alert.alert('Error', 'Please provide a Jules API key');
      return;
    }

    setIsLoading(true);
    addLog('Fetching sources...');

    try {
      const sourceList = await getSources(apiKey);
      const sourceNames = sourceList.map((s: { name?: string; id: string }) => s.name || s.id);
      setSources(sourceNames);
      addLog(`Found ${sourceNames.length} sources: ${sourceNames.join(', ')}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`Error fetching sources: ${errorMessage}`);
      Alert.alert('Error', `Failed to fetch sources: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!apiKey) {
      Alert.alert('Error', 'Please provide a Jules API key');
      return;
    }
    if (!selectedSource) {
      Alert.alert('Error', 'Please select a source');
      return;
    }
    if (!prompt) {
      Alert.alert('Error', 'Please enter a prompt');
      return;
    }

    setIsLoading(true);
    addLog(`Creating session for source: ${selectedSource}`);

    try {
      const response = await createSession(
        apiKey,
        selectedSource,
        prompt,
        startingBranch || undefined,
        title || undefined
      );

      const newSessionId = response.session?.id || '';
      setSessionId(newSessionId);
      addLog(`Session created: ${newSessionId}`);
      addLog(`Session title: ${response.session?.title || 'Untitled'}`);
      addLog(`Session state: ${response.session?.state || 'unknown'}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`Error creating session: ${errorMessage}`);
      Alert.alert('Error', `Failed to create session: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Jules AI Debugger</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuration</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Starting Branch</Text>
          <TextInput
            style={styles.input}
            value={startingBranch}
            onChangeText={setStartingBranch}
            placeholder="main"
            placeholderTextColor="#666"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Session Title (optional)</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="My Jules Session"
            placeholderTextColor="#666"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sources</Text>
        <Button
          title={isLoading ? 'Loading...' : 'Fetch Sources'}
          onPress={handleFetchSources}
          disabled={isLoading}
        />

        {sources.length > 0 && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Source</Text>
            <View style={styles.pickerContainer}>
              <Text
                style={[
                  styles.pickerText,
                  selectedSource ? styles.pickerTextSelected : styles.pickerTextEmpty,
                ]}
              >
                {selectedSource || 'Select a source...'}
              </Text>
            </View>
            <ScrollView style={styles.sourceList} nestedScrollEnabled>
              {sources.map((source) => (
                <Button
                  key={source}
                  title={source}
                  onPress={() => setSelectedSource(source)}
                  color={selectedSource === source ? '#007AFF' : '#888'}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create Session</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Prompt</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="What would you like Jules to do?"
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
          />
        </View>
        <Button
          title={isLoading ? 'Creating...' : 'Create Session'}
          onPress={handleCreateSession}
          disabled={isLoading || !selectedSource || !prompt}
        />
      </View>

      {sessionId ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Result</Text>
          <Text style={styles.sessionId} selectable>
            Session ID: {sessionId}
          </Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Logs</Text>
        <View style={styles.logContainer}>
          {logs.length === 0 ? (
            <Text style={styles.logEmpty}>No logs yet</Text>
          ) : (
            logs.map((log, index) => (
              <Text key={index} style={styles.logEntry}>
                {log}
              </Text>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#1c1c1e',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#1c1c1e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  pickerText: {
    fontSize: 16,
  },
  pickerTextEmpty: {
    color: '#666',
  },
  pickerTextSelected: {
    color: '#fff',
  },
  sourceList: {
    maxHeight: 150,
  },
  sessionId: {
    color: '#00ff00',
    fontSize: 14,
    fontFamily: 'monospace',
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 8,
  },
  logContainer: {
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  logEmpty: {
    color: '#666',
    fontStyle: 'italic',
  },
  logEntry: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});
