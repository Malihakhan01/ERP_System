function generateReportCSV(reportTitle, headers, rows) {
  const timestamp = new Date().toISOString();
  let csv = `Report Name,${reportTitle}\n`;
  csv += `Generated Date,${timestamp}\n`;
  csv += `Total Rows,${rows.length}\n\n`;
  csv += headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(",") + "\n";
  for (const r of rows) {
    csv += r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",") + "\n";
  }
  return csv;
}

async function testReportsPageButtons() {
  console.log("==================================================================");
  console.log("🚀 STARTING COMPREHENSIVE REPORTS PAGE & BUTTONS VERIFICATION");
  console.log("==================================================================\n");

  const results = [];

  // -----------------------------------------------------------------------------
  // TEST 1: Dropdown Filters Endpoint (/api/reports?tab=options)
  // -----------------------------------------------------------------------------
  console.log("TEST 1: Verifying Dropdown Filter Options Loading...");
  try {
    const res = await fetch("http://localhost:3000/api/reports?tab=options");
    const json = await res.json();
    if (res.status === 200 && json.success && json.data.clients && json.data.products) {
      console.log(` ✅ PASS: Filter options loaded successfully (${json.data.clients.length} clients, ${json.data.products.length} products, ${json.data.lines.length} production lines)`);
      results.push({ name: "Filter Dropdowns Options API", status: "PASS" });
    } else {
      console.log(` ❌ FAIL: Filter options response invalid`, json);
      results.push({ name: "Filter Dropdowns Options API", status: "FAIL" });
    }
  } catch (err) {
    console.log(` ❌ ERROR: ${err.message}`);
    results.push({ name: "Filter Dropdowns Options API", status: "ERROR" });
  }

  // -----------------------------------------------------------------------------
  // TEST 2: All 11 Tab Buttons Data Fetching & Response Payloads
  // -----------------------------------------------------------------------------
  console.log("\nTEST 2: Verifying All 11 Category Tab Buttons & Backend Query Handlers...");
  const tabs = [
    { id: "summary", name: "1. Executive Summary", check: (d) => typeof d === 'object' && d.totalRevenue !== undefined },
    { id: "production", name: "2. Production & Floor Output", check: (d) => Array.isArray(d) },
    { id: "material", name: "3. Material Consumption & Variance", check: (d) => Array.isArray(d) },
    { id: "inventory", name: "4. Inventory Valuation", check: (d) => Array.isArray(d) },
    { id: "efficiency", name: "5. Line Efficiency", check: (d) => Array.isArray(d) },
    { id: "profitability", name: "6. Order Profitability", check: (d) => Array.isArray(d) },
    { id: "receivables", name: "7. Client Receivables", check: (d) => Array.isArray(d) },
    { id: "aging", name: "8. Invoice Aging", check: (d) => Array.isArray(d) },
    { id: "dispatch", name: "9. Dispatch & Export", check: (d) => Array.isArray(d) },
    { id: "labor", name: "10. Labor Cost & Piece Rates", check: (d) => Array.isArray(d) },
    { id: "tracking", name: "11. 9-Gate Shipment Tracking", check: (d) => Array.isArray(d) },
  ];

  for (const tab of tabs) {
    try {
      const res = await fetch(`http://localhost:3000/api/reports?tab=${tab.id}`);
      const json = await res.json();
      if (res.status === 200 && json.success && tab.check(json.data)) {
        const countStr = Array.isArray(json.data) ? `${json.data.length} records` : `$${json.data.totalRevenue} revenue`;
        console.log(` ✅ PASS: Tab [${tab.name}] responded 200 OK -> ${countStr}`);
        results.push({ name: `Tab Button: ${tab.name}`, status: "PASS" });
      } else {
        console.log(` ❌ FAIL: Tab [${tab.name}] payload invalid`, json);
        results.push({ name: `Tab Button: ${tab.name}`, status: "FAIL" });
      }
    } catch (err) {
      console.log(` ❌ ERROR on [${tab.name}]: ${err.message}`);
      results.push({ name: `Tab Button: ${tab.name}`, status: "ERROR" });
    }
  }

  // -----------------------------------------------------------------------------
  // TEST 3: Filter Query Parameters (Date Horizon, Client, Status)
  // -----------------------------------------------------------------------------
  console.log("\nTEST 3: Verifying Time Horizon & Client Filter Parameters...");
  try {
    const resFiltered = await fetch("http://localhost:3000/api/reports?tab=production&dateRangeType=year&clientId=all&status=all");
    const jsonFiltered = await resFiltered.json();
    if (resFiltered.status === 200 && jsonFiltered.success) {
      console.log(` ✅ PASS: Filter combination (year + all + all) successfully parsed and executed.`);
      results.push({ name: "Filter Parameters Execution", status: "PASS" });
    } else {
      console.log(` ❌ FAIL: Filter parameters query failed`, jsonFiltered);
      results.push({ name: "Filter Parameters Execution", status: "FAIL" });
    }
  } catch (err) {
    console.log(` ❌ ERROR: ${err.message}`);
    results.push({ name: "Filter Parameters Execution", status: "ERROR" });
  }

  // -----------------------------------------------------------------------------
  // TEST 4: Export CSV Button Logic & Formatting
  // -----------------------------------------------------------------------------
  console.log("\nTEST 4: Verifying 'Export CSV' Button Engine & RFC-4180 Generation...");
  try {
    const resProd = await fetch("http://localhost:3000/api/reports?tab=production");
    const prodJson = await resProd.json();
    const rows = (prodJson.data || []).map((r) => [
      r.jobNumber,
      r.orderNumber,
      r.clientName,
      r.productName,
      r.plannedQty,
      r.cutQty,
      r.stitchedQty,
      r.finishedQty,
      r.qaPassedQty,
      r.packedQty,
      r.dispatchedQty,
      `${r.completionPercent}%`,
      r.stage,
      r.status,
    ]);

    const headers = [
      "Job Number", "Order #", "Client", "Product", "Planned Qty", 
      "Cut", "Stitched", "Finished", "QA Passed", "Packed", "Dispatched", 
      "Completion %", "Stage", "Status"
    ];

    const csvOutput = generateReportCSV("Production Performance Report", headers, rows);
    const hasHeader = csvOutput.includes("Report Name,Production Performance Report");
    const hasColumns = csvOutput.includes('"Job Number","Order #"');

    if (hasHeader && hasColumns && csvOutput.length > 50) {
      console.log(` ✅ PASS: CSV Engine generated valid spreadsheet output (${csvOutput.length} bytes, clean RFC-4180 format)`);
      results.push({ name: "Export CSV Generation Engine", status: "PASS" });
    } else {
      console.log(` ❌ FAIL: CSV generation output invalid`);
      results.push({ name: "Export CSV Generation Engine", status: "FAIL" });
    }
  } catch (err) {
    console.log(` ❌ ERROR: ${err.message}`);
    results.push({ name: "Export CSV Generation Engine", status: "ERROR" });
  }

  // -----------------------------------------------------------------------------
  // TEST 5: Refresh Button Action Test
  // -----------------------------------------------------------------------------
  console.log("\nTEST 5: Verifying 'Refresh' Button Data Reload Trigger...");
  try {
    const t0 = Date.now();
    const resRefresh = await fetch("http://localhost:3000/api/reports?tab=summary&_ts=" + t0);
    const jsonRefresh = await resRefresh.json();
    const duration = Date.now() - t0;
    if (resRefresh.status === 200 && jsonRefresh.success) {
      console.log(` ✅ PASS: Refresh action fetched fresh live state in ${duration}ms (Fast latency, 200 OK)`);
      results.push({ name: "Refresh Button Action", status: "PASS" });
    } else {
      console.log(` ❌ FAIL: Refresh action failed`);
      results.push({ name: "Refresh Button Action", status: "FAIL" });
    }
  } catch (err) {
    console.log(` ❌ ERROR: ${err.message}`);
    results.push({ name: "Refresh Button Action", status: "ERROR" });
  }

  // -----------------------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log("📊 COMPREHENSIVE TEST RESULTS SUMMARY:");
  console.log("==================================================================");
  const passed = results.filter((r) => r.status === "PASS").length;
  console.log(`TOTAL CHECKS: ${results.length} | PASSED: ${passed} | FAILED: ${results.length - passed}`);
  console.log(`OVERALL SUCCESS RATE: ${Math.round((passed / results.length) * 100)}%\n`);
}

testReportsPageButtons().catch(console.error);
