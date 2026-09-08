"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, Plus, Minus, RotateCcw, Save, Sparkles, X } from "lucide-react";
import { RoleActionButton } from "@/components/auth/RoleActionButton";

export interface TabletDefectLoggerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDefect: (defect: {
    code: string;
    name: string;
    category: "critical" | "major" | "minor";
    zone: string;
    count: number;
    notes?: string;
  }) => void;
  lotReference?: string;
}

const DEFECT_PRESETS = [
  { code: "DEF-ST-01", name: "Broken / Skipped Stitch", category: "major" as const },
  { code: "DEF-ST-02", name: "Puckering / Tension Flaw", category: "minor" as const },
  { code: "DEF-FAB-01", name: "Fabric Hole / Needle Cut", category: "critical" as const },
  { code: "DEF-FAB-02", name: "Color Shading / Dye Flaw", category: "major" as const },
  { code: "DEF-CLN-01", name: "Machine Oil / Dirt Stain", category: "minor" as const },
  { code: "DEF-DIM-01", name: "Out of Measurement Spec", category: "major" as const },
  { code: "DEF-TRM-01", name: "Wrong Label / Care Missing", category: "critical" as const },
];

const GARMENT_ZONES = [
  "Collar / Neck",
  "Left Sleeve",
  "Right Sleeve",
  "Front Body",
  "Back Body",
  "Hemline",
  "Side Seam",
  "Pocket / Kangaroo",
];

export function TabletDefectLogger({
  isOpen,
  onClose,
  onSaveDefect,
  lotReference = "LOT-2026-001",
}: TabletDefectLoggerProps) {
  const [selectedSeverity, setSelectedSeverity] = React.useState<"critical" | "major" | "minor">("major");
  const [selectedZone, setSelectedZone] = React.useState("Collar / Neck");
  const [selectedDefect, setSelectedDefect] = React.useState(DEFECT_PRESETS[0]);
  const [defectCount, setDefectCount] = React.useState(1);
  const [defectNotes, setDefectNotes] = React.useState("");

  if (!isOpen) return null;

  const handleAdjustCount = (amount: number) => {
    setDefectCount((prev) => Math.max(1, prev + amount));
  };

  const handleLog = () => {
    onSaveDefect({
      code: selectedDefect.code,
      name: selectedDefect.name,
      category: selectedSeverity,
      zone: selectedZone,
      count: defectCount,
      notes: defectNotes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl text-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Tablet Touch Defect Logger
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-400/30">
                  AQL 2.5 Floor Mode
                </span>
              </div>
              <p className="text-xs text-slate-400">Active Lot: {lotReference}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Floor-Optimized Body */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* 1. SEVERITY CLASSIFICATION PILLS (Min 54px touch targets) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              1. Defect Severity (Touch Target)
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: "critical" as const, label: "Critical", desc: "Immediate Reject", bg: "bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30", active: "bg-rose-600 text-white ring-2 ring-rose-400 shadow-lg" },
                { id: "major" as const, label: "Major", desc: "AQL 2.5 Threshold", bg: "bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30", active: "bg-amber-600 text-white ring-2 ring-amber-400 shadow-lg" },
                { id: "minor" as const, label: "Minor", desc: "Cosmetic Flaw", bg: "bg-blue-500/20 text-blue-300 border-blue-500/50 hover:bg-blue-500/30", active: "bg-blue-600 text-white ring-2 ring-blue-400 shadow-lg" },
              ].map((sev) => {
                const isSelected = selectedSeverity === sev.id;
                return (
                  <button
                    key={sev.id}
                    type="button"
                    onClick={() => setSelectedSeverity(sev.id)}
                    className={`h-16 rounded-2xl border flex flex-col items-center justify-center p-2 font-bold transition-all cursor-pointer ${
                      isSelected ? sev.active : sev.bg
                    }`}
                  >
                    <span className="text-sm font-extrabold uppercase">{sev.label}</span>
                    <span className="text-[10px] opacity-80">{sev.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. GARMENT ZONE SELECTOR */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              2. Garment Zone Placement
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {GARMENT_ZONES.map((zone) => {
                const isSelected = selectedZone === zone;
                return (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => setSelectedZone(zone)}
                    className={`h-12 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center px-2 text-center ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-900/40"
                        : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    {zone}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. DEFECT PRESET PICKERS */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              3. Defect Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEFECT_PRESETS.map((def) => {
                const isSelected = selectedDefect.code === def.code;
                return (
                  <button
                    key={def.code}
                    type="button"
                    onClick={() => {
                      setSelectedDefect(def);
                      setSelectedSeverity(def.category);
                    }}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-indigo-600/30 text-white border-indigo-400 ring-1 ring-indigo-400"
                        : "bg-slate-800/60 text-slate-300 border-slate-700/80 hover:bg-slate-800"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{def.name}</p>
                      <span className="text-[10px] font-mono text-slate-400">{def.code}</span>
                    </div>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                      def.category === "critical" ? "bg-rose-900/50 text-rose-300 border-rose-700" :
                      def.category === "major" ? "bg-amber-900/50 text-amber-300 border-amber-700" :
                      "bg-blue-900/50 text-blue-300 border-blue-700"
                    }`}>
                      {def.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. FAST QUANTITY COUNTER (+1, +5, -1) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              4. Defect Quantity Count
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleAdjustCount(-1)}
                className="h-14 w-14 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-lg flex items-center justify-center transition-colors cursor-pointer"
              >
                <Minus className="h-6 w-6" />
              </button>

              <div className="flex-1 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center">
                <span className="font-mono text-2xl font-black text-white">
                  {defectCount} <span className="text-xs font-sans text-slate-400 font-normal">Pcs</span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleAdjustCount(1)}
                className="h-14 w-16 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base flex items-center justify-center transition-colors cursor-pointer"
              >
                +1
              </button>

              <button
                type="button"
                onClick={() => handleAdjustCount(5)}
                className="h-14 w-16 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base flex items-center justify-center transition-colors cursor-pointer"
              >
                +5
              </button>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleLog}
            className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm tracking-wide shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            Log Defect ({defectCount} Pcs - {selectedSeverity.toUpperCase()})
          </button>
        </div>

      </div>
    </div>
  );
}
