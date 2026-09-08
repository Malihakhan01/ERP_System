"use client";

import * as React from "react";
import { Printer, X, Scissors, Layers, Ruler } from "lucide-react";
import { GarmentProduct } from "@/lib/services/products-service";

export interface TechPackSpecSheetModalProps {
  product: GarmentProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TechPackSpecSheetModal({
  product,
  isOpen,
  onClose,
}: TechPackSpecSheetModalProps) {
  if (!isOpen || !product) return null;

  const handlePrint = () => {
    window.print();
  };

  // Points of Measure (POM) based on product category
  const pomData = [
    { code: "POM-01", name: "Chest Width (1\" below armhole)", tol: "± 0.5 cm", xs: "48.0", s: "51.0", m: "54.0", l: "57.0", xl: "60.0", xxl: "63.0" },
    { code: "POM-02", name: "Body Length (HSP to bottom hem)", tol: "± 0.7 cm", xs: "66.0", s: "69.0", m: "72.0", l: "74.0", xl: "76.0", xxl: "78.0" },
    { code: "POM-03", name: "Across Shoulder (Seam to Seam)", tol: "± 0.5 cm", xs: "42.0", s: "44.0", m: "46.0", l: "48.0", xl: "50.0", xxl: "52.0" },
    { code: "POM-04", name: "Sleeve Length (From shoulder seam)", tol: "± 0.5 cm", xs: "61.0", s: "63.0", m: "65.0", l: "66.5", xl: "68.0", xxl: "69.5" },
    { code: "POM-05", name: "Armhole Straight", tol: "± 0.4 cm", xs: "23.0", s: "24.0", m: "25.0", l: "26.0", xl: "27.5", xxl: "29.0" },
    { code: "POM-06", name: "Neck Width (Seam to Seam)", tol: "± 0.3 cm", xs: "18.0", s: "18.5", m: "19.0", l: "19.5", xl: "20.0", xxl: "20.5" },
    { code: "POM-07", name: "Bottom Hem Width (Relaxed)", tol: "± 0.5 cm", xs: "44.0", s: "47.0", m: "50.0", l: "53.0", xl: "56.0", xxl: "59.0" },
    { code: "POM-08", name: "Cuff / Rib Opening Width", tol: "± 0.3 cm", xs: "8.5", s: "9.0", m: "9.5", l: "10.0", xl: "10.5", xxl: "11.0" },
  ];

  // Bill of Materials (BOM) Breakdown
  const bomData = [
    { item: "Shell Fabric", spec: `${product.gsm || "320"} GSM ${product.fabricType || "Cotton Fleece"}`, placement: "Main Garment Body", supplier: "In-House Knitting Bay" },
    { item: "Rib Trimming", spec: "1x1 Rib 95% Cotton 5% Spandex (380 GSM)", placement: "Neck, Cuffs, Hem", supplier: "Bay 2 Trim Store" },
    { item: "Sewing Thread", spec: "100% Spun Polyester 120/2 Core Spun", placement: "All Seams & Overlocking", supplier: "A&E Thread Mill" },
    { item: "Care / Brand Label", spec: "High-Definition Woven Satin Ribbon", placement: "Inner Back Neck Center", supplier: "Accessory Bay" },
    { item: "Hangtag & Barcode", spec: "350 GSM Art Card with Matte Lamination", placement: "Attached via Swift Tag Pin", supplier: "Packaging Section" },
    { item: "Polybag Packaging", spec: "Self-Adhesive Polybag (Warning Printed)", placement: "1 Pc / Polybag with Desiccant", supplier: "Packing Bay" },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:block print:inset-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 print:shadow-none print:border-none print:rounded-none print:m-0 print:w-full">
        
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 no-print">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Scissors className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Garment Tech Pack & Specification Sheet</h2>
              <p className="text-xs text-slate-500">Style: {product.styleCode} — {product.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Print Tech Pack (A4)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Tech Pack Body */}
        <div className="a4-print-sheet p-6 sm:p-8 space-y-6 text-slate-800 text-xs">
          
          {/* Header Block */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                FactoryOS Apparel Engineering Division
              </span>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                PRODUCTION TECH PACK SPECIFICATION
              </h1>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Master Pattern Spec Sheet & Quality Tolerance Protocol
              </p>
            </div>
            <div className="text-left sm:text-right text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <p className="font-bold text-slate-900">Style Code: <span className="font-mono text-blue-900">{product.styleCode}</span></p>
              <p className="text-slate-600">Category: <span className="font-semibold">{product.category || "Apparel"}</span></p>
              <p className="text-slate-600">BOM Status: <span className="font-bold text-emerald-700">{product.bomStatus === "verified" ? "Verified & Approved" : "Draft Spec"}</span></p>
              <p className="text-slate-500 text-[10px]">Date Generated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Style Overview & Technical Garment Spec */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Visual Sketch / Artwork Placement */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center">
              <div className="h-32 w-32 rounded-xl bg-white border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 p-2 mb-2">
                <Scissors className="h-8 w-8 text-blue-600 mb-1" />
                <span className="text-[10px] font-bold text-slate-700">Flat Pattern CAD</span>
                <span className="text-[9px] text-slate-400">Front & Back View</span>
              </div>
              <p className="font-bold text-slate-900 text-xs">{product.name}</p>
              <span className="text-[10px] text-slate-500 font-mono">Standard Fit / Export Grade</span>
            </div>

            {/* Technical Specifications */}
            <div className="col-span-2 p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <h3 className="font-bold uppercase tracking-wider text-slate-700 text-[11px] flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-blue-600" />
                Fabrication & Construction Standards
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">Fabric Weight:</span>
                  <p className="font-bold text-slate-800">{product.gsm || "320"} GSM ± 5%</p>
                </div>
                <div>
                  <span className="text-slate-500">Stitch Density (SPI):</span>
                  <p className="font-bold text-slate-800">10 – 12 Stitches Per Inch</p>
                </div>
                <div>
                  <span className="text-slate-500">Target Standard SAM:</span>
                  <p className="font-bold text-slate-800">{product.sam || "14.5"} Minutes / Piece</p>
                </div>
                <div>
                  <span className="text-slate-500">Unit Consumption:</span>
                  <p className="font-bold text-slate-800">{product.consumptionKg || "0.45"} KG (+{product.wastagePct || "5"}% waste)</p>
                </div>
                <div>
                  <span className="text-slate-500">Shrinkage Tolerance:</span>
                  <p className="font-bold text-slate-800">Length & Width &lt; 3.0%</p>
                </div>
                <div>
                  <span className="text-slate-500">Colorfastness:</span>
                  <p className="font-bold text-slate-800">Grade 4.0 (ISO 105-C06)</p>
                </div>
              </div>
            </div>
          </div>

          {/* ---- MEASUREMENT TOLERANCE TABLE ---- */}
          <div className="space-y-2">
            <h3 className="font-bold uppercase tracking-wider text-slate-900 text-xs flex items-center gap-1.5">
              <Ruler className="h-4 w-4 text-blue-600" />
              Points of Measure (POM) & Graded Measurement Specs (in Centimeters)
            </h3>
            <div className="overflow-hidden rounded-lg border border-slate-300">
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[9.5px]">
                    <th className="py-2 px-2.5">Code</th>
                    <th className="py-2 px-2.5">Point of Measure</th>
                    <th className="py-2 px-2 text-center">Tol</th>
                    <th className="py-2 px-2 text-center">XS</th>
                    <th className="py-2 px-2 text-center">S</th>
                    <th className="py-2 px-2 text-center bg-blue-800">M (Base)</th>
                    <th className="py-2 px-2 text-center">L</th>
                    <th className="py-2 px-2 text-center">XL</th>
                    <th className="py-2 px-2 text-center">2XL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {pomData.map((row, idx) => (
                    <tr key={row.code} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                      <td className="py-1.5 px-2.5 font-bold text-slate-600">{row.code}</td>
                      <td className="py-1.5 px-2.5 font-sans font-medium text-slate-800">{row.name}</td>
                      <td className="py-1.5 px-2 text-center text-slate-500 text-[10px]">{row.tol}</td>
                      <td className="py-1.5 px-2 text-center text-slate-700">{row.xs}</td>
                      <td className="py-1.5 px-2 text-center text-slate-700">{row.s}</td>
                      <td className="py-1.5 px-2 text-center font-bold text-blue-900 bg-blue-50/60">{row.m}</td>
                      <td className="py-1.5 px-2 text-center text-slate-700">{row.l}</td>
                      <td className="py-1.5 px-2 text-center text-slate-700">{row.xl}</td>
                      <td className="py-1.5 px-2 text-center text-slate-700">{row.xxl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ---- BILL OF MATERIALS (BOM) LIST ---- */}
          <div className="space-y-2">
            <h3 className="font-bold uppercase tracking-wider text-slate-900 text-xs flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-600" />
              Bill of Materials (BOM) & Trim Matrix
            </h3>
            <div className="overflow-hidden rounded-lg border border-slate-300">
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold uppercase text-[9.5px]">
                    <th className="py-2 px-2.5">Component</th>
                    <th className="py-2 px-2.5">Material Specification</th>
                    <th className="py-2 px-2.5">Placement</th>
                    <th className="py-2 px-2.5">Sourcing Bay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bomData.map((bom, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                      <td className="py-1.5 px-2.5 font-bold text-slate-900">{bom.item}</td>
                      <td className="py-1.5 px-2.5 text-slate-700">{bom.spec}</td>
                      <td className="py-1.5 px-2.5 text-slate-600">{bom.placement}</td>
                      <td className="py-1.5 px-2.5 text-slate-500 font-mono text-[10px]">{bom.supplier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sign-off Footnotes */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-center text-[10px] text-slate-500 page-break-inside-avoid">
            <div>
              <div className="h-8 border-b border-slate-300 mb-1" />
              <p className="font-bold text-slate-700">CAD Pattern Master</p>
              <p className="text-[9px]">Grading Verified</p>
            </div>
            <div>
              <div className="h-8 border-b border-slate-300 mb-1" />
              <p className="font-bold text-slate-700">Sampling QA Lead</p>
              <p className="text-[9px]">Fit Approved</p>
            </div>
            <div>
              <div className="h-8 border-b border-slate-300 mb-1" />
              <p className="font-bold text-slate-700">Technical Director</p>
              <p className="text-[9px]">Production Released</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
