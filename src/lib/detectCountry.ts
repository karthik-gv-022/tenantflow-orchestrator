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
  // Always default to India for this application
  return '+91';
}
