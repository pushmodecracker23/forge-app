import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

export const darkTheme = {
  bg: '#0E0E0C',
  surface: '#181816',
  surface2: '#222220',
  border: '#2A2A28',
  text: '#F5F4F0',
  muted: '#888880',
  accent: '#FF4D00',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  protein: '#4CAF50',
  carbs: '#FFC107',
  fat: '#2196F3',
  cardRadius: 16,
  isDark: true,
};

export const lightTheme = {
  bg: '#F7F6F3',
  surface: '#FFFFFF',
  surface2: '#F0EEE9',
  border: '#E5E3DC',
  text: '#1A1A18',
  muted: '#6B6960',
  accent: '#FF4D00',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  protein: '#4CAF50',
  carbs: '#FFC107',
  fat: '#2196F3',
  cardRadius: 16,
  isDark: false,
};

export type Theme = typeof darkTheme;

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: darkTheme, toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(colorScheme === 'dark');

  const theme = isDark ? darkTheme : lightTheme;
  const toggleTheme = () => setIsDark((v) => !v);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext).theme;
export const useThemeContext = () => useContext(ThemeContext);
