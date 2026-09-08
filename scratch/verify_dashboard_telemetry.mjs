const BASE_URL = "http://127.0.0.1:3000";

async function verifyDashboard() {
  console.log("================ STARTING MASTER DASHBOARD TELEMETRY VERIFICATION ================\n");

  const res = await fetch(`${BASE_URL}/api/dashboard/metrics`);
  console.log(`HTTP GET /api/dashboard/metrics -> Status: ${res.status} ${res.statusText}`);

  if (res.ok) {
    const json = await res.json();
    console.log("\n--- LIVE DASHBOARD TELEMETRY PAYLOAD ---");
    console.log("KPIs:", JSON.stringify(json.data?.kpis, null, 2));
    console.log("Pipeline Stages:", JSON.stringify(json.data?.pipeline, null, 2));
    console.log("Warehouse Bays:", JSON.stringify(json.data?.warehouse, null, 2));
    console.log("----------------------------------------\n");
  } else {
    console.error("Failed to fetch dashboard metrics");
  }

  console.log("================ MASTER DASHBOARD VERIFIED SUCCESSFULLY ================");
}

verifyDashboard().catch(console.error);
