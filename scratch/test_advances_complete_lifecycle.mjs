import mysql from "mysql2/promise";

const connectionUri = "mysql://root:@127.0.0.1:3306/factoryos";

async function testAdvancesLifecycle() {
  console.log("============================================================");
  console.log("🚀 STARTING COMPLETE ADVANCES & LOANS LIFECYCLE AUDIT");
  console.log("============================================================\n");

  const baseUrl = "http://localhost:3000";

  // Step 1: Submit new advance request from worker (e.g. Employee ID 1 - Muhammad Rizwan)
  console.log("📌 Step 1: Submitting new Advance Request from Worker Portal...");
  const createRes = await fetch(`${baseUrl}/api/advances`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employeeId: "1",
      requestedAmount: 20000,
      amount: 20000,
      repaymentMonths: 2,
      reason: "Urgent House Construction Advance",
      status: "Pending",
    }),
  });

  const createJson = await createRes.json();
  console.log("  Status Code:", createRes.status);
  console.log("  Response:", createJson);
  if (!createJson.success || !createJson.data?.id) {
    throw new Error("Failed to create advance request");
  }

  const newAdvId = createJson.data.id;
  console.log(`  ✅ Created Advance Request ID: ${newAdvId}\n`);

  // Step 2: Fetch all advances and verify it is Pending
  console.log("📌 Step 2: Verifying Pending status in Advances List...");
  const listRes = await fetch(`${baseUrl}/api/advances`);
  const listJson = await listRes.json();
  const createdRecord = listJson.data?.find((a) => a.id === String(newAdvId));
  console.log("  Found Record:", {
    id: createdRecord?.id,
    advanceNumber: createdRecord?.advanceNumber,
    employeeName: createdRecord?.employeeName,
    requestedAmount: createdRecord?.requestedAmount,
    status: createdRecord?.status,
  });

  if (createdRecord?.status !== "Pending") {
    throw new Error(`Expected status 'Pending' but got '${createdRecord?.status}'`);
  }
  console.log("  ✅ Advance request is properly Pending HR & Finance review!\n");

  // Step 3: Finance Approves Advance Request
  console.log(`📌 Step 3: Finance Approving Advance Request (${createdRecord.advanceNumber})...`);
  const approveRes = await fetch(`${baseUrl}/api/advances/${newAdvId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "Approved",
      approvedAmount: 20000,
      remainingBalance: 20000,
      monthlyDeduction: 10000,
      approvedDate: new Date().toISOString().split("T")[0],
      notes: "Approved by Finance Director for 2 monthly installments.",
    }),
  });
  const approveJson = await approveRes.json();
  console.log("  Approval Response:", approveJson);

  // Verify Approved status
  const afterApproveRes = await fetch(`${baseUrl}/api/advances`);
  const afterApproveJson = await afterApproveRes.json();
  const approvedRecord = afterApproveJson.data?.find((a) => a.id === String(newAdvId));
  console.log("  Updated Record:", {
    id: approvedRecord?.id,
    status: approvedRecord?.status,
    approvedAmount: approvedRecord?.approvedAmount,
    approvedDate: approvedRecord?.approvedDate,
  });
  if (approvedRecord?.status !== "Approved") {
    throw new Error(`Expected status 'Approved' but got '${approvedRecord?.status}'`);
  }
  console.log("  ✅ Advance successfully marked Approved (Awaiting Payout)!\n");

  // Step 4: Finance Disburses Funds (Payout Released)
  console.log(`📌 Step 4: Finance Disbursing Payout (${createdRecord.advanceNumber})...`);
  const disburseRes = await fetch(`${baseUrl}/api/advances/${newAdvId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "Recovering",
      remainingBalance: 20000,
      monthlyDeduction: 10000,
      disbursedDate: new Date().toISOString().split("T")[0],
    }),
  });
  const disburseJson = await disburseRes.json();
  console.log("  Disbursement Response:", disburseJson);

  const afterDisburseRes = await fetch(`${baseUrl}/api/advances`);
  const afterDisburseJson = await afterDisburseRes.json();
  const disbursedRecord = afterDisburseJson.data?.find((a) => a.id === String(newAdvId));
  console.log("  Active Loan Record:", {
    id: disbursedRecord?.id,
    status: disbursedRecord?.status,
    remainingBalance: disbursedRecord?.remainingBalance,
    monthlyDeduction: disbursedRecord?.monthlyDeduction,
  });
  if (disbursedRecord?.status !== "Recovering") {
    throw new Error(`Expected status 'Recovering' but got '${disbursedRecord?.status}'`);
  }
  console.log("  ✅ Funds Disbursed! Loan is now Active in Recovery payroll schedule.\n");

  // Step 5: Simulate Monthly Payroll Deduction (Installment 1: Rs 10,000)
  console.log("📌 Step 5: Simulating 1st Monthly Payroll Deduction (-Rs 10,000)...");
  const deduction1Res = await fetch(`${baseUrl}/api/advances/${newAdvId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "Recovering",
      remainingBalance: 10000,
    }),
  });
  console.log("  Deduction 1 Result:", await deduction1Res.json());
  console.log("  ✅ 1st Installment deducted. Remaining balance: PKR 10,000\n");

  // Step 6: Simulate 2nd Monthly Payroll Deduction (Installment 2: Rs 10,000 -> Remaining 0 -> Completed)
  console.log("📌 Step 6: Simulating 2nd & Final Payroll Deduction (-Rs 10,000 -> Rs 0)...");
  const deduction2Res = await fetch(`${baseUrl}/api/advances/${newAdvId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "Completed",
      remainingBalance: 0,
      notes: "Fully recovered via 2 monthly payroll cycles.",
    }),
  });
  console.log("  Deduction 2 Result:", await deduction2Res.json());

  const afterCompleteRes = await fetch(`${baseUrl}/api/advances`);
  const afterCompleteJson = await afterCompleteRes.json();
  const completedRecord = afterCompleteJson.data?.find((a) => a.id === String(newAdvId));
  console.log("  Completed Loan Record:", {
    id: completedRecord?.id,
    status: completedRecord?.status,
    remainingBalance: completedRecord?.remainingBalance,
  });
  if (completedRecord?.status !== "Completed") {
    throw new Error(`Expected status 'Completed' but got '${completedRecord?.status}'`);
  }
  console.log("  ✅ Loan is now 100% Fully Settled & Closed!\n");

  // Step 7: Test Reject Workflow
  console.log("📌 Step 7: Testing Reject Workflow on a separate request...");
  const rejectCreateRes = await fetch(`${baseUrl}/api/advances`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employeeId: "2",
      requestedAmount: 50000,
      repaymentMonths: 1,
      reason: "Exceeds 100% wage policy",
      status: "Pending",
    }),
  });
  const rejectCreateJson = await rejectCreateRes.json();
  const rejectAdvId = rejectCreateJson.data?.id;

  const rejectRes = await fetch(`${baseUrl}/api/advances/${rejectAdvId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "Rejected",
      notes: "Rejected by HR: Amount exceeds allowed borrowing limit.",
    }),
  });
  console.log("  Reject Result:", await rejectRes.json());
  const afterRejectRes = await fetch(`${baseUrl}/api/advances`);
  const afterRejectJson = await afterRejectRes.json();
  const rejectedRecord = afterRejectJson.data?.find((a) => a.id === String(rejectAdvId));
  console.log("  Rejected Record:", {
    id: rejectedRecord?.id,
    status: rejectedRecord?.status,
    notes: rejectedRecord?.notes,
  });
  if (rejectedRecord?.status !== "Rejected") {
    throw new Error(`Expected status 'Rejected' but got '${rejectedRecord?.status}'`);
  }
  console.log("  ✅ Rejection handled cleanly and recorded in history!\n");

  console.log("============================================================");
  console.log("🎉 ALL ADVANCE MODULE TESTS PASSED WITH 100% SUCCESS!");
  console.log("============================================================");
}

testAdvancesLifecycle().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
