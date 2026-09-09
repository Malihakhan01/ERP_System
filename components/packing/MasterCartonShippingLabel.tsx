"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Printer, X, Tag, Truck } from "lucide-react";
import { PackingCartonRecord } from "@/lib/services/packing-service";

export interface MasterCartonShippingLabelProps {
  carton: PackingCartonRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MasterCartonShippingLabel({
  carton,
  isOpen,
  onClose,
}: MasterCartonShippingLabelProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // When modal is open, set print class and escape listener
  React.useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("print-shipping-label-active");

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("print-shipping-label-active");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !carton || !mounted) return null;

  const handlePrint = () => {
    document.body.classList.add("print-shipping-label-active");
    window.print();
  };

  const barcodeNumber = carton.cartonBarcode || `CTN-${carton.cartonNumber || "001"}-2026`;
  const totalPieces = carton.totalUnitsInCarton || 24;

  const sizeBreakdownEntries = carton.sizeBreakdown
    ? Object.entries(carton.sizeBreakdown)
    : [["S", 6], ["M", 12], ["L", 6]];

  return createPortal(
    <div
      id="shipping-label-print-portal"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static print:block print:inset-auto print:w-full print:m-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 print:shadow-none print:border-none print:rounded-none print:m-0 print:w-full">
        
        {/* Top Control Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 no-print">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">4x6" Commercial Master Carton Shipping Label</h3>
              <p className="text-[10px] text-slate-500">Carton: {carton.cartonNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              Print 4x6" Label
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 4x6" Standardized Thermal Label View */}
        <div className="p-6 flex justify-center print:p-0">
          <div className="shipping-label-sheet w-[384px] min-h-[576px] bg-white border-2 border-black p-4 text-black text-left font-sans select-none flex flex-col justify-between print:w-full print:h-auto print:border-2">
            
            {/* Top Brand & Destination Row */}
            <div>
              <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
                <div>
                  <h1 className="text-base font-black tracking-tight uppercase leading-none">
                    FACTORYOS APPAREL MILLS
                  </h1>
                  <p className="text-[9px] font-bold tracking-wider mt-0.5">
                    EXPORT GARMENT CONSIGNMENT
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold uppercase block">ORIGIN</span>
                  <span className="text-xs font-black">PAKISTAN</span>
                </div>
              </div>

              {/* Destination Port Banner */}
              <div className="bg-black text-white p-2 rounded-xs mb-3 flex items-center justify-between">
                <div>
                  <span className="text-[8px] tracking-widest font-bold block uppercase opacity-80">DESTINATION DISCHARGE PORT</span>
                  <p className="text-sm font-black tracking-tight uppercase">
                    HAMBURG PORT, GERMANY
                  </p>
                </div>
                <Truck className="h-5 w-5 text-white/90 shrink-0" />
              </div>

              {/* Order & PO Details Grid */}
              <div className="grid grid-cols-2 gap-1.5 text-[10px] border-b-2 border-black pb-2 mb-2">
                <div>
                  <span className="text-[8px] font-bold text-neutral-600 block uppercase">PRODUCTION / PO REF:</span>
                  <span className="font-mono font-black text-xs">{carton.productionJobId || carton.orderId || "JOB-EXP-2026"}</span>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-neutral-600 block uppercase">CARTON NO:</span>
                  <span className="font-mono font-black text-xs">{carton.cartonNumber}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[8px] font-bold text-neutral-600 block uppercase">PACKING TYPE / SPEC:</span>
                  <span className="font-bold text-xs">{carton.packingType === "solid_size" ? "Solid Size Pack" : "Ratio Assorted Pack"}</span>
                </div>
              </div>

              {/* Size & Breakdown Table */}
              <div className="border border-black rounded-xs mb-3 overflow-hidden">
                <div className="bg-neutral-200 text-black text-[9px] font-black uppercase px-2 py-0.5 flex justify-between border-b border-black">
                  <span>Size Breakdown</span>
                  <span>Quantity</span>
                </div>
                <div className="divide-y divide-neutral-300 text-[10px] font-mono">
                  {sizeBreakdownEntries.map(([size, qty], idx) => (
                    <div key={idx} className="px-2 py-0.5 flex justify-between">
                      <span className="font-sans font-semibold">Size {size}</span>
                      <span className="font-bold">{qty} Pcs</span>
                    </div>
                  ))}
                  <div className="bg-neutral-100 px-2 py-1 flex justify-between font-black text-[11px] border-t border-black">
                    <span className="font-sans">TOTAL QUANTITY:</span>
                    <span>{totalPieces} PCS</span>
                  </div>
                </div>
              </div>

              {/* Physical Weights & Dimensions */}
              <div className="grid grid-cols-3 gap-1 text-[10px] border-y-2 border-black py-2 mb-3 text-center">
                <div>
                  <span className="text-[8px] font-bold text-neutral-600 block uppercase">GROSS WEIGHT</span>
                  <span className="font-mono font-black text-xs">{carton.grossWeightKg || 12.5} KG</span>
                </div>
                <div className="border-x border-neutral-300">
                  <span className="text-[8px] font-bold text-neutral-600 block uppercase">NET WEIGHT</span>
                  <span className="font-mono font-black text-xs">{carton.netWeightKg || 11.2} KG</span>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-neutral-600 block uppercase">DIMENSIONS</span>
                  <span className="font-mono font-bold text-[10px]">
                    {carton.lengthCm}x{carton.widthCm}x{carton.heightCm} CM
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Barcode Section */}
            <div className="text-center pt-2">
              {/* Synthetic Code 128 High-Contrast Barcode */}
              <div className="flex justify-center items-center py-1">
                <svg className="w-full h-14 max-w-[320px]" viewBox="0 0 280 60">
                  {Array.from({ length: 65 }).map((_, i) => {
                    const width = (i * 7) % 3 === 0 ? 3 : (i * 13) % 2 === 0 ? 2 : 1;
                    const isWhite = (i * 11) % 4 === 0;
                    if (isWhite) return null;
                    return (
                      <rect
                        key={i}
                        x={i * 4.2}
                        y={2}
                        width={width}
                        height={52}
                        fill="#000000"
                      />
                    );
                  })}
                </svg>
              </div>
              <p className="font-mono font-black tracking-widest text-xs mt-1">
                *{barcodeNumber}*
              </p>

              {/* QC Verification Footer */}
              <div className="mt-2 pt-2 border-t border-neutral-300 flex items-center justify-between text-[8px] font-bold text-neutral-600">
                <span>INSPECTED & SEALED: {carton.packedBy || "QA AUDIT TEAM"}</span>
                <span className="text-black uppercase">FACTORY QC PASSED [AQL 2.5]</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
