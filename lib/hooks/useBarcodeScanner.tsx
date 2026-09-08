"use client";

import * as React from "react";

export interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  onError?: (errorText: string) => void;
  minLength?: number;
  maxInterval?: number; // Maximum ms between keystrokes to qualify as hardware scanner
  enabled?: boolean;
  soundFeedback?: boolean;
  preventDefaultOnEnter?: boolean;
}

/**
 * Web Audio API Beep Synthesizer for instant audio feedback on floor barcode scans
 */
export function playAudioBeep(type: "success" | "error") {
  try {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      // 880Hz crisp high chime (positive match)
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else {
      // 220Hz low buzz warning (unrecognized barcode)
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // AudioContext blocked or not supported
  }
}

/**
 * Global Hardware Barcode Listener Hook
 * Listens to USB / Bluetooth handheld barcode scanner keyboard emulation strokes
 */
export function useBarcodeScanner({
  onScan,
  onError,
  minLength = 3,
  maxInterval = 65, // scanners emit keystrokes in < 50ms intervals
  enabled = true,
  soundFeedback = true,
  preventDefaultOnEnter = true,
}: BarcodeScannerOptions) {
  const bufferRef = React.useRef<string>("");
  const lastTimeRef = React.useRef<number>(0);
  const [lastScannedBarcode, setLastScannedBarcode] = React.useState<string | null>(null);
  const [isScanningActive, setIsScanningActive] = React.useState(false);
  const [scanPulse, setScanPulse] = React.useState(false);

  // Trigger pulse animation helper
  const triggerVisualPulse = React.useCallback(() => {
    setScanPulse(true);
    const t = setTimeout(() => setScanPulse(false), 800);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      // Check if target is an interactive textarea or unrelated input
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if (e.key === "Enter") {
        if (bufferRef.current.length >= minLength) {
          const barcode = bufferRef.current.trim();
          bufferRef.current = "";
          setIsScanningActive(false);

          if (preventDefaultOnEnter && isInputFocused) {
            e.preventDefault();
          }

          setLastScannedBarcode(barcode);
          triggerVisualPulse();

          if (soundFeedback) {
            playAudioBeep("success");
          }

          // Broadcast global custom event
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("factoryos_barcode_scanned", { detail: { barcode } })
            );
          }

          onScan(barcode);
        } else {
          bufferRef.current = "";
          setIsScanningActive(false);
        }
        return;
      }

      // If time difference is greater than max interval, reset buffer (user is hand-typing slowly)
      if (timeDiff > maxInterval && bufferRef.current.length > 0) {
        bufferRef.current = "";
      }

      // Only accumulate printable single characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;
        setIsScanningActive(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [enabled, minLength, maxInterval, soundFeedback, preventDefaultOnEnter, onScan, triggerVisualPulse]);

  return {
    lastScannedBarcode,
    isScanningActive,
    scanPulse,
    playAudioBeep,
    triggerVisualPulse,
  };
}

/**
 * Visual Scanner Feedback Pulse Overlay Banner Component
 */
export function BarcodeScannerBanner({
  activeBarcode,
  pulse = false,
}: {
  activeBarcode?: string | null;
  pulse?: boolean;
}) {
  if (!pulse && !activeBarcode) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-xl transition-all duration-300 ${
        pulse
          ? "bg-emerald-600 text-white border-emerald-400 ring-4 ring-emerald-400/30 scale-105"
          : "bg-slate-900 text-white border-slate-700"
      }`}
    >
      <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
      <div className="text-xs">
        <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-200 block">
          Hardware Barcode Scanner Active
        </span>
        <span className="font-mono font-bold">{activeBarcode || "Ready for scan gun input..."}</span>
      </div>
    </div>
  );
}
