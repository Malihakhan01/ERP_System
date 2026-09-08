"use client";

import * as React from "react";
import { TopNav } from "@/components/layout/TopNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard, Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { EmptyState, Pagination } from "@/components/ui/Misc";
import { FormField, FormSection } from "@/components/forms/FormField";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  MapPin,
  Plus,
  Search,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Box,
  Truck,
  Anchor,
  Layers,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Barcode,
} from "lucide-react";
import type { TrackingShipmentRecord, TrackingKPIData } from "@/lib/mysql/tracking-db";
import { useBarcodeScanner, BarcodeScannerBanner } from "@/lib/hooks/useBarcodeScanner";

const ITEMS_PER_PAGE = 10;

const GATES = [
  { gate: 1, name: "Order Confirmed", dept: "Commercial" },
  { gate: 2, name: "Fabric Approved", dept: "Lab / Warehouse" },
  { gate: 3, name: "Cutting Started", dept: "Cutting Floor" },
  { gate: 4, name: "Stitching Started", dept: "Sewing Line" },
  { gate: 5, name: "Finishing", dept: "Ironing Bay" },
  { gate: 6, name: "QA Passed", dept: "QA AQL 2.5" },
  { gate: 7, name: "Packing Completed", dept: "Packing Bay" },
  { gate: 8, name: "Dispatch", dept: "Export Dock" },
  { gate: 9, name: "Delivered", dept: "Buyer Port" },
];

