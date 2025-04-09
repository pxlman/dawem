// constants/Colors.ts

// Dark Theme Palette
export default {
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