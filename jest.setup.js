import 'react-native-gesture-handler/jestSetup';

// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => {
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      getString: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      getAllKeys: jest.fn().mockReturnValue([]),
    })),
  };
});

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///test-directory/',
  cacheDirectory: 'file:///test-cache/',
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  getInfoAsync: jest.fn(),
}));

// Mock expo-sharing
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn(),
}));

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('test-uuid'),
}));

// Mock react-native reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native modules
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

jest.mock('react-native/Libraries/Settings/Settings', () => ({
  get: jest.fn(),
  set: jest.fn(),
  watchKeys: jest.fn(),
  clearWatch: jest.fn(),
}));

// For iOS specific implementation if it's imported
jest.mock('react-native/Libraries/Settings/Settings.ios', () => ({
  get: jest.fn(),
  set: jest.fn(),
  watchKeys: jest.fn(),
  clearWatch: jest.fn(),
}));

// Mock NativeSettingsManager
jest.mock('react-native/Libraries/Settings/NativeSettingsManager', () => ({
  getConstants: () => ({
    settings: {},
  }),
  setValues: jest.fn(),
  deleteValues: jest.fn(),
}), { virtual: true });
