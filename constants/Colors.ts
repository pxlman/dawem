// constants/Colors.ts

// Define theme types
export type ThemeType = 'light' | 'dark';

// Define color palette interface
export interface ColorPalette {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  error: string;
  green: string;
  red: string;
  blue: string;
  buff: string;
  grey: string;
  lightGrey: string;
  darkGrey: string;
  heatmapLevel0: string;
  heatmapLevel1: string;
  heatmapLevel2: string;
  heatmapLevel3: string;
  heatmapLevel4: string;
}

// Define themes
const themes: Record<ThemeType, ColorPalette> = {
  dark: {
    primary: '#BB86FC', // A lighter purple for primary actions on dark background
    accent: '#03DAC5',  // Teal accent remains vibrant
    background: '#121212', // Very dark grey, near black
    surface: '#1e1e1e',  // Slightly lighter dark grey for cards, headers, tabs
    text: '#E1E1E1',    // Light grey/off-white for primary text
    textSecondary: '#A0A0A0', // Dimmer grey for secondary text
    error: '#CF6679',    // Material Design dark theme error color
  
    // Status/Specific Colors (keep vibrant or adjust contrast)
    green: '#4CAF50',    // Keep green
    red: '#F44336',      // Keep red
    blue: '#2196F3',     // Keep blue
    buff: '#DAA06D',     // Gold color for exceeding targets
  
    // Greys for Borders / Disabled states etc.
    grey: '#333333',       // A noticeable dark grey for borders/dividers
    lightGrey: '#2c2c2c',   // Used maybe for subtle backgrounds if needed, close to surface
    darkGrey: '#888888',    // For potentially disabled text or icons
  
    // Heatmap Colors (Adjusted for Dark Background)
    heatmapLevel0: '#2d2d2d', // Darker grey than surface for 'none'
    heatmapLevel1: '#0e4429', // Darker Green shades
    heatmapLevel2: '#006d32',
    heatmapLevel3: '#26a641',
    heatmapLevel4: '#39d353', // Brightest Green
  },
  light: {
    primary: '#6200EE', // Deep purple for primary actions
    accent: '#03DAC6',  // Teal accent color
    background: '#FFFFFF', // White background
    surface: '#F5F5F5',  // Light grey for cards, headers, tabs
    text: '#212121',    // Near black for primary text
    textSecondary: '#757575', // Medium grey for secondary text
    error: '#B00020',    // Material Design light theme error color
  
    // Status/Specific Colors
    green: '#4CAF50',    
    red: '#F44336',      
    blue: '#2196F3',     
    buff: '#DAA06D',     // Gold color for exceeding targets
  
    // Greys for Borders / Disabled states etc.
    grey: '#BDBDBD',       // Medium grey for borders/dividers
    lightGrey: '#E0E0E0',   // Light grey for subtle backgrounds
    darkGrey: '#9E9E9E',    // Darker grey for disabled text or icons
  
    // Heatmap Colors
    heatmapLevel0: '#EBEDF0', // Light grey for 'none'
    heatmapLevel1: '#9BE9A8', // Lightest green
    heatmapLevel2: '#40C463', 
    heatmapLevel3: '#30A14E',
    heatmapLevel4: '#216E39', // Darkest green
  }
};

// Default theme
let currentTheme: ThemeType = 'dark';

// Helper to get current theme colors
const getColors = (): ColorPalette => {
  return themes[currentTheme];
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
  '#BB86FC', '#03DAC5', '#4CAF50', '#F44336',
  '#2196F3', '#FF9800', '#9C27B0', '#00BCD4',
  '#8BC34A', '#FF5722', '#3F51B5', '#FFC107',
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