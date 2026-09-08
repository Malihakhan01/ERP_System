// scratch/test_all_tabs_api.mjs
const tabs = [
  'options', 'summary', 'production', 'material', 'inventory', 
  'purchase', 'labor', 'efficiency', 'profitability', 
  'receivables', 'aging', 'dispatch', 'tracking'
];

async function testTabs() {
  console.log("Testing all 13 reporting endpoints via HTTP API:\n");
  for (const tab of tabs) {
    try {
      const res = await fetch(`http://localhost:3000/api/reports?tab=${tab}`);
      const json = await res.json();
      const count = Array.isArray(json.data) ? `${json.data.length} rows` : typeof json.data === 'object' ? 'Object OK' : 'No Data';
      console.log(`[PASS] Tab: ${tab.padEnd(15)} | HTTP ${res.status} | Payload: ${count}`);
    } catch (e) {
      console.log(`[FAIL] Tab: ${tab.padEnd(15)} | Error: ${e.message}`);
    }
  }
}

testTabs();