export default function TrackingPage() {
  const { success, error: toastError } = useToast();

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  const [records, setRecords] = React.useState<TrackingShipmentRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedRecord, setSelectedRecord] = React.useState<TrackingShipmentRecord | null>(null);

  // Global Hardware Scanner Listener
  const { lastScannedBarcode, scanPulse, playAudioBeep } = useBarcodeScanner({
    onScan: (barcode) => {
      const matched = records.find(
        (r) =>
          (r.trackingNumber && r.trackingNumber.toLowerCase() === barcode.toLowerCase()) ||
          (r.orderNumber && r.orderNumber.toLowerCase() === barcode.toLowerCase()) ||
          (r.styleCode && r.styleCode.toLowerCase().includes(barcode.toLowerCase())) ||
          (r.productName && r.productName.toLowerCase().includes(barcode.toLowerCase()))
      );

      if (matched) {
        setSelectedRecord(matched);
        setSearchQuery(barcode);
        success(`Scanned Gate Tracker: ${matched.trackingNumber}`, {
          description: `Active Gate: Stage ${matched.currentGate} (${matched.gateStatus})`,
        });
      } else {
        playAudioBeep("error");
        toastError("Shipment Not Found", {
          description: `No active production shipment matched barcode "${barcode}".`,
        });
      }
    },
  });

  // Modals
  const [advanceModalOpen, setAdvanceModalOpen] = React.useState(false);
  const [targetGate, setTargetGate] = React.useState(2);
  const [gateLocation, setGateLocation] = React.useState("Main Garment Plant Sialkot");
  const [gateNotes, setGateNotes] = React.useState("Progressed to next manufacturing gate.");

  // Filtering & Pagination
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);

  // Metrics
  const [metrics, setMetrics] = React.useState<TrackingKPIData>({
    activeShipments: 0,
    atProductionGate: 0,
    atQAGate: 0,
    atPackingGate: 0,
    atDispatchGate: 0,
    delivered: 0,
    delayedShipments: 0,
    onTimeDeliveryRatePct: 100,
  });

  // ---------------------------------------------------------------------------
  // DATA LOADING
  // ---------------------------------------------------------------------------
  const loadData = React.useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      const [trkRes, metRes] = await Promise.all([
        fetch("/api/tracking").then((r) => (r.ok ? r.json() : { success: false, data: [] })).catch(() => ({ success: false, data: [] })),
        fetch("/api/tracking/metrics").then((r) => (r.ok ? r.json() : { success: false, data: null })).catch(() => ({ success: false, data: null })),
      ]);

      if (trkRes.success && Array.isArray(trkRes.data)) {
        setRecords(trkRes.data);
        if (!selectedRecord && trkRes.data.length > 0) {
          setSelectedRecord(trkRes.data[0]);
        }
      }
      if (metRes.success && metRes.data) {
        setMetrics(metRes.data);
      }

      if (showToast) {
        success("Tracking Data Refreshed", { description: "Loaded live 9-gate milestone timelines from MySQL." });
      }
    } catch (err: any) {
      console.error("Error loading tracking data:", err);
      if (showToast) {
        toastError("Failed to Load Tracking Data", { description: err.message });
      }
    } finally {
      setLoading(false);
    }
  }, [selectedRecord, success, toastError]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // ACTIONS: ADVANCE GATE
  // ---------------------------------------------------------------------------
  const handleAdvanceGate = async () => {
    if (!selectedRecord) return;
    try {
      const res = await fetch("/api/tracking/update-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingRecordId: selectedRecord.id,
          gateNumber: Number(targetGate),
          location: gateLocation,
          notes: gateNotes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        success("Milestone Gate Advanced", {
          description: `Shipment ${selectedRecord.trackingNumber} advanced to Gate ${targetGate}.`,
        });
        setAdvanceModalOpen(false);
        loadData();
      } else {
        throw new Error(json.message);
      }
    } catch (err: any) {
      toastError("Failed to Update Gate", { description: err.message });
    }
  };

  // ---------------------------------------------------------------------------
  // FILTERING & PAGINATION
  // ---------------------------------------------------------------------------
  const filteredRecords = React.useMemo(() => {
    return records.filter((rec) => {
      return (
        searchQuery === "" ||
        rec.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.destinationPort.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [records, searchQuery]);

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE) || 1;
  const paginatedRecords = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRecords.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRecords, currentPage]);

  return (
    <>
      <TopNav title="9-Gate Milestone Shipment Tracking Studio" />

      <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6">
        {/* Page Header */}
        <PageHeader
          title="9-Gate Milestone Tracking"
          description="Track end-to-end export lifecycle from Gate 1 (Order Confirmed) through cutting, sewing, QA, packing, dispatch, to Gate 9 (Port Delivered)."
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />}
                onClick={() => loadData(true)}
              >
                Refresh
              </Button>
            </div>
          }
        />

        {/* Standardized 6 KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            label="Active Shipments"
            value={metrics.activeShipments || 0}
            sub="In manufacturing pipeline"
            icon={<MapPin className="h-5 w-5" />}
            iconColor="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Production"
            value={metrics.atProductionGate || 0}
            sub="Gates 3 to 5 (Cut/Sew)"
            icon={<Layers className="h-5 w-5" />}
            iconColor="bg-amber-50 text-amber-600"
          />
          <StatCard
            label="QA Gate"
            value={metrics.atQAGate || 0}
            sub="Gate 6 (AQL Sampling)"
            icon={<ShieldCheck className="h-5 w-5" />}
            iconColor="bg-purple-50 text-purple-600"
          />
          <StatCard
            label="Packing Complete"
            value={metrics.atPackingGate || 0}
            sub="Gate 7 (Cartonized)"
            icon={<Box className="h-5 w-5" />}
            iconColor="bg-indigo-50 text-indigo-600"
          />
          <StatCard
            label="Ready To Ship"
            value={metrics.atDispatchGate || 0}
            sub="Gate 8 (Container Staged)"
            icon={<Truck className="h-5 w-5" />}
            iconColor="bg-teal-50 text-teal-600"
          />
          <StatCard
            label="Delivered"
            value={metrics.delivered || 0}
            sub="Gate 9 (Destination Port)"
            icon={<CheckCircle2 className="h-5 w-5" />}
            iconColor="bg-emerald-50 text-emerald-600"
          />
        </div>

        {/* Selected Record 9-Gate Visualizer */}
        {selectedRecord && (
          <Card className="border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold text-blue-600">{selectedRecord.trackingNumber}</span>
                  <span className="text-slate-400">•</span>
                  <h3 className="text-base font-bold text-slate-900">{selectedRecord.clientName} ({selectedRecord.styleCode})</h3>
                  <Badge variant="primary">Current: Gate {selectedRecord.currentGate}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Destination: <span className="font-semibold text-slate-700">{selectedRecord.destinationPort}</span> • Location:{" "}
                  <span className="font-semibold text-slate-700">{selectedRecord.currentLocation}</span>
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                leftIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => {
                  setTargetGate(Math.min(9, selectedRecord.currentGate + 1));
                  setAdvanceModalOpen(true);
                }}
              >
                Advance Milestone Gate
              </Button>
            </div>

            {/* 9-Gate Stepper Horizontal Bar */}
            <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 pt-5">
              {GATES.map((g) => {
                const isCompleted = selectedRecord.currentGate > g.gate;
                const isCurrent = selectedRecord.currentGate === g.gate;
                return (
                  <div
                    key={g.gate}
                    className={`flex flex-col p-2.5 rounded-xl border transition-all ${
                      isCurrent
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : isCompleted
                        ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                        : "bg-slate-50 text-slate-400 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isCurrent ? "text-blue-100" : ""}`}>
                        Gate {g.gate}
                      </span>
                      {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                    </div>
                    <span className="text-xs font-bold mt-1 line-clamp-1">{g.name}</span>
                    <span className={`text-[10px] mt-0.5 truncate ${isCurrent ? "text-blue-200" : "text-slate-500"}`}>
                      {g.dept}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Tracking Shipments Table */}
        <Card noPadding className="border-slate-200/80 shadow-xs overflow-hidden bg-white">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by Tracking #, Order #, or Destination Port..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <EmptyState
              title="No Tracking Records Found"
              description="Confirmed production and dispatch orders will appear in the 9-gate tracker."
              icon={<MapPin className="h-6 w-6" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Tracking #</th>
                    <th className="px-4 py-3">Order / Buyer</th>
                    <th className="px-4 py-3">Style Code</th>
                    <th className="px-4 py-3">Current Gate</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Est. Delivery</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRecords.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRecord(r)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        selectedRecord?.id === r.id ? "bg-blue-50/30" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-blue-600">{r.trackingNumber}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900">{r.clientName}</span>
                        <span className="text-xs text-slate-500 block font-mono">{r.orderNumber}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-800">{r.styleCode}</td>
                      <td className="px-4 py-3">
                        <Badge variant={r.currentGate === 9 ? "success" : "primary"}>
                          Gate {r.currentGate}: {GATES.find((g) => g.gate === r.currentGate)?.name}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">{r.currentLocation}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">{r.estimatedDelivery}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecord(r);
                            setTargetGate(Math.min(9, r.currentGate + 1));
                            setAdvanceModalOpen(true);
                          }}
                        >
                          Advance
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredRecords.length > 0 && (
            <Pagination
              page={currentPage}
              pageSize={ITEMS_PER_PAGE}
              total={filteredRecords.length}
              onPageChange={(page) => setCurrentPage(page)}
            />
          )}
        </Card>
      </div>

      {/* MODAL: ADVANCE GATE */}
      <Modal
        isOpen={advanceModalOpen}
        onClose={() => setAdvanceModalOpen(false)}
        title={`Advance Milestone for ${selectedRecord?.trackingNumber}`}
        size="md"
      >
        <div className="space-y-4">
          <FormField label="Target Milestone Gate" required>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              value={targetGate}
              onChange={(e) => setTargetGate(parseInt(e.target.value, 10))}
            >
              {GATES.map((g) => (
                <option key={g.gate} value={g.gate}>
                  Gate {g.gate}: {g.name} ({g.dept})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Current Location" required>
            <Input value={gateLocation} onChange={(e) => setGateLocation(e.target.value)} />
          </FormField>

          <FormField label="Milestone Progression Notes">
            <Textarea rows={2} value={gateNotes} onChange={(e) => setGateNotes(e.target.value)} />
          </FormField>
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={() => setAdvanceModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAdvanceGate}>
            Confirm Gate Progression
          </Button>
        </ModalFooter>
      </Modal>

      {/* Hardware Barcode Scanner Status Banner */}
      <BarcodeScannerBanner activeBarcode={lastScannedBarcode} pulse={scanPulse} />
    </>
  );
}
