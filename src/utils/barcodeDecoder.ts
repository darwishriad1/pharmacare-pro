/**
 * Barcode Decoder & Normalization Utility
 * Supports 1D barcodes (EAN-13, EAN-8, UPC, Code 128, Code 39)
 * and 2D Pharmaceutical GS1 DataMatrix with Application Identifiers (GTIN, Expiry, Batch, Serial).
 * Handles Arabic keyboard layout transliteration and Arabic/Eastern numerals normalization.
 */

import { Product } from '../types';

// Arabic numerals to standard Latin digits mapping
const ARABIC_INDIC_DIGITS: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
  // Eastern Persian digits
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
};

// Arabic standard keyboard layout to standard QWERTY key mapping
// Used when an external hardware scanner types into a system with active Arabic keyboard layout
const ARABIC_KEYBOARD_TO_LATIN: Record<string, string> = {
  'ض': 'q', 'ص': 'w', 'ث': 'e', 'ق': 'r', 'ف': 't', 'غ': 'y', 'ع': 'u', 'ه': 'i', 'خ': 'o', 'ح': 'p',
  'ج': '[', 'د': ']', 'ش': 'a', 'س': 's', 'ي': 'd', 'ب': 'f', 'ل': 'g', 'ا': 'h', 'ت': 'j', 'ن': 'k',
  'م': 'l', 'ك': ';', 'ط': "'", 'ئ': 'z', 'ء': 'x', 'ؤ': 'c', 'ر': 'v', 'لا': 'b', 'ى': 'n', 'ة': 'm',
  'و': ',', 'ز': '.', 'ظ': '/', 'ذ': '`',
  // Shift variants
  'ِ': 'A', 'ٍ': 'S', ']': 'D', '[': 'F', 'لأ': 'G', 'أ': 'H', 'ـ': 'J', '،': 'K', '/': 'L',
  '؟': '?', 'ْ': 'X', 'ّ': '~', 'آ': 'N'
};

export interface DecodedBarcodeResult {
  raw: string;
  normalizedCode: string;
  format: 'EAN-13' | 'EAN-8' | 'UPC-A' | 'UPC-E' | 'GS1-DataMatrix' | 'Code-128' | 'Code-39' | 'QR' | 'Custom';
  isGS1: boolean;
  gtin?: string;
  expiryDate?: string; // YYYY-MM-DD
  batchNumber?: string;
  serialNumber?: string;
  cleanSearchQuery: string;
  matchedProduct?: Product;
}

export interface BarcodeScannerSettings {
  enabled: boolean;
  minBarcodeLength: number;
  maxKeyIntervalMs: number; // Max delay between keystrokes to consider it hardware scan (e.g. 50-70ms)
  autoConvertArabicLayout: boolean;
  enableGS1DataMatrix: boolean;
  enableSoundFeedback: boolean;
  autoIncrementQuantity: boolean;
  repeatScanCooldownMs: number;
  scannerSuffix: 'enter' | 'tab' | 'timeout' | 'any';
  customPrefix?: string;
  preventInputPollution: boolean;
}

export const DEFAULT_SCANNER_SETTINGS: BarcodeScannerSettings = {
  enabled: true,
  minBarcodeLength: 3,
  maxKeyIntervalMs: 65,
  autoConvertArabicLayout: true,
  enableGS1DataMatrix: true,
  enableSoundFeedback: true,
  autoIncrementQuantity: true,
  repeatScanCooldownMs: 2500,
  scannerSuffix: 'enter',
  customPrefix: '',
  preventInputPollution: true,
};

/**
 * Normalizes any Arabic/Eastern digits to standard ASCII 0-9 digits
 */
export function normalizeArabicDigits(str: string): string {
  if (!str) return '';
  return str.replace(/[٠-٩۰-۹]/g, (char) => ARABIC_INDIC_DIGITS[char] || char);
}

/**
 * Transliterates Arabic keyboard characters back to standard Latin characters
 * if the user scanned an alphanumeric barcode with Arabic keyboard layout active.
 */
