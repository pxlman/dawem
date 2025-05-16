/**
 * Calculates the relative luminance of a color
 * Based on WCAG 2.0 formula for perceived brightness
 * @param color - Hex color code (with or without # prefix)
 * @returns number between 0 (darkest) and 1 (brightest)
 */
function getLuminance(color: string): number {
  // Remove # if present
  const hex = color.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  // Calculate luminance using perceived brightness formula
  // R*0.299 + G*0.587 + B*0.114
  return r * 0.299 + g * 0.587 + b * 0.114;
}

/**
 * Determines whether black or white text should be used on a given background color
 * for best readability
 * @param backgroundColor - Background color as hex string (with or without # prefix)
 * @returns '#000000' for black or '#FFFFFF' for white
 */
export function getTextColorForBackground(backgroundColor: string): string {
  const luminance = getLuminance(backgroundColor);
  
  // Use white text on dark backgrounds, black text on light backgrounds
  // Threshold of 0.5 is commonly used, but can be adjusted
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Convenience function that returns 'black' or 'white' as color name
 * @param backgroundColor - Background color as hex string
 * @returns 'black' or 'white'
 */
export function getTextColorName(backgroundColor: string): string {
  return getTextColorForBackground(backgroundColor) === '#000000' ? 'black' : 'white';
}
