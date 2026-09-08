async function testBarcodeScanner() {
  const barcode = "PKG-2026-0002";
  const res = await fetch(`http://localhost:3000/api/packing/verify?barcode=${barcode}`);
  console.log(`GET /api/packing/verify?barcode=${barcode} -> Status: ${res.status}`);
  const json = await res.json();
  console.log("Barcode Scan Result:", JSON.stringify(json, null, 2));
}

testBarcodeScanner();
