/**
 * JulesSettingsSheet
 * UI component for managing Jules provider settings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { useJulesSettingsStore } from '../store/useJulesSettingsStore';
import { ProviderFactoryConfig } from '../api/julesTypes';

interface JulesSettingsSheetProps {
  onClose: () => void;
  onProviderSelected?: (providerId: string) => void;
}

/**
 * JulesSettingsSheet - Manage Jules AI provider configurations
 */
export default function JulesSettingsSheet({
  onClose,
  onProviderSelected,
}: JulesSettingsSheetProps) {
  const {
    providers,
    activeProviderId,
    addProvider,
    removeProvider,
    setActiveProvider,
    testProviderConnection,
    saveApiKey,
    getApiKey,
    setDefaultSource,
    testAllConnections,
    getReadyProviders,
    getConfiguredProviders,
  } = useJulesSettingsStore();

  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderApiKey, setNewProviderApiKey] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  // Load API keys on mount
  useEffect(() => {
    const loadApiKeys = async () => {
      const inputs: Record<string, string> = {};
      for (const provider of providers) {
        const key = await getApiKey(provider.id);
        if (key) {
          inputs[provider.id] = key;
        }
      }
      setApiKeyInputs(inputs);
      setIsLoading(false);
    };
    loadApiKeys();
  }, [providers]);

  // Test all connections on mount
  useEffect(() => {
    if (providers.length > 0) {
      testAllConnections();
    }
  }, []);

  const handleAddProvider = async () => {
    if (!newProviderApiKey.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }

    setIsAdding(true);

    try {
      const config: ProviderFactoryConfig = {
        name: newProviderName.trim() || `Jules Provider ${providers.length + 1}`,
        apiKey: newProviderApiKey.trim(),
      };

      const newProvider = await addProvider(config);
      
      // Save the API key securely
      await saveApiKey(newProvider.id, newProviderApiKey.trim());
      
      // Test the connection
      await testProviderConnection(newProvider.id);

      // Clear inputs
      setNewProviderName('');
      setNewProviderApiKey('');

      Alert.alert('Success', 'Jules provider added successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Error', `Failed to add provider: ${message}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveProvider = async (id: string) => {
    Alert.alert(
      'Remove Provider',
      'Are you sure you want to remove this provider? This will also remove the stored API key.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeProvider(id);
              Alert.alert('Success', 'Provider removed successfully');
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              Alert.alert('Error', `Failed to remove provider: ${message}`);
            }
          },
        },
      ]
    );
  };

  const handleSetActive = (id: string) => {
    setActiveProvider(id);
    onProviderSelected?.(id);
  };

  const handleTestConnection = async (id: string) => {
    setIsTesting(id);
    try {
      await testProviderConnection(id);
      Alert.alert('Success', 'Connection test passed!');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Error', `Connection test failed: ${message}`);
    } finally {
      setIsTesting(null);
    }
  };

  const handleSaveApiKey = async (providerId: string, apiKey: string) => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'API key cannot be empty');
      return;
    }

    try {
      await saveApiKey(providerId, apiKey.trim());
      setApiKeyInputs((prev) => ({ ...prev, [providerId]: apiKey.trim() }));
      await testProviderConnection(providerId);
      Alert.alert('Success', 'API key saved and connection tested!');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Error', `Failed to save API key: ${message}`);
    }
  };

  const toggleShowApiKey = (providerId: string) => {
    setShowApiKey((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }));
  };

  const readyCount = getReadyProviders().length;
  const configuredCount = getConfiguredProviders().length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Jules AI Settings</Text>
        <Text style={styles.subtitle}>
          {readyCount} ready, {configuredCount} configured
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Connection Status Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <View style={styles.statusGrid}>
            <View style={[styles.statusCard, styles.statusCardReady]}>
              <Text style={styles.statusCount}>{readyCount}</Text>
              <Text style={styles.statusLabel}>Ready</Text>
            </View>
            <View style={[styles.statusCard, styles.statusCardConfigured]}>
              <Text style={styles.statusCount}>{configuredCount}</Text>
              <Text style={styles.statusLabel}>Configured</Text>
            </View>
            <View style={[styles.statusCard, styles.statusCardTotal]}>
              <Text style={styles.statusCount}>{providers.length}</Text>
              <Text style={styles.statusLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* Existing Providers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configured Providers</Text>
          
          {providers.length === 0 ? (
            <Text style={styles.emptyText}>No providers configured yet</Text>
          ) : (
            providers.map((provider) => (
              <View key={provider.id} style={styles.providerCard}>
                <View style={styles.providerHeader}>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  <View style={styles.providerBadges}>
                    {activeProviderId === provider.id && (
                      <View style={[styles.badge, styles.badgeActive]}>
                        <Text style={styles.badgeText}>Active</Text>
                      </View>
                    )}
                    {provider.isConfigured && (
                      <View style={[styles.badge, styles.badgeConfigured]}>
                        <Text style={styles.badgeText}>Configured</Text>
                      </View>
                    )}
                    {provider.isConnected && (
                      <View style={[styles.badge, styles.badgeConnected]}>
                        <Text style={styles.badgeText}>Connected</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.providerBody}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>API Key</Text>
                    <View style={styles.apiKeyContainer}>
                      <TextInput
                        style={styles.input}
                        value={apiKeyInputs[provider.id] || ''}
                        onChangeText={(text) =>
                          setApiKeyInputs((prev) => ({ ...prev, [provider.id]: text }))
                        }
                        placeholder="Enter API key..."
                        placeholderTextColor="#666"
                        secureTextEntry={!showApiKey[provider.id]}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => toggleShowApiKey(provider.id)}
                      >
                        <Text style={styles.eyeIconText}>
                          {showApiKey[provider.id] ? '👁️' : '🔒'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Button
                      title={isTesting === provider.id ? 'Testing...' : 'Save & Test'}
                      onPress={() => handleSaveApiKey(provider.id, apiKeyInputs[provider.id] || '')}
                      disabled={isTesting === provider.id}
                    />
                  </View>

                  {provider.defaultSourceId && (
                    <View style={styles.defaultInfo}>
                      <Text style={styles.defaultInfoLabel}>Default Source:</Text>
                      <Text style={styles.defaultInfoValue}>{provider.defaultSourceId}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.providerActions}>
                  {activeProviderId !== provider.id ? (
                    <Button
                      title="Set Active"
                      onPress={() => handleSetActive(provider.id)}
                    />
                  ) : null}
                  <Button
                    title={isTesting === provider.id ? 'Testing...' : 'Test Connection'}
                    onPress={() => handleTestConnection(provider.id)}
                    disabled={isTesting === provider.id}
                  />
                  <Button
                    title="Remove"
                    onPress={() => handleRemoveProvider(provider.id)}
                    color="#ff453a"
                  />
                </View>
              </View>
            ))
          )}
        </View>

        {/* Add New Provider */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add New Provider</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Provider Name (optional)</Text>
            <TextInput
              style={styles.input}
              value={newProviderName}
              onChangeText={setNewProviderName}
              placeholder="My Jules Provider"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>API Key *</Text>
            <TextInput
              style={styles.input}
              value={newProviderApiKey}
              onChangeText={setNewProviderApiKey}
              placeholder="JULES_API_KEY"
              placeholderTextColor="#666"
              secureTextEntry={true}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Button
            title={isAdding ? 'Adding...' : 'Add Provider'}
            onPress={handleAddProvider}
            disabled={isAdding || !newProviderApiKey.trim()}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Close" onPress={onClose} color="#888" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  
  // Status Cards
  statusGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statusCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusCardReady: {
    backgroundColor: '#003300',
  },
  statusCardConfigured: {
    backgroundColor: '#333300',
  },
  statusCardTotal: {
    backgroundColor: '#333333',
  },
  statusCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusLabel: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  },
  
  // Empty state
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  
  // Provider Cards
  providerCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  providerBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    color: '#fff',
  },
  badgeActive: {
    backgroundColor: '#007AFF',
  },
  badgeConfigured: {
    backgroundColor: '#FF9500',
  },
  badgeConnected: {
    backgroundColor: '#34C759',
  },
  
  providerBody: {
    marginBottom: 12,
  },
  
  // Inputs
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#000',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 16,
  },
  apiKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
  },
  eyeIconText: {
    fontSize: 18,
  },
  
  // Default Info
  defaultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  defaultInfoLabel: {
    fontSize: 12,
    color: '#888',
    marginRight: 8,
  },
  defaultInfoValue: {
    fontSize: 12,
    color: '#34C759',
  },
  
  // Actions
  providerActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  
  // Footer
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#333',
  },
});
