/**
 * FactoryOS Garment ERP — Production API Service
 */

import { apiClient, ApiResponse } from "./client";
import type { ProductionJobRecord, CuttingPlanRecord } from "@/lib/services/production-service";

export async function fetchProductionJobs(params: {
  page?: number;
  stage?: string;
  status?: string;
  search?: string;
} = {}): Promise<ApiResponse<ProductionJobRecord[]>> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.stage && params.stage !== "all") query.set("stage", params.stage);
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.search) query.set("search", params.search);

  return apiClient<ProductionJobRecord[]>(`/production/jobs?${query.toString()}`);
}

export async function createProductionJob(payload: {
  order_id: string | number;
  job_number: string;
  planned_quantity: number;
  target_start_date: string;
  target_end_date: string;
  priority?: string;
  assigned_line?: string;
  supervisor_id?: string | number;
  supervisor_name?: string;
  special_instructions?: string;
  size_breakdown?: Record<string, number>;
}): Promise<ApiResponse<ProductionJobRecord>> {
  return apiClient<ProductionJobRecord>("/production/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchProductionJobById(id: string | number): Promise<ApiResponse<ProductionJobRecord>> {
  return apiClient<ProductionJobRecord>(`/production/jobs/${id}`);
}

export async function issueProductionMaterial(payload: {
  production_job_id: string | number;
  inventory_item_id: string | number;
  quantity: number;
  to_stage: string;
}): Promise<ApiResponse<any>> {
  return apiClient<any>("/production/material-issue", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
