// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => {
  return {
    MMKV: jest.fn().mockImplementation(() => {
      return {
        set: jest.fn(),
        getString: jest.fn(),
        getNumber: jest.fn(),
        getBoolean: jest.fn(),
        delete: jest.fn(),
        getAllKeys: jest.fn().mockReturnValue([]),
        clearAll: jest.fn(),
      };
    }),
  };
});

// Mock expo-secure-store
jest.mock('expo-secure-store', () => {
  return {
    setItemAsync: jest.fn().mockResolvedValue(null),
    getItemAsync: jest.fn().mockResolvedValue(null),
    deleteItemAsync: jest.fn().mockResolvedValue(null),
  };
});

// Mock expo-sqlite
jest.mock('expo-sqlite', () => {
  return {
    openDatabaseAsync: jest.fn().mockResolvedValue({
      execAsync: jest.fn().mockResolvedValue(null),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn().mockResolvedValue(null),
    }),
  };
});

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));
