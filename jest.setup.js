// jest.setup.js
import 'react-native-gesture-handler/jestSetup';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  },
}));

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    NavigationContainer: ({ children }) => children,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      removeListener: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
      key: 'test',
      name: 'test',
    }),
    useFocusEffect: jest.fn(),
    useIsFocused: () => true,
  };
});

// Mock @react-navigation/stack - MEJORADO
jest.mock('@react-navigation/stack', () => {
  const React = require('react');
  return {
    createStackNavigator: jest.fn(() => ({
      Navigator: ({ children }) => React.createElement('Navigator', null, children),
      Screen: ({ children }) => React.createElement('Screen', null, children),
    })),
    TransitionPresets: {},
    CardStyleInterpolators: {},
    HeaderStyleInterpolators: {},
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock react-native-linear-gradient
jest.mock('react-native-linear-gradient', () => {
  const { View } = require('react-native');
  return View;
});