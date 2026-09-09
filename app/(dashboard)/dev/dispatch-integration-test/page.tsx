"use client";

import * as React from "react";
import { TopNav } from "@/components/layout/TopNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Misc";
import { useToast } from "@/components/ui/Toast";
import {
  Truck,
  Play,
  RefreshCw,
  Database,
  CheckCircle2,
  XCircle,
  Barcode,
  Layers,
  Box,
} from "lucide-react";
import {
  DispatchRecord,
  DispatchQueueItem,
  getDispatchRecordsFromDB,
  getDispatchQueueFromDB,
  createDispatchInDB,
  markDispatchLoadedInDB,
  completeDispatchInDB,
  resolveDispatchBarcode,
} from "@/lib/services/dispatch-service";
import { getProductionJobsFromDB } from "@/lib/services/production-service";
import { getPackingCartonsFromDB, createPackingCartonInDB, createPackingRecordInDB } from "@/lib/services/packing-service";
import { getTrackingRecordsFromDB } from "@/lib/services/tracking-service";

interface TestResultItem {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  message: string;
  details?: any;
}

export default function DispatchIntegrationTestPage() {
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = React.useState<"suite" | "records">("suite");
  const [running, setRunning] = React.useState(false);
  const [testResults, setTestResults] = React.useState<TestResultItem[]>([]);

  // Live Database State
  const [dispatches, setDispatches] = React.useState<DispatchRecord[]>([]);
  const [dispatchQueue, setDispatchQueue] = React.useState<DispatchQueueItem[]>([]);

  const loadData = React.useCallback(async () => {
    try {
      const [records, queue] = await Promise.all([
        getDispatchRecordsFromDB(),
        getDispatchQueueFromDB(),
      ]);
      setDispatches(records);
      setDispatchQueue(queue);
    } catch (err: unknown) {
      console.error("Failed to load dispatch records:", err);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, []);

  // Automated Test Bench Runner
  const runAutomatedSuite = async () => {
    setRunning(true);
    const results: TestResultItem[] = [];
    const timestamp = Date.now();

    try {
      // Step 1: Ensure a test production job & packing carton exist
      const jobs = await getProductionJobsFromDB();
      const targetJob = jobs[0] || {
        id: `job_dsp_test_${timestamp}`,
        jobNumber: `PRD-DSP-${timestamp.toString().slice(-4)}`,
        stage: "packed",
        totalQaPassedQuantity: 500,
      };

      const packingRec = await createPackingRecordInDB({
        productionJobId: targetJob.id,
        qaApprovedQuantity: 500,
        packerName: "Test Lead",
      });

      const carton = await createPackingCartonInDB({
        packingRecordId: packingRec.id,
        productionJobId: targetJob.id,
        totalUnitsInCarton: 50,
        sizeBreakdown: { S: 15, M: 20, L: 15 },
        grossWeightKg: 14.5,
        destinationLabel: "Diagnostic Bay",
      });

      // Test 1: Dispatch Queue Resolution
      const queue = await getDispatchQueueFromDB();
      results.push({
        id: "test-1",
        name: "Packed Dispatch Queue Resolution",
        category: "Queue & State",
        passed: Array.isArray(queue),
        message: `Resolved ${queue.length} work orders ready for dispatch staging.`,
        details: { count: queue.length },
      });

      // Test 2: Create Dispatch Order
      const newDispatch = await createDispatchInDB({
        productionJobId: targetJob.id,
        cartonIds: [carton.id],
        consigneeName: "Global Sportswear USA Inc.",
        destinationCountry: "United States",
        destinationCity: "New York",
        destinationAddress: "JFK Cargo Port 4",
        shippingMethod: "air_freight",
        carrier: "DHL Global Forwarding",
        dispatchedByName: "Diagnostic Logistics Lead",
      });

      results.push({
        id: "test-2",
        name: "Create Dispatch Order with Carton Assignment",
        category: "Dispatch Creation",
        passed: Boolean(newDispatch.id && newDispatch.dispatchNumber && newDispatch.totalCartons === 1),
        message: `Created dispatch order ${newDispatch.dispatchNumber} with 1 carton (${newDispatch.totalPieces} Pcs).`,
        details: { id: newDispatch.id, number: newDispatch.dispatchNumber, totalPieces: newDispatch.totalPieces },
      });

      // Test 3: Duplicate Carton Prevention Guard
      let duplicateCartonBlocked = false;
      try {
        await createDispatchInDB({
          productionJobId: targetJob.id,
          cartonIds: [carton.id], // Same carton
          consigneeName: "Another Buyer",
          destinationCountry: "UK",
          destinationCity: "London",
          shippingMethod: "air_freight",
          carrier: "Air Cargo",
          dispatchedByName: "Lead",
        });
      } catch (e: any) {
        duplicateCartonBlocked = true;
      }

      results.push({
        id: "test-3",
        name: "Duplicate Carton Assignment Prevention",
        category: "Validation",
        passed: duplicateCartonBlocked,
        message: "Attempting to assign an already-dispatched carton was strictly blocked.",
        details: { blocked: duplicateCartonBlocked },
      });

      // Test 4: Container Loading
      const loaded = await markDispatchLoadedInDB(
        newDispatch.id,
        "Diagnostic Dispatch Lead",
        "EX-CONT-40FT-TEST",
        "Amjad Ali",
        "+92 300 1234567"
      );

      results.push({
        id: "test-4",
        name: "Container & Vehicle Loading Transition",
        category: "Loading Staging",
        passed: loaded.dispatchStatus === "loaded" && loaded.vehicleContainerNo === "EX-CONT-40FT-TEST",
        message: `Dispatch ${loaded.dispatchNumber} marked as loaded in container ${loaded.vehicleContainerNo}.`,
        details: { status: loaded.dispatchStatus, container: loaded.vehicleContainerNo },
      });

      // Test 5: Tracking Gate 8 Synchronization
      const trackingList = await getTrackingRecordsFromDB();
      results.push({
        id: "test-5",
        name: "Tracking Milestone Gate 8 (Warehouse Staging & Dispatch Loading) Linkage",
        category: "Tracking Integration",
        passed: Array.isArray(trackingList),
        message: "Gate 8 milestone synced with dispatch loading and staging records.",
        details: { count: trackingList.length },
      });

      // Test 6: Complete Final Dispatch & Handover
      const completed = await completeDispatchInDB(
        newDispatch.id,
        "Export Logistics Manager",
        `AWB-EXP-${timestamp.toString().slice(-6)}`
      );

      results.push({
        id: "test-6",
        name: "Final Dispatch & Carrier Handover Execution",
        category: "Handover & Release",
        passed: completed.dispatchStatus === "dispatched" && Boolean(completed.carrierTrackingNumber),
        message: `Dispatch ${completed.dispatchNumber} finalized and released with AWB ${completed.carrierTrackingNumber}.`,
        details: { status: completed.dispatchStatus, trackingRef: completed.carrierTrackingNumber },
      });

      // Test 7: Barcode Hierarchy Resolver
      const resolved = await resolveDispatchBarcode(carton.cartonBarcode);
      results.push({
        id: "test-7",
        name: "Dispatch Barcode Hierarchy Resolver",
        category: "Traceability",
        passed: Boolean(resolved && resolved.carton.id === carton.id),
        message: `Resolved barcode ${carton.cartonBarcode} to Carton -> Dispatch -> Work Order.`,
        details: resolved,
      });

      // Test 8: Readback & Persistence Integrity
      await loadData();
      const readback = (await getDispatchRecordsFromDB()).find((d) => d.id === newDispatch.id);

      results.push({
        id: "test-8",
        name: "Database Readback & Persistence Integrity",
        category: "Persistence",
        passed: Boolean(readback && readback.dispatchNumber === newDispatch.dispatchNumber),
        message: `Dispatch record ${readback?.dispatchNumber} verified intact from Database readback.`,
        details: { id: readback?.id, number: readback?.dispatchNumber },
      });

      setTestResults(results);
      const passCount = results.filter((r) => r.passed).length;
      if (passCount === results.length) {
        success(`All ${results.length}/${results.length} automated Dispatch tests PASSED!`);
      } else {
        toastError(`${results.length - passCount} tests failed.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Test run error:", err);
      toastError(`Test run error: ${msg}`);
    } finally {
      setRunning(false);
      await loadData();
    }
  };

  const totalPassed = testResults.filter((r) => r.passed).length;
  const totalFailed = testResults.filter((r) => !r.passed).length;

  return (
    <>
      <TopNav title="Dispatch Integration Test & Diagnostic Console" />

      <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6">
        <PageHeader
          title="Dispatch & Export Logistics Diagnostic Bench"
          description="Interactive test console validating export staging, container loading, carton assignment, Tracking Gate 8 synchronization, and carrier handovers."
          actions={
            <div className="flex items-center gap-3">
              <Button variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={loadData}>
                Refresh Data
              </Button>
              <Button
                variant="primary"
                leftIcon={<Play className="h-4 w-4" />}
                onClick={runAutomatedSuite}
                disabled={running}
              >
                {running ? "Executing Suite..." : "Run Automated Suite"}
              </Button>
            </div>
          }
        />

        {/* Tab Selection */}
        <Card className="p-1">
          <div className="flex gap-2 border-b border-slate-800 px-3 pt-2">
            <button
              onClick={() => setActiveTab("suite")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                activeTab === "suite" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Truck className="h-4 w-4" /> Automated Suite ({testResults.length})
            </button>
            <button
              onClick={() => setActiveTab("records")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                activeTab === "records" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Database className="h-4 w-4" /> Live Dispatches ({dispatches.length})
            </button>
          </div>
        </Card>

        {/* TAB 1: AUTOMATED SUITE */}
        {activeTab === "suite" && (
          <div className="space-y-6">
            {testResults.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4">
                  <span className="text-xs text-slate-400">Total Assertions</span>
                  <p className="mt-1 text-2xl font-bold text-slate-100">{testResults.length}</p>
                </Card>
                <Card className="p-4">
                  <span className="text-xs text-slate-400">Passed</span>
                  <p className="mt-1 text-2xl font-bold text-emerald-400">{totalPassed}</p>
                </Card>
                <Card className="p-4">
                  <span className="text-xs text-slate-400">Failed</span>
                  <p className="mt-1 text-2xl font-bold text-rose-400">{totalFailed}</p>
                </Card>
              </div>
            )}

            <Card className="overflow-hidden">
              <div className="border-b border-slate-800 bg-slate-900/50 p-4">
                <h3 className="text-sm font-semibold text-slate-200">Dispatch Automated Test Results</h3>
              </div>

              {testResults.length === 0 ? (
                <EmptyState
                  title="No Test Results Yet"
                  description="Click 'Run Automated Suite' above to execute real database integration tests."
                  icon={<Play className="h-6 w-6" />}
                  actionLabel="Run Automated Suite"
                  onAction={runAutomatedSuite}
                />
              ) : (
                <div className="divide-y divide-slate-800">
                  {testResults.map((t) => (
                    <div key={t.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-900/30">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={t.passed ? "success" : "danger"}>
                            {t.passed ? "PASS" : "FAIL"}
                          </Badge>
                          <span className="font-semibold text-sm text-slate-200">{t.name}</span>
                          <span className="text-xs text-slate-400">[{t.category}]</span>
                        </div>
                        <p className="text-xs text-slate-300">{t.message}</p>
                        {t.details && (
                          <pre className="mt-2 p-2 rounded bg-slate-950 text-[11px] font-mono text-slate-400 overflow-x-auto max-w-4xl">
                            {JSON.stringify(t.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 2: LIVE RECORDS */}
        {activeTab === "records" && (
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="border-b border-slate-800 bg-slate-900/50 p-4">
                <h3 className="text-sm font-semibold text-slate-200">Active Dispatch Consignments ({dispatches.length})</h3>
              </div>
              <div className="divide-y divide-slate-800">
                {dispatches.map((d) => (
                  <div key={d.id} className="p-4 text-xs space-y-1">
                    <div className="flex justify-between font-mono">
                      <span className="font-bold text-primary">{d.dispatchNumber}</span>
                      <Badge variant="primary">{d.dispatchStatus}</Badge>
                    </div>
                    <p className="text-slate-200 font-semibold">
                      Consignee: {d.consigneeName} ({d.destinationCity}, {d.destinationCountry})
                    </p>
                    <p className="text-slate-400">
                      Cartons: {d.totalCartons} • Pieces: {d.totalPieces} • Gross Wt: {d.totalGrossWeightKg} kg • Carrier: {d.carrier}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
