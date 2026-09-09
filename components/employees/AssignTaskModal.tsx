"use client";

import * as React from "react";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { FormField, FormSection } from "@/components/forms/FormField";
import { useToast } from "@/components/ui/Toast";
import {
  CheckSquare,
  Calendar,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  User,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { createEmployeeTask, TaskPriority, TaskType } from "@/lib/services/tasks-service";

interface EmployeeOption {
  id: string;
  name: string;
  department?: string;
  designation?: string;
}

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskAssigned?: () => void;
  employees: EmployeeOption[];
  preselectedEmployeeId?: string;
}

const PRIORITY_OPTIONS: Array<{
  key: TaskPriority;
  label: string;
  badge: string;
  colorClass: string;
  activeClass: string;
  icon: any;
}> = [
  {
    key: "urgent",
    label: "Urgent",
    badge: "Immediate Action",
    colorClass: "border-slate-200 hover:border-rose-300 hover:bg-rose-50/40 text-slate-700",
    activeClass: "border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20 font-bold",
    icon: AlertCircle,
  },
  {
    key: "high",
    label: "High",
    badge: "Priority Floor",
    colorClass: "border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-slate-700",
    activeClass: "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 font-bold",
    icon: AlertTriangle,
  },
  {
    key: "normal",
    label: "Normal",
    badge: "Standard Duty",
    colorClass: "border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-slate-700",
    activeClass: "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-600/20 font-bold",
    icon: Clock,
  },
  {
    key: "low",
    label: "Low",
    badge: "Routine Schedule",
    colorClass: "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700",
    activeClass: "border-slate-600 bg-slate-100 text-slate-900 ring-2 ring-slate-400/20 font-bold",
    icon: CheckCircle2,
  },
];

const QUICK_SUGGESTIONS = [
  "Overlock Seam Tension Calibration",
  "Fabric Bundle Inspection on Line 2",
  "Needle-to-Hook Clearance Check",
  "Export Master Carton Barcode Staging",
  "Preventive Lubrication & Blade Check",
];

