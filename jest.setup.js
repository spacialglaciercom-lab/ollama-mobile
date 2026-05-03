jest.mock('react-native-mmkv', () => {
  return {
    MMKV: jest.fn().mockImplementation(() => {
      return {
        getString: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
      };
    }),
  };
});
