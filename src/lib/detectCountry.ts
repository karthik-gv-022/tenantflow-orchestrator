import { countryCodes } from '@/components/auth/CountryCodeSelector';

// Map of locale/region codes to country dial codes
const localeToCountryCode: Record<string, string> = {
  // India
  'en-IN': '+91',
  'hi': '+91',
  'hi-IN': '+91',
  // United States
  'en-US': '+1',
  // United Kingdom
  'en-GB': '+44',
  // Australia
  'en-AU': '+61',
  // China
  'zh': '+86',
  'zh-CN': '+86',
  'zh-Hans': '+86',
  // Japan
  'ja': '+81',
  'ja-JP': '+81',
  // Germany
  'de': '+49',
  'de-DE': '+49',
  // France
  'fr': '+33',
  'fr-FR': '+33',
  // UAE
  'ar-AE': '+971',
  // Singapore
  'en-SG': '+65',
  // Malaysia
  'ms': '+60',
  'ms-MY': '+60',
  // Saudi Arabia
  'ar-SA': '+966',
  // South Africa
  'en-ZA': '+27',
  // Brazil
  'pt-BR': '+55',
  // Mexico
  'es-MX': '+52',
  // South Korea
  'ko': '+82',
  'ko-KR': '+82',
  // Italy
  'it': '+39',
  'it-IT': '+39',
  // Spain
  'es': '+34',
  'es-ES': '+34',
  // Netherlands
  'nl': '+31',
  'nl-NL': '+31',
  // Russia
  'ru': '+7',
  'ru-RU': '+7',
};

export function detectCountryCode(): string {
  const defaultCode = '+91'; // Default to India
  
  try {
    // Get browser languages (ordered by preference)
    const languages = navigator.languages || [navigator.language];
    
    for (const lang of languages) {
      // Try exact match first
      if (localeToCountryCode[lang]) {
        const code = localeToCountryCode[lang];
        // Verify it exists in our supported list
        if (countryCodes.some(c => c.code === code)) {
          return code;
        }
      }
      
      // Try with region code extracted (e.g., "en-US" -> check for US patterns)
      const parts = lang.split('-');
      if (parts.length > 1) {
        const region = parts[1].toUpperCase();
        // Find by matching region in the locale keys
        for (const [locale, code] of Object.entries(localeToCountryCode)) {
          if (locale.toUpperCase().endsWith(region)) {
            if (countryCodes.some(c => c.code === code)) {
              return code;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error detecting country:', error);
  }
  
  return defaultCode;
}
