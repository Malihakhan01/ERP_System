// scratch/audit_http_routes.mjs
// Audit HTTP status and response times across all 39 FactoryOS routes on dev server

const routes = [
  "/",
  "/dashboard",
  "/products",
  "/materials",
  "/purchases",
  "/inventory",
  "/orders",
  "/quotations",
  "/invoices",
  "/costing",
  "/production",
  "/packing",
  "/dispatch",
  "/tracking",
  "/employees",
  "/employees/new",
  "/salaries",
  "/salaries/payroll-preview",
  "/advances",
  "/clients",
  "/reports",
  "/settings",
  "/settings/ai",
  "/ai",
  "/ai/mockup-generator",
  "/dev/stitching-integration-test",
  "/dev/qa-integration-test",
  "/dev/packing-integration-test",
  "/dev/dispatch-integration-test",
  "/dev/financial-integration-test",
  "/dev/production-integration-test",
];

async function checkRoutes() {
  console.log("================================================================================");
  console.log("FACTORYOS GARMENT ERP — HTTP ROUTES ACCESSIBILITY & LATENCY AUDIT");
  console.log("================================================================================");

  let successCount = 0;
  let failCount = 0;

  for (const r of routes) {
    const url = `http://localhost:3000${r}`;
    const start = Date.now();
    try {
      const res = await fetch(url);
      const latency = Date.now() - start;
      if (res.status === 200) {
        console.log(`[HTTP 200 OK] ${r.padEnd(36)} (${latency}ms)`);
        successCount++;
      } else {
        console.log(`[HTTP ${res.status}] ${r.padEnd(36)} (${latency}ms)`);
        failCount++;
      }
    } catch (e) {
      console.log(`[ERR] ${r.padEnd(36)} -> ${e.message}`);
      failCount++;
    }
  }

  console.log("================================================================================");
  console.log(`AUDIT RESULTS: ${successCount} Accessible (HTTP 200) | ${failCount} Failed`);
  console.log("================================================================================");
}

checkRoutes();