export function transliterateArabicKeyboard(str: string): string {
  if (!str) return '';
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    // Check two-char combos like 'لا'
    if (char === 'ل' && i + 1 < str.length && str[i + 1] === 'ا') {
      result += 'b';
      i++;
      continue;
    }
    if (ARABIC_INDIC_DIGITS[char]) {
      result += ARABIC_INDIC_DIGITS[char];
    } else if (ARABIC_KEYBOARD_TO_LATIN[char]) {
      result += ARABIC_KEYBOARD_TO_LATIN[char];
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Strips hardware scanner non-printable control headers/trailers (STX, ETX, CR, LF, GS, etc.)
 */
export function cleanRawBarcode(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^[\x00-\x1F\x7F]+|[\x00-\x1F\x7F]+$/g, '') // strip leading/trailing control chars
    .trim();
}

/**
 * Parses 2D GS1 DataMatrix strings with standard Application Identifiers (AIs)
 * e.g., (01)06281086000000(17)260531(10)LOT1234(21)SN9876
 * or 01062810860000001726053110LOT1234\x1d21SN9876
 */
export function parseGS1DataMatrix(rawStr: string): Partial<DecodedBarcodeResult> | null {
  const clean = cleanRawBarcode(rawStr);
  if (!clean || clean.length < 16) return null;

  let gtin: string | undefined;
  let expiryDate: string | undefined;
  let batchNumber: string | undefined;
  let serialNumber: string | undefined;

  // Case A: Bracketed AIs like (01)06281086000000(17)260531(10)BATCH123
  if (clean.includes('(01)') || (clean.startsWith('(') && clean.includes(')'))) {
    const gtinMatch = clean.match(/\(01\)(\d{14}|\d{12}|\d{13})/);
    if (gtinMatch) gtin = gtinMatch[1];

    const expMatch = clean.match(/\(17\)(\d{6})/);
    if (expMatch) {
      const yy = expMatch[1].substring(0, 2);
      const mm = expMatch[1].substring(2, 4);
      const dd = expMatch[1].substring(4, 6);
      const fullYear = parseInt(yy, 10) > 50 ? `19${yy}` : `20${yy}`;
      const safeDay = dd === '00' ? '28' : dd;
      expiryDate = `${fullYear}-${mm}-${safeDay}`;
    }

    const batchMatch = clean.match(/\(10\)([^\(\)\x1d]+)/);
    if (batchMatch) batchNumber = batchMatch[1].trim();

    const serialMatch = clean.match(/\(21\)([^\(\)\x1d]+)/);
    if (serialMatch) serialNumber = serialMatch[1].trim();

    if (gtin) {
      return {
        format: 'GS1-DataMatrix',
        isGS1: true,
        gtin,
        expiryDate,
        batchNumber,
        serialNumber,
        normalizedCode: gtin,
      };
    }
  }

  // Case B: Continuous GS1 AI string starting with 01 + 14 digit GTIN
  // Example: 01062810860000001726123110LOT99
  if (clean.startsWith('01') && clean.length >= 16) {
    const candidateGtin = clean.substring(2, 16);
    if (/^\d{14}$/.test(candidateGtin)) {
      gtin = candidateGtin;
      let remaining = clean.substring(16);

      // Check if (17) expiry follows immediately
      if (remaining.startsWith('17') && remaining.length >= 8) {
        const dateStr = remaining.substring(2, 8);
        if (/^\d{6}$/.test(dateStr)) {
          const yy = dateStr.substring(0, 2);
          const mm = dateStr.substring(2, 4);
          const dd = dateStr.substring(4, 6);
          const fullYear = parseInt(yy, 10) > 50 ? `19${yy}` : `20${yy}`;
          const safeDay = dd === '00' ? '28' : dd;
          expiryDate = `${fullYear}-${mm}-${safeDay}`;
          remaining = remaining.substring(8);
        }
      }

      // Check if (10) batch number follows
      if (remaining.startsWith('10') && remaining.length > 2) {
        const batchPart = remaining.substring(2);
        // If there is a group separator \x1d or AI (21)
        const parts = batchPart.split(/\x1d|21/);
        batchNumber = parts[0].trim();
        if (parts.length > 1 && parts[1]) {
          serialNumber = parts[1].trim();
        }
      }

      return {
        format: 'GS1-DataMatrix',
        isGS1: true,
        gtin,
        expiryDate,
        batchNumber,
        serialNumber,
        normalizedCode: gtin,
      };
    }
  }

  return null;
}

/**
 * Detects 1D / 2D format heuristic
 */
export function detectBarcodeFormat(code: string): DecodedBarcodeResult['format'] {
  if (!code) return 'Custom';
  if (/^\d{13}$/.test(code)) return 'EAN-13';
  if (/^\d{8}$/.test(code)) return 'EAN-8';
  if (/^\d{12}$/.test(code)) return 'UPC-A';
  if (/^\d{6}$/.test(code)) return 'UPC-E';
  if (/^\d{14}$/.test(code)) return 'GS1-DataMatrix';
  if (/^[A-Za-z0-9\-\.\ \$\/\+\%]+$/.test(code)) return 'Code-128';
  return 'Custom';
}

/**
 * Full decoding pipeline:
 * Takes raw scanner input, cleans control codes, normalizes Arabic layout/digits,
 * checks for GS1 DataMatrix, and produces a clean query.
 */
export function decodeBarcodeInput(
  rawInput: string,
  customSettings?: Partial<BarcodeScannerSettings>
): DecodedBarcodeResult {
  const settings: BarcodeScannerSettings = {
    ...DEFAULT_SCANNER_SETTINGS,
    ...(customSettings || {}),
  };
  let processed = cleanRawBarcode(rawInput);

  // If custom prefix defined, remove it
  if (settings.customPrefix && processed.startsWith(settings.customPrefix)) {
    processed = processed.substring(settings.customPrefix.length);
  }

  // 1. Arabic transliteration and digit normalization
  if (settings.autoConvertArabicLayout) {
    processed = transliterateArabicKeyboard(processed);
  }
  processed = normalizeArabicDigits(processed);

  // 2. Check GS1 2D DataMatrix if enabled
  if (settings.enableGS1DataMatrix) {
    const gs1Result = parseGS1DataMatrix(processed);
    if (gs1Result && gs1Result.gtin) {
      return {
        raw: rawInput,
        normalizedCode: gs1Result.gtin,
        format: 'GS1-DataMatrix',
        isGS1: true,
        gtin: gs1Result.gtin,
        expiryDate: gs1Result.expiryDate,
        batchNumber: gs1Result.batchNumber,
        serialNumber: gs1Result.serialNumber,
        cleanSearchQuery: gs1Result.gtin,
      };
    }
  }

  // 3. Standard 1D / 2D Barcode
  const format = detectBarcodeFormat(processed);
  return {
    raw: rawInput,
    normalizedCode: processed,
    format,
    isGS1: false,
    cleanSearchQuery: processed,
  };
}

/**
 * Searches and matches a product from the database using the decoded barcode.
 * Supports:
 * - Exact barcode match
 * - Strip leading zero GTIN-14 match (e.g. 06281086000000 -> 6281086000000)
 * - Leading zeros padding for 12/13 digits
 * - Sub-unit or batch barcode match
 */
export function findProductByBarcode(
  decoded: DecodedBarcodeResult,
  products: Product[]
): Product | undefined {
  const query = decoded.normalizedCode.trim().toLowerCase();
  if (!query) return undefined;

  // 1. Exact barcode match
  let found = products.find((p) => p.barcode.trim().toLowerCase() === query);
  if (found) return found;

  // 2. If 14-digit GTIN with leading zeros (e.g. 0628...), try without leading zero (13 or 12 digits)
  if (query.startsWith('0') && query.length === 14) {
    const stripped13 = query.replace(/^0+/, '');
    found = products.find(
      (p) => p.barcode.trim().toLowerCase() === stripped13 || p.barcode.trim().toLowerCase().endsWith(stripped13)
    );
    if (found) return found;
  }

  // 3. Check if standard barcode with leading zero added matches a 14-digit GTIN
  const padded14 = query.padStart(14, '0');
  found = products.find((p) => p.barcode.trim().padStart(14, '0') === padded14);
  if (found) return found;

  // 4. Product ID / code match fallback
  found = products.find((p) => p.id.toLowerCase() === query);
  if (found) return found;

  return undefined;
}

/**
 * Plays a pleasant high-frequency beep for successful scan confirmation
 */
export function playScannerBeep(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, ctx.currentTime); // A6 (crystal clear chime)
    osc.frequency.exponentialRampToValueAtTime(2640, ctx.currentTime + 0.08); // E7

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 200);
  } catch (e) {
    // Audio context not allowed or unsupported
  }
}

/**
 * Plays a low-frequency double buzz for scan error or unregistered product
 */
export function playScannerErrorBeep(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, ctx.currentTime);
    osc.frequency.setValueAtTime(220, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.22);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 300);
  } catch (e) {
    // Audio context not allowed or unsupported
  }
}