export function AssignTaskModal({
  isOpen,
  onClose,
  onTaskAssigned,
  employees,
  preselectedEmployeeId,
}: AssignTaskModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const [employeeId, setEmployeeId] = React.useState(preselectedEmployeeId || "");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [taskType, setTaskType] = React.useState<TaskType>("general");
  const [priority, setPriority] = React.useState<TaskPriority>("normal");
  const [dueDate, setDueDate] = React.useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [dueTime, setDueTime] = React.useState("17:00");

  React.useEffect(() => {
    if (preselectedEmployeeId) {
      setEmployeeId(preselectedEmployeeId);
    } else if (employees.length > 0 && !employeeId) {
      setEmployeeId(employees[0].id);
    }
  }, [preselectedEmployeeId, employees]);

  const selectedEmployeeObj = React.useMemo(() => {
    return employees.find((e) => String(e.id) === String(employeeId)) || null;
  }, [employees, employeeId]);

  const setPresetDate = (daysAhead: number) => {
    const target = new Date(Date.now() + daysAhead * 86400000);
    setDueDate(target.toISOString().split("T")[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ type: "error", message: "Task title is required." });
      return;
    }
    if (!employeeId) {
      toast({ type: "error", message: "Please select an employee." });
      return;
    }

    setLoading(true);
    try {
      const selectedEmp = employees.find((emp) => String(emp.id) === String(employeeId));
      const success = await createEmployeeTask({
        title: title.trim(),
        description: description.trim() || undefined,
        taskType,
        priority,
        assignedToEmployeeId: employeeId,
        assignedToName: selectedEmp?.name || "Factory Worker",
        dueDate,
        dueTime,
      });

      if (success) {
        toast({
          type: "success",
          message: "Task Assigned",
          description: `Task successfully delegated to ${selectedEmp?.name || "employee"}.`,
        });
        setTitle("");
        setDescription("");
        onClose();
        if (onTaskAssigned) onTaskAssigned();
      } else {
        toast({
          type: "error",
          message: "Failed to Assign",
          description: "Could not record task. Please verify server connection.",
        });
      }
    } catch {
      toast({
        type: "error",
        message: "Unexpected Error",
        description: "An error occurred while delegating task.",
      });
    } finally {
      setLoading(false);
    }
  };

  const employeeSelectOptions = React.useMemo(() => {
    const list = employees.map((emp) => ({
      value: emp.id,
      label: `${emp.name} — ${emp.designation || "Operator"} (${emp.department || "Production"})`,
    }));
    return [{ value: "", label: "Select Employee..." }, ...list];
  }, [employees]);

  const taskTypeOptions = [
    { value: "stitching", label: "Stitching Line Duty & Sewing" },
    { value: "cutting", label: "Cutting, Marker Lay & Spreading" },
    { value: "qa_inspection", label: "QA & In-Line Stitch Inspection" },
    { value: "packing", label: "Packing, Polybagging & Tagging" },
    { value: "machine_setup", label: "Machine Calibration & Needle Setup" },
    { value: "maintenance", label: "Preventive Mechanical Maintenance" },
    { value: "general", label: "General Floor Operations & Logistics" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delegate Employee Operational Task"
      description="Assign shopfloor duties, machine adjustments, QA audits, and deliverables with deadline tracking."
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Info Banner with Selected Employee Pill */}
        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-blue-950">
                Floor Task Delegation & Quality Accountability
              </p>
              <p className="text-blue-700/90 text-[11px] mt-0.5">
                Tasks assigned here populate the employee&apos;s operational work log with deadline tracking.
              </p>
            </div>
          </div>

          {selectedEmployeeObj && (
            <div className="flex items-center gap-2 bg-white/90 px-3 py-1.5 rounded-lg border border-blue-200 shadow-2xs shrink-0">
              <User className="h-3.5 w-3.5 text-blue-600" />
              <div className="text-[11px] leading-tight">
                <span className="font-bold text-slate-900 block truncate max-w-[200px]">
                  {selectedEmployeeObj.name}
                </span>
                <span className="text-slate-500 text-[10px]">
                  {selectedEmployeeObj.designation || "Worker"} • {selectedEmployeeObj.department || "Factory"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 1: Target & Category */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <User className="h-4 w-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Assignment Target & Department Scope
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Assigned Employee Workforce" required>
              <Select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                options={employeeSelectOptions}
                required
              />
            </FormField>

            <FormField label="Operational Department / Task Category" required>
              <Select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as TaskType)}
                options={taskTypeOptions}
              />
            </FormField>
          </div>
        </div>

        {/* SECTION 2: Priority Level (Interactive Cards) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Priority & Urgency Classification
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Selected: <strong className="capitalize text-slate-900 font-bold">{priority}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRIORITY_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = priority === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPriority(opt.key)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-2xs ${
                    isSelected ? opt.activeClass : opt.colorClass
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                      {opt.badge}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-none">{opt.label}</p>
                    <p className="text-[10px] opacity-75 mt-0.5">Floor Level</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: Task Title & Presets */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Task Deliverable & Scheduling
            </h3>
          </div>

          <FormField label="Task Title / Duty Description *" required>
            <Input
              type="text"
              placeholder="e.g. Inspect seam tension on 4-thread Overlock Machine Line 1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </FormField>

          {/* Quick Suggestions Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Suggestions:
            </span>
            {QUICK_SUGGESTIONS.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => setTitle(sug)}
                className="text-[10.5px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors cursor-pointer border border-slate-200/80"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Due Date & Time (Generous 2-column layout with presets) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Target Completion Date *
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPresetDate(0)}
                    className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                  >
                    Today
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setPresetDate(1)}
                    className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                  >
                    Tomorrow
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setPresetDate(3)}
                    className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                  >
                    +3 Days
                  </button>
                </div>
              </div>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Target Shift Time (Deadline)
              </label>
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2">
            <FormField label="Technical Deliverables & Instructions (Optional)">
              <Textarea
                rows={3}
                placeholder="Detail specific machine numbers, style codes, quality tolerances, or inspection benchmarks..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>
          </div>
        </div>

        {/* Modal Footer */}
        <ModalFooter className="-mx-6 -mb-5 mt-6 px-6 py-4 rounded-b-2xl border-t border-slate-200 bg-slate-50/90">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={loading}
            size="md"
            leftIcon={<CheckSquare className="h-4 w-4" />}
          >
            Assign Task
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
