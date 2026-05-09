import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import ConnectScreen from './src/screens/ConnectScreen';
import FeedScreen from './src/screens/FeedScreen';
import DiffScreen from './src/screens/DiffScreen';
import type { ChangeEvent } from './src/types';

export type RootStackParamList = {
  Connect: undefined;
  Feed: { url: string };
  Diff: { event: ChangeEvent };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Connect"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#0F172A' },
          }}
        >
          <Stack.Screen name="Connect" component={ConnectScreen} />
          <Stack.Screen name="Feed" component={FeedScreen} />
          <Stack.Screen name="Diff" component={DiffScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
