import { NextResponse } from "next/server";
import {
  getReportingFilterOptionsFromMySQL,
  getProductionReportFromMySQL,
  getMaterialConsumptionReportFromMySQL,
  getInventoryReportFromMySQL,
  getPurchaseReportFromMySQL,
  getLaborCostReportFromMySQL,
  getProductionEfficiencyReportFromMySQL,
  getOrderProfitabilityReportFromMySQL,
  getClientReceivableReportFromMySQL,
  getInvoiceAgingReportFromMySQL,
  getDispatchReportFromMySQL,
  getTrackingPerformanceReportFromMySQL,
  getExecutiveFinancialSummaryFromMySQL,
} from "@/lib/mysql/reports-db";
import { DateFilterRange, ReportFilterOptions } from "@/lib/reports-engine";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "summary";
    const dateRangeType = (searchParams.get("dateRangeType") || "month") as DateFilterRange["type"];
    const clientId = searchParams.get("clientId") || undefined;
    const status = searchParams.get("status") || undefined;

    const filters: ReportFilterOptions = {
      dateRange: { type: dateRangeType },
      clientId: clientId !== "all" ? clientId : undefined,
      status: status !== "all" ? status : undefined,
    };

    if (tab === "options") {
      const options = await getReportingFilterOptionsFromMySQL();
      return NextResponse.json({ success: true, data: options });
    }

    if (tab === "summary") {
      const data = await getExecutiveFinancialSummaryFromMySQL(filters);
      return NextResponse.json({ success: true, data });
    }

    if (tab === "production") {
      const data = await getProductionReportFromMySQL(filters);
      return NextResponse.json({ success: true, data });
    }

    if (tab === "material") {
      const data = await getMaterialConsumptionReportFromMySQL(filters);
      return NextResponse.json({ success: true, data });
    }

    if (tab === "inventory") {
      const data = await getInventoryReportFromMySQL();
      return NextResponse.json({ success: true, data });
    }

    if (tab === "purchase") {
      const data = await getPurchaseReportFromMySQL(filters);
      return NextResponse.json({ success: true, data });
    }

    if (tab === "labor") {
      const data = await getLaborCostReportFromMySQL();
      return NextResponse.json({ success: true, data });
    }

    if (tab === "efficiency") {
      const data = await getProductionEfficiencyReportFromMySQL();
      return NextResponse.json({ success: true, data });
    }

    if (tab === "profitability") {
      const data = await getOrderProfitabilityReportFromMySQL(filters);
      return NextResponse.json({ success: true, data });
    }

    if (tab === "receivables") {
      const data = await getClientReceivableReportFromMySQL();
      return NextResponse.json({ success: true, data });
    }

    if (tab === "aging") {
      const data = await getInvoiceAgingReportFromMySQL(filters);
      return NextResponse.json({ success: true, data });
    }

    if (tab === "dispatch") {
      const data = await getDispatchReportFromMySQL(filters);
      return NextResponse.json({ success: true, data });
    }

    if (tab === "tracking") {
      const data = await getTrackingPerformanceReportFromMySQL();
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json(
      { success: false, message: `Unknown tab: ${tab}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Reports API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load report data." },
      { status: 500 }
    );
  }
}
