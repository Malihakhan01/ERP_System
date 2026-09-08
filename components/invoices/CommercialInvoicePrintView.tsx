"use client";

import * as React from "react";
import { Printer, ArrowLeft, Building2 } from "lucide-react";
import { InvoiceRecord } from "@/lib/invoices-engine";
import { ClientRecord } from "@/lib/clients-engine";
import { OrderRecord } from "@/lib/orders-engine";
import { CURRENCY_SYMBOLS } from "@/lib/costing-engine";

export interface CommercialInvoicePrintViewProps {
  invoice: InvoiceRecord;
  client?: ClientRecord | null;
  order?: OrderRecord | null;
  onClose?: () => void;
}

export function CommercialInvoicePrintView({
  invoice,
  client,
  order,
  onClose,
}: CommercialInvoicePrintViewProps) {
  const currencySymbol = CURRENCY_SYMBOLS[invoice.currency] || invoice.currency;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6 print:bg-white print:p-0 print:m-0">
      {/* Action Bar (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between no-print">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Invoices
          </button>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer print-preserve"
          >
            <Printer className="h-4 w-4" />
            Print Commercial Invoice (A4)
          </button>
        </div>
      </div>

      {/* A4 Printable Sheet Container */}
      <div className="a4-print-sheet max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-8 sm:p-12 text-slate-800 text-xs print:shadow-none print:border-none print:p-0">
        
        {/* ---- FACTORY COMMERCIAL HEADER ---- */}
        <div className="border-b-2 border-slate-900 pb-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-blue-900 text-white flex items-center justify-center font-black text-sm">
                  FOS
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                    FactoryOS Garment Mills (Pvt) Ltd.
                  </h1>
                  <p className="text-[11px] font-semibold text-blue-900">
                    Garment Manufacturing & Apparel Export Division
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-slate-600 mt-2 max-w-sm leading-relaxed">
                Plot 42-B, Sector 7-A, Korangi Industrial Area, Karachi - 74900, Pakistan<br />
                Phone: +92 (21) 3506-8800 | Email: export@factoryos.internal | Web: www.factoryos.internal
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded text-xs font-black tracking-wider uppercase mb-2">
                COMMERCIAL INVOICE
              </div>
              <p className="text-xs font-bold text-slate-900">
                Invoice No: <span className="font-mono text-blue-900">{invoice.invoiceNumber}</span>
              </p>
              <p className="text-[11px] text-slate-600">
                Invoice Date: <span className="font-medium text-slate-800">{new Date(invoice.invoiceDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
              </p>
              <p className="text-[11px] text-slate-600">
                Due Date: <span className="font-medium text-slate-800">{new Date(invoice.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
              </p>
            </div>
          </div>

          {/* Tax Credentials Bar */}
          <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] bg-slate-50 p-2.5 rounded-lg">
            <div>
              <span className="font-bold text-slate-500">NTN / Tax ID:</span>
              <p className="font-mono font-bold text-slate-800">4892104-9</p>
            </div>
            <div>
              <span className="font-bold text-slate-500">Sales Tax (STRN):</span>
              <p className="font-mono font-bold text-slate-800">17-00-9823-412-19</p>
            </div>
            <div>
              <span className="font-bold text-slate-500">Export Reg No:</span>
              <p className="font-mono font-bold text-slate-800">PK-KHI-EXP-8891</p>
            </div>
            <div>
              <span className="font-bold text-slate-500">Payment Terms:</span>
              <p className="font-bold text-slate-800">{invoice.paymentTerms || "Net 30 Days"}</p>
            </div>
          </div>
        </div>

        {/* ---- BILLING / CONSIGNEE & SHIPPING PARTICULARS ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          {/* Bill To / Consignee */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Bill To / Buyer (Consignee)
            </h3>
            <p className="font-bold text-slate-900 text-sm">
              {client?.companyName || invoice.clientName || "Direct Garment Buyer"}
            </p>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              {client?.city ? `${client.city}, ` : ""}{client?.country || invoice.clientCountry || "International Destination"}
            </p>
            <p className="text-[10px] text-slate-500 mt-2 font-mono">
              Attn: {client?.primaryContact?.name || invoice.clientContact || "Procurement Manager"} | Email: {client?.primaryContact?.email || invoice.clientEmail || "billing@client.com"}
            </p>
            {client?.commercialInfo?.taxVatId && (
              <p className="text-[10px] text-slate-500 font-mono">Buyer VAT/Tax ID: {client.commercialInfo.taxVatId}</p>
            )}
          </div>

          {/* Shipping & Shipment Meta */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Shipment & Reference Particulars
            </h3>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Buyer PO / Order Ref:</span>
              <span className="font-mono font-bold text-slate-800">{order?.orderNumber || invoice.orderNumber || invoice.buyerPoRef || "PO-EXP-2026-99"}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Country of Origin:</span>
              <span className="font-bold text-slate-800">PAKISTAN</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Port of Loading:</span>
              <span className="font-bold text-slate-800">Karachi Port (PKBQM / PKQAS)</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Port of Discharge:</span>
              <span className="font-bold text-slate-800">{client?.country ? `Port of ${client.country}` : "Destination Port"}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Delivery Terms (Incoterms):</span>
              <span className="font-bold text-blue-900">{invoice.incoterms || "FOB Karachi / CIF Destination"}</span>
            </div>
          </div>
        </div>

        {/* ---- ITEMIZED GARMENT LINE ITEMS TABLE ---- */}
        <div className="mb-6 overflow-hidden rounded-lg border border-slate-300">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Garment Style & Description</th>
                <th className="py-2.5 px-3 text-center">HS Code</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Total ({invoice.currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px]">
              <tr>
                <td className="py-2.5 px-3 text-slate-500 font-mono">1</td>
                <td className="py-2.5 px-3">
                  <p className="font-bold text-slate-900">{invoice.description || invoice.styleName || "Export Garment Order"}</p>
                  <p className="text-[10px] text-slate-500">
                    {invoice.garmentStyle ? `Style: ${invoice.garmentStyle} | ` : ""}100% Cotton Ready Apparel
                  </p>
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-slate-500">6109.10.00</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold">
                  {(invoice.quantity || 1).toLocaleString()} Pcs
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {currencySymbol}{(invoice.unitPrice || invoice.subtotal || 0).toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                  {currencySymbol}{invoice.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ---- FINANCIAL SUMMARY & BANK SETTLEMENT ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          {/* Bank Wire Details */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-[10px] space-y-1.5">
            <h4 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
              <Building2 className="h-3.5 w-3.5 text-blue-900" />
              Bank Settlement Wire Instructions
            </h4>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500">Bank Name:</span>
              <span className="col-span-2 font-bold text-slate-800">Bank AL Habib Limited</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500">Account Title:</span>
              <span className="col-span-2 font-bold text-slate-800">FactoryOS Garment Mills (Pvt) Ltd.</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500">IBAN:</span>
              <span className="col-span-2 font-mono font-bold text-blue-900">PK36BAHL0001098201948201</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500">SWIFT Code:</span>
              <span className="col-span-2 font-mono font-bold text-slate-800">BAHLPKKA</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500">Branch:</span>
              <span className="col-span-2 text-slate-800">Korangi Industrial Branch, Karachi, Pakistan</span>
            </div>
          </div>

          {/* Pricing Totals */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-600">Commercial Subtotal:</span>
              <span className="font-mono font-bold text-slate-800">
                {currencySymbol}{invoice.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {invoice.tax > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Sales Tax / VAT:</span>
                <span className="font-mono font-bold text-slate-800">
                  {currencySymbol}{invoice.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {invoice.freightCharges > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Freight & Charges:</span>
                <span className="font-mono font-bold text-slate-800">
                  {currencySymbol}{invoice.freightCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {invoice.discount > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-200 text-emerald-700">
                <span>Commercial Discount:</span>
                <span className="font-mono font-bold">
                  -{currencySymbol}{invoice.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-black text-slate-900 bg-slate-50 px-2 rounded">
              <span>Grand Total Due:</span>
              <span className="font-mono text-blue-900">
                {currencySymbol}{invoice.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {invoice.amountPaid > 0 && (
              <div className="flex justify-between py-1 text-slate-600 text-[11px]">
                <span>Amount Paid / Settled:</span>
                <span className="font-mono text-emerald-600 font-bold">
                  -{currencySymbol}{invoice.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {invoice.balanceDue > 0 && (
              <div className="flex justify-between py-1 text-slate-900 font-bold text-xs bg-amber-50 px-2 rounded border border-amber-200">
                <span className="text-amber-900">Outstanding Balance:</span>
                <span className="font-mono text-amber-900">
                  {currencySymbol}{invoice.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ---- LEGAL DECLARATION & SIGNATORIES ---- */}
        <div className="border-t border-slate-200 pt-4 page-break-inside-avoid">
          <p className="text-[10px] text-slate-500 italic mb-6 leading-relaxed">
            Declaration: We hereby declare that this commercial invoice shows the actual value of the goods described and that all particulars are true and correct. Goods are manufactured under standard AQL 2.5 quality protocols.
          </p>

          <div className="grid grid-cols-3 gap-8 text-center pt-8 border-t border-dashed border-slate-300">
            <div>
              <div className="h-10 border-b border-slate-400 mb-1" />
              <p className="font-bold text-slate-800 text-[11px]">Commercial Officer</p>
              <p className="text-[9px] text-slate-400 uppercase">Prepared By</p>
            </div>
            <div>
              <div className="h-10 border-b border-slate-400 mb-1" />
              <p className="font-bold text-slate-800 text-[11px]">Head of Finance & Accounts</p>
              <p className="text-[9px] text-slate-400 uppercase">Checked & Verified</p>
            </div>
            <div>
              <div className="h-10 border-b border-slate-400 mb-1" />
              <p className="font-bold text-slate-800 text-[11px]">Authorized Factory Director</p>
              <p className="text-[9px] text-slate-400 uppercase">Managing Director Stamp</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
