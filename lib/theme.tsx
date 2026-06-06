import React, { createContext, useContext, useState } from 'react';

export const lightTheme = {
  bg: '#EEF2FF',
  surface: '#FFFFFF',
  surface2: 'rgba(255,255,255,0.85)',
  border: 'rgba(0,0,0,0.08)',
  text: '#1A1A2E',
  muted: '#6B7280',
  accent: '#1A6FFF',
  success: '#00C48C',
  warning: '#FF9800',
  error: '#F44336',
  carbs: '#00D4D4',
  protein: '#FF6B9D',
  fat: '#FFB800',
  blueCard: '#1A6FFF',
  navBg: '#FFFFFF',
  gradientStart: '#1A6FFF',
  gradientEnd: '#7B5EA7',
  cardRadius: 20,
  isDark: false,
};

export const darkTheme = {
  bg: '#0E0E0C',
  surface: '#181816',
  surface2: '#222220',
  border: '#2A2A28',
  text: '#F5F4F0',
  muted: '#888880',
  accent: '#1A6FFF',
  success: '#00C48C',
  warning: '#FF9800',
  error: '#F44336',
  carbs: '#00D4D4',
  protein: '#FF6B9D',
  fat: '#FFB800',
  blueCard: '#1A6FFF',
  navBg: '#181816',
  gradientStart: '#1A6FFF',
  gradientEnd: '#7B5EA7',
  cardRadius: 20,
  isDark: true,
};

export type Theme = typeof lightTheme;

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const theme = isDark ? darkTheme : lightTheme;
  const toggleTheme = () => setIsDark((v) => !v);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext).theme;
export const useThemeContext = () => useContext(ThemeContext);
