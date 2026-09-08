async function testPackingEndpoints() {
  const base = "http://localhost:3000";

  console.log("Testing Packing HTTP endpoints...");

  try {
    const res1 = await fetch(`${base}/api/packing`);
    console.log(`GET /api/packing -> Status ${res1.status}`);
    const data1 = await res1.json();
    console.log("Response /api/packing:", data1);
  } catch (err) {
    console.error("❌ /api/packing failed:", err.message);
  }

  try {
    const res2 = await fetch(`${base}/api/packing?view=queue`);
    console.log(`GET /api/packing?view=queue -> Status ${res2.status}`);
    const data2 = await res2.json();
    console.log("Response /api/packing?view=queue:", data2);
  } catch (err) {
    console.error("❌ /api/packing?view=queue failed:", err.message);
  }

  try {
    const res3 = await fetch(`${base}/api/packing/metrics`);
    console.log(`GET /api/packing/metrics -> Status ${res3.status}`);
    const data3 = await res3.json();
    console.log("Response /api/packing/metrics:", data3);
  } catch (err) {
    console.error("❌ /api/packing/metrics failed:", err.message);
  }

  try {
    const res4 = await fetch(`${base}/api/packing/cartons`);
    console.log(`GET /api/packing/cartons -> Status ${res4.status}`);
    const data4 = await res4.json();
    console.log("Response /api/packing/cartons:", data4);
  } catch (err) {
    console.error("❌ /api/packing/cartons failed:", err.message);
  }
}

testPackingEndpoints();
