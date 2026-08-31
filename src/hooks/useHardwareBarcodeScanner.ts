import { useEffect, useRef, useState, useCallback } from 'react';
import { Product, UnitType } from '../types';
import {
  decodeBarcodeInput,
  findProductByBarcode,
  BarcodeScannerSettings,
  DEFAULT_SCANNER_SETTINGS,
  DecodedBarcodeResult,
} from '../utils/barcodeDecoder';
import { usePOSStore } from '../stores/usePOSStore';
import { useSettingsStore } from '../stores/useSettingsStore';

interface UseHardwareBarcodeScannerOptions {
  activeUnit: UnitType;
  products: Product[];
  enabled?: boolean;
  onProductScanned?: (product: Product, decoded: DecodedBarcodeResult, wasIncremented: boolean) => void;
  onUnrecognizedBarcode?: (decoded: DecodedBarcodeResult) => void;
  onScanRawKeystroke?: (char: string, intervalMs: number) => void;
}

export function useHardwareBarcodeScanner({
  activeUnit,
  products,
  enabled = true,
  onProductScanned,
  onUnrecognizedBarcode,
  onScanRawKeystroke,
}: UseHardwareBarcodeScannerOptions) {
  const { cart, addItem, updateItemQuantity, playBeep } = usePOSStore();
  const { settings } = useSettingsStore();

  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedResult, setLastScannedResult] = useState<DecodedBarcodeResult | null>(null);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [scanSpeedAvg, setScanSpeedAvg] = useState<number>(0);

  // Scanner settings resolved from pharmacy settings or defaults
  const scannerConfig: BarcodeScannerSettings = {
    ...DEFAULT_SCANNER_SETTINGS,
    ...(settings.barcodeScannerSettings || {}),
    enabled: enabled && (settings.barcodeScannerSettings?.enabled ?? true),
  };

  const bufferRef = useRef<string>('');
  const keyTimestampsRef = useRef<number[]>([]);
  const lastKeyTimeRef = useRef<number>(0);
  const timeoutIdRef = useRef<any>(null);
  const lastScannedProductIdRef = useRef<{ id: string; timestamp: number }>({ id: '', timestamp: 0 });

  // Process completed barcode buffer
  const processBarcodeBuffer = useCallback(
    (rawString: string) => {
      if (!rawString || rawString.trim().length < scannerConfig.minBarcodeLength) {
        bufferRef.current = '';
        keyTimestampsRef.current = [];
        return;
      }

      // Calculate keystroke speed statistics
      const timestamps = keyTimestampsRef.current;
      if (timestamps.length > 1) {
        let totalInterval = 0;
        for (let i = 1; i < timestamps.length; i++) {
          totalInterval += timestamps[i] - timestamps[i - 1];
        }
        const avgSpeed = Math.round(totalInterval / (timestamps.length - 1));
        setScanSpeedAvg(avgSpeed);
      }

      const decoded = decodeBarcodeInput(rawString, scannerConfig);
      setLastScannedResult(decoded);
      setLastScanTime(Date.now());
      setIsScanning(true);
      setTimeout(() => setIsScanning(false), 600);

      // Search in products database
      const matchedProduct = findProductByBarcode(decoded, products);

      if (matchedProduct) {
        decoded.matchedProduct = matchedProduct;
        const now = Date.now();
        const isRecentSameItem =
          scannerConfig.autoIncrementQuantity &&
          lastScannedProductIdRef.current.id === matchedProduct.id &&
          now - lastScannedProductIdRef.current.timestamp < scannerConfig.repeatScanCooldownMs;

        if (isRecentSameItem) {
          // Check if item already exists in cart with same active unit
          const existingCartItem = cart.find(
            (c) => c.product.id === matchedProduct.id && c.unitType === activeUnit
          );

          if (existingCartItem) {
            updateItemQuantity(existingCartItem.id, existingCartItem.quantity + 1);
            if (scannerConfig.enableSoundFeedback) {
              playBeep('scan');
            }
            lastScannedProductIdRef.current = { id: matchedProduct.id, timestamp: now };
            onProductScanned?.(matchedProduct, decoded, true);
            bufferRef.current = '';
            keyTimestampsRef.current = [];
            return;
          }
        }

        // Add new item to cart
        addItem(matchedProduct, activeUnit, 1);
        if (scannerConfig.enableSoundFeedback) {
          playBeep('scan');
        }
        lastScannedProductIdRef.current = { id: matchedProduct.id, timestamp: now };
        onProductScanned?.(matchedProduct, decoded, false);
      } else {
        if (scannerConfig.enableSoundFeedback) {
          playBeep('error');
        }
        onUnrecognizedBarcode?.(decoded);
      }

      bufferRef.current = '';
      keyTimestampsRef.current = [];
    },
    [
      scannerConfig,
      products,
      cart,
      activeUnit,
      addItem,
      updateItemQuantity,
      playBeep,
      onProductScanned,
      onUnrecognizedBarcode,
    ]
  );

  useEffect(() => {
    if (!scannerConfig.enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore functional hotkeys like F1-F12, Escape, Control, Alt, Meta
      if (
        e.key.startsWith('F') && e.key.length <= 3 && !isNaN(Number(e.key.slice(1))) ||
        ['Escape', 'Control', 'Alt', 'Shift', 'Meta', 'CapsLock', 'ContextMenu', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      const activeElem = document.activeElement as HTMLElement | null;
      const isInputOrTextarea =
        activeElem?.tagName === 'INPUT' ||
        activeElem?.tagName === 'TEXTAREA' ||
        activeElem?.isContentEditable;

      // Handle scan terminator: Enter or Tab
      const isEnterTerminator = (e.key === 'Enter' || e.keyCode === 13) && ['enter', 'any'].includes(scannerConfig.scannerSuffix);
      const isTabTerminator = (e.key === 'Tab' || e.keyCode === 9) && ['tab', 'any'].includes(scannerConfig.scannerSuffix);

      if (isEnterTerminator || isTabTerminator) {
        if (bufferRef.current.length >= scannerConfig.minBarcodeLength) {
          // Prevent form submission or standard Enter action
          e.preventDefault();
          e.stopPropagation();

          // If input had buffer pollution, clear it
          if (isInputOrTextarea && scannerConfig.preventInputPollution && activeElem instanceof HTMLInputElement) {
            // If the input value matches the scanned buffer, clear or restore it
            if (activeElem.value.includes(bufferRef.current)) {
              activeElem.value = activeElem.value.replace(bufferRef.current, '').trim();
            }
          }

          if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
            timeoutIdRef.current = null;
          }

          processBarcodeBuffer(bufferRef.current);
          return;
        } else {
          // Normal manual enter key, reset buffer
          bufferRef.current = '';
          keyTimestampsRef.current = [];
          return;
        }
      }

      // Check single printable character
      if (e.key.length === 1) {
        // If elapsed time since last character is greater than scanner interval threshold,
        // it means this is a new scan sequence or a manual human keystroke
        if (timeDiff > scannerConfig.maxKeyIntervalMs && bufferRef.current.length > 0) {
          // If previous buffer is long enough and timeout suffix is allowed, process it
          if (
            ['timeout', 'any'].includes(scannerConfig.scannerSuffix) &&
            bufferRef.current.length >= scannerConfig.minBarcodeLength
          ) {
            processBarcodeBuffer(bufferRef.current);
          }
          bufferRef.current = '';
          keyTimestampsRef.current = [];
        }

        bufferRef.current += e.key;
        keyTimestampsRef.current.push(now);

        onScanRawKeystroke?.(e.key, timeDiff);

        // Set fallback timeout for scanners with no suffix / terminator
        if (['timeout', 'any'].includes(scannerConfig.scannerSuffix)) {
          if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
          timeoutIdRef.current = setTimeout(() => {
            if (bufferRef.current.length >= scannerConfig.minBarcodeLength) {
              processBarcodeBuffer(bufferRef.current);
            }
          }, scannerConfig.maxKeyIntervalMs * 2);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
  }, [scannerConfig, processBarcodeBuffer, onScanRawKeystroke]);

  return {
    isScanning,
    lastScannedResult,
    lastScanTime,
    scanSpeedAvg,
    scannerConfig,
    simulateScan: (rawBarcode: string) => processBarcodeBuffer(rawBarcode),
  };
}
