/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ThemePalette {
  id: string;
  name: string;
  primary: string;         // Main brand/button color
  primaryHover: string;    // Darker/richer hover state
  lightBg: string;         // Light tint for chips, badges, selections
  darkText: string;        // High contrast text in dark mode
  circleSecondary: string; // Secondary shade for Chrome-style two-tone circle
  badgeBg: string;         // Translucent tint
}

export const THEME_PALETTES: ThemePalette[] = [
  {
    id: 'indigo',
    name: 'Classic Iris',
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    lightBg: '#eef2ff',
    darkText: '#818cf8',
    circleSecondary: '#c7d2fe',
    badgeBg: 'rgba(99, 102, 241, 0.12)',
  },
  {
    id: 'chrome-blue',
    name: 'Chrome Blue',
    primary: '#1a73e8',
    primaryHover: '#1557b0',
    lightBg: '#e8f0fe',
    darkText: '#8ab4f8',
    circleSecondary: '#aecbfa',
    badgeBg: 'rgba(26, 115, 232, 0.12)',
  },
  {
    id: 'teal',
    name: 'Oceanic Teal',
    primary: '#00838f',
    primaryHover: '#006064',
    lightBg: '#e0f7fa',
    darkText: '#4dd0e1',
    circleSecondary: '#80deea',
    badgeBg: 'rgba(0, 131, 143, 0.12)',
  },
  {
    id: 'emerald',
    name: 'Emerald Sage',
    primary: '#0f9d58',
    primaryHover: '#0b8043',
    lightBg: '#e6f4ea',
    darkText: '#6ee7b7',
    circleSecondary: '#a8dab5',
    badgeBg: 'rgba(15, 157, 88, 0.12)',
  },
  {
    id: 'sunset-rose',
    name: 'Sunset Rose',
    primary: '#e11d48',
    primaryHover: '#be123c',
    lightBg: '#ffe4e6',
    darkText: '#fda4af',
    circleSecondary: '#fecdd3',
    badgeBg: 'rgba(225, 29, 72, 0.12)',
  },
  {
    id: 'amber-honey',
    name: 'Warm Amber',
    primary: '#d97706',
    primaryHover: '#b45309',
    lightBg: '#fef3c7',
    darkText: '#fcd34d',
    circleSecondary: '#fde68a',
    badgeBg: 'rgba(217, 119, 6, 0.12)',
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    primary: '#8b5cf6',
    primaryHover: '#7c3aed',
    lightBg: '#ede9fe',
    darkText: '#c4b5fd',
    circleSecondary: '#ddd6fe',
    badgeBg: 'rgba(139, 92, 246, 0.12)',
  },
  {
    id: 'magenta',
    name: 'Chrome Berry',
    primary: '#c026d3',
    primaryHover: '#a21caf',
    lightBg: '#fae8ff',
    darkText: '#f0abfc',
    circleSecondary: '#f5d0fe',
    badgeBg: 'rgba(192, 38, 211, 0.12)',
  },
  {
    id: 'cyber-cyan',
    name: 'Electric Cyan',
    primary: '#0891b2',
    primaryHover: '#0e7490',
    lightBg: '#ecfeff',
    darkText: '#67e8f9',
    circleSecondary: '#a5f3fc',
    badgeBg: 'rgba(8, 145, 178, 0.12)',
  },
  {
    id: 'tangerine',
    name: 'Sunburst Orange',
    primary: '#ea580c',
    primaryHover: '#c2410c',
    lightBg: '#ffedd5',
    darkText: '#fdba74',
    circleSecondary: '#fed7aa',
    badgeBg: 'rgba(234, 88, 12, 0.12)',
  },
  {
    id: 'carbon',
    name: 'Carbon Slate',
    primary: '#475569',
    primaryHover: '#334155',
    lightBg: '#f1f5f9',
    darkText: '#94a3b8',
    circleSecondary: '#cbd5e1',
    badgeBg: 'rgba(71, 85, 105, 0.12)',
  },
];

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

export function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const adjust = (c: number) => Math.min(255, Math.max(0, Math.round(c * (1 + percent / 100))));
  const r = adjust(rgb.r).toString(16).padStart(2, '0');
  const g = adjust(rgb.g).toString(16).padStart(2, '0');
  const b = adjust(rgb.b).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function getCustomTheme(customColor: string): ThemePalette {
  const primary = customColor.startsWith('#') ? customColor : `#${customColor}`;
  const rgb = hexToRgb(primary) || { r: 99, g: 102, b: 241 };
  
  return {
    id: 'custom',
    name: 'Custom Profile Color',
    primary,
    primaryHover: adjustBrightness(primary, -15),
    lightBg: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`,
    darkText: adjustBrightness(primary, 35),
    circleSecondary: adjustBrightness(primary, 45),
    badgeBg: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
  };
}

export function resolveTheme(themeId: string, customColor?: string): ThemePalette {
  if (themeId === 'custom' && customColor) {
    return getCustomTheme(customColor);
  }
  const found = THEME_PALETTES.find(p => p.id === themeId);
  return found || THEME_PALETTES[0];
}
