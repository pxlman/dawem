// constants/Colors.ts

// Define theme types
export type ThemeType = 'light' | 'dark' | 'browny' | 'fresh' | 'night';

// Define color palette interface
export interface ColorPalette {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  error: string;
  special: string;
  green: string;
  red: string;
  blue: string;
  buff: string;
  grey: string;
  lightGrey: string;
  darkGrey: string;
  // heatmapLevel0: string;
  // heatmapLevel1: string;
  // heatmapLevel2: string;
  // heatmapLevel3: string;
  // heatmapLevel4: string;
}

export interface MainPalette {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
}

// Define themes
const themes: Record<string, MainPalette> = {
  dark: {
    primary: '#BB86FC', // A lighter purple for primary actions on dark background
    accent: '#03DAC5',  // Teal accent remains vibrant
    background: '#121212', // Very dark grey, near black
    surface: '#1e1e1e',  // Slightly lighter dark grey for cards, headers, tabs
    text: '#E1E1E1',    // Light grey/off-white for primary text
    textSecondary: '#A0A0A0', // Dimmer grey for secondary text
  },
  light: {
    primary: '#6200EE', // Deep purple for primary actions
    accent: '#03DAC6',  // Teal accent color
    background: '#FFFFFF', // White background
    surface: '#F5F5F5',  // Light grey for cards, headers, tabs
    text: '#212121',    // Near black for primary text
    textSecondary: '#757575', // Medium grey for secondary text
  },
  browny: {
    primary: "#e3caa2",         // ⬅️ Lighter buff – improved visibility on dark bg
    accent: "#E4F6DF",          // Soft pale beige – hover/active
    background: "#1e1a17",      // Deep dark brown – main app background
    surface: "#2a2420",         // Slightly lifted card background
    text: "#fefaf3",            // Creamy white – high contrast
    textSecondary: "#c8bba4",   // Light muted beige – for secondary info
  }, 
  fresh: {
    primary: "#e2f0d9",         // ⬅️ Lighter buff – improved visibility on dark bg
    accent: "#7fc8a9",          // Soft pale beige – hover/active
    background: "#1e2a23",      // Deep dark brown – main app background
    surface: "#2e3b32",         // Slightly lifted card background
    text: "#e2f0d9",            // Creamy white – high contrast
    textSecondary: "#b0c4b1",   // Light muted beige – for secondary info
  },
  night: {
    primary: "#ffffff",         // ⬅️ Lighter buff – improved visibility on dark bg
    accent: "#64b5f6",          // Soft pale beige – hover/active
    background: "#121212",      // Deep dark brown – main app background
    surface: "#1f1f1f",         // Slightly lifted card background
    text: "#ffffff",            // Creamy white – high contrast
    textSecondary: "#b0bec5",   // Light muted beige – for secondary info
  },
};
const needed = {
    error: '#B00020',    // Material Design light theme error color
    special: '#DAA06D',     // Gold color for exceeding targets
  
    // Status/Specific Colors
    green: '#4CAF50',    
    red: '#ff3b30',      
    blue: '#2196F3',     
    buff: '#DAA06D',     // Gold color for exceeding targets
  
    // Greys for Borders / Disabled states etc.
    grey: '#BDBDBD',       // Medium grey for borders/dividers
    lightGrey: '#E0E0E0',   // Light grey for subtle backgrounds
    darkGrey: '#9E9E9E',    // Darker grey for disabled text or icons
}

// Default theme
let currentTheme: ThemeType = 'night';

// Helper to get current theme colors
const getColors = (): ColorPalette => {
  return {
    ...themes[currentTheme],
    ...needed
  };
};

// Function to change theme
export const setTheme = (theme: ThemeType) => {
  currentTheme = theme;
};

// Function to get current theme
export const getTheme = (): ThemeType => {
  return currentTheme;
};

// Fixed color palette for habits
export const fixedColors = [
  "#27ae60", // Leaf Green - Health & Fitness
  "#3498db", // Sky Blue - Calm & Focus
  "#f1c40f", // Sunshine Yellow - Energy & Routine
  "#2980b9", // Royal Blue - Learning & Study
  "#9b59b6", // Soft Purple - Deep Work & Creativity
  "#1abc9c", // Teal - Creative & Wellness
  "#f39c12", // Peach - Gratitude & Reflection
  "#e91e63", // Blush Pink - Self-Care
  "#e67e22", // Warm Orange - Home & Productivity
  "#e74c3c", // Red Coral - Social & Connection
  "#95a5a6", // Cool Gray - Neutral/General
  "#34495e", // Indigo - Review & Nighttime
].sort((a, b) => {
  // Sort colors by hue
  const hexToHsl = (hex: string): { h: number } => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex[1] + hex[2], 16);
      g = parseInt(hex[3] + hex[4], 16);
      b = parseInt(hex[5] + hex[6], 16);
    }
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
      const d = max - min;
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360 };
  };
  return hexToHsl(a).h - hexToHsl(b).h;
});

// Export current theme colors as default
export default getColors();