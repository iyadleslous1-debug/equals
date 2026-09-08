/* global jest */
/** Jest stub: font loading is native-only; icons render as placeholders in tests. */
module.exports = {
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
  isLoading: jest.fn(() => false),
  unloadAsync: jest.fn(() => Promise.resolve()),
  useFonts: jest.fn(() => [true, null]),
};
