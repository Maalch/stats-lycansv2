/**
 * Theme-aware color utilities for Lycans Stats
 * Automatically adjusts colors for better contrast in light/dark themes
 */

import { useState, useEffect } from 'react';

// Utility to detect if user prefers dark theme
export function getIsDarkTheme(): boolean {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Utility to convert hex to HSL
function hexToHsl(hex: string): [number, number, number] {
  // Remove # if present and handle alpha
  const cleanHex = hex.replace('#', '').slice(0, 6);
  
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

// Utility to convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Colors that need adjustment for light theme (too light)
const LIGHT_THEME_ADJUSTMENTS: Record<string, { lightness: number; saturation?: number }> = {
  '#fbff00': { lightness: 40, saturation: 90 }, // Chasseur - make much darker and less saturated
  '#54D90F': { lightness: 35 }, // Vert pomme - make darker
  '#FFED00': { lightness: 45, saturation: 90 }, // Jaune - make darker and less saturated
  '#00FFFF': { lightness: 40 }, // Cyan - make darker
};

// Colors that need adjustment for dark theme (too dark)
const DARK_THEME_ADJUSTMENTS: Record<string, { lightness: number; saturation?: number }> = {
  '#800080': { lightness: 65 }, // Agent & Chasseur de primes - make lighter
  '#00FFFF': { lightness: 40 }, // Cyan - make darker
  '#FFED00': { lightness: 45 }, // Jaune - make darker 
  "#0012A6": { lightness: 40 }, // Bleu foncé - make lighter
};

/**
 * Adjusts a color for better visibility in the current theme
 * @param color - Original color (hex format)
 * @returns Theme-adjusted color
 */
export function getThemeAdjustedColor(color: string): string {
  const isDark = getIsDarkTheme();
  const normalizedColor = color.toLowerCase().replace('#', '').slice(0, 6);
  
  // Check if this color needs adjustment
  let adjustments: Record<string, { lightness: number; saturation?: number }>;
  
  if (isDark) {
    adjustments = DARK_THEME_ADJUSTMENTS;
  } else {
    adjustments = LIGHT_THEME_ADJUSTMENTS;
  }
  
  // Find matching color (case insensitive, with/without #)
  const matchingKey = Object.keys(adjustments).find(key => {
    const normalizedKey = key.toLowerCase().replace('#', '');
    return normalizedKey === normalizedColor;
  });
  
  if (!matchingKey) {
    return color; // No adjustment needed
  }
  
  const adjustment = adjustments[matchingKey];
  const [h, s] = hexToHsl(color);
  
  // Apply adjustments
  const newLightness = adjustment.lightness;
  const newSaturation = adjustment.saturation !== undefined ? adjustment.saturation : s;
  
  return hslToHex(h, newSaturation, newLightness);
}

/**
 * Gets theme-adjusted colors for the lycans color scheme
 * @param originalColors - Original color scheme object
 * @returns Theme-adjusted color scheme
 */
export function getThemeAdjustedLycansColors<T extends Record<string, string>>(
  originalColors: T
): T {
  const adjustedColors = {} as T;
  
  for (const [key, color] of Object.entries(originalColors)) {
    adjustedColors[key as keyof T] = getThemeAdjustedColor(color) as T[keyof T];
  }
  
  return adjustedColors;
}

/**
 * Hook to reactively get theme-adjusted colors that updates when theme changes
 * @param originalColors - Original color scheme object
 * @returns Theme-adjusted color scheme that updates on theme change
 */
export function useThemeAdjustedColors<T extends Record<string, string>>(
  originalColors: T
): T {
  const [adjustedColors, setAdjustedColors] = useState<T>(() => 
    getThemeAdjustedLycansColors(originalColors)
  );
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleThemeChange = () => {
      setAdjustedColors(getThemeAdjustedLycansColors(originalColors));
    };
    
    // Update colors when theme changes
    mediaQuery.addEventListener('change', handleThemeChange);
    
    // Initial update
    handleThemeChange();
    
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, [originalColors]);
  
  return adjustedColors;
}