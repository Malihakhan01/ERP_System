"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  CheckSquare,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Play,
  Search,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import {
  getEmployeeTasks,
  updateEmployeeTaskStatus,
  deleteEmployeeTask,
  EmployeeTaskRecord,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "@/lib/services/tasks-service";

interface EmployeeTasksListProps {
  employeeId?: string;
  employeeName?: string;
  onAssignTaskClick?: () => void;
  refreshKey?: number;
}

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; badgeVariant: "danger" | "warning" | "primary" | "default"; colorClass: string }
> = {
  urgent: { label: "Urgent", badgeVariant: "danger", colorClass: "text-rose-700 bg-rose-50 border-rose-200" },
  high: { label: "High", badgeVariant: "warning", colorClass: "text-amber-700 bg-amber-50 border-amber-200" },
  normal: { label: "Normal", badgeVariant: "primary", colorClass: "text-blue-700 bg-blue-50 border-blue-200" },
  low: { label: "Low", badgeVariant: "default", colorClass: "text-slate-600 bg-slate-100 border-slate-200" },
};

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; badgeVariant: "default" | "warning" | "success" | "danger" | "primary" }
> = {
  assigned: { label: "Assigned", badgeVariant: "default" },
  in_progress: { label: "In Progress", badgeVariant: "warning" },
  completed: { label: "Completed", badgeVariant: "success" },
  cancelled: { label: "Cancelled", badgeVariant: "danger" },
};

const TYPE_LABELS: Record<TaskType, string> = {
  general: "General Operations",
  cutting: "Cutting & Marker Lay",
  stitching: "Stitching Line Duty",
  qa_inspection: "QA & Inspection",
  packing: "Packing & Dispatch",
  maintenance: "Preventive Maintenance",
  machine_setup: "Machine Setup",
};

export function EmployeeTasksList({
  employeeId,
  employeeName,
  onAssignTaskClick,
  refreshKey = 0,
}: EmployeeTasksListProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = React.useState<EmployeeTaskRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");

  // Completion modal state
  const [completeTaskId, setCompleteTaskId] = React.useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = React.useState("");
  const [completing, setCompleting] = React.useState(false);

  // Delete modal state
  const [deleteTaskId, setDeleteTaskId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const fetchTasks = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEmployeeTasks({
        employeeId: employeeId || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
      });
      setTasks(data);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [employeeId, statusFilter, priorityFilter]);

  React.useEffect(() => {
    fetchTasks();
  }, [fetchTasks, refreshKey]);

  // Client-side search filtering
  const filteredTasks = React.useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.taskNumber && t.taskNumber.toLowerCase().includes(q)) ||
        (t.assignedToName && t.assignedToName.toLowerCase().includes(q))
    );
  }, [tasks, search]);

  // Metrics
  const metrics = React.useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === "assigned").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    return { total, pending, inProgress, completed };
  }, [tasks]);

  const handleStartTask = async (taskId: string) => {
    const success = await updateEmployeeTaskStatus(taskId, "in_progress");
    if (success) {
      toast({
        type: "success",
        message: "Task In Progress",
        description: "Task has been marked as In Progress.",
      });
      fetchTasks();
    } else {
      toast({
        type: "error",
        message: "Update Failed",
        description: "Could not update task status.",
      });
    }
  };

  const handleConfirmComplete = async () => {
    if (!completeTaskId) return;
    setCompleting(true);
    try {
      const success = await updateEmployeeTaskStatus(
        completeTaskId,
        "completed",
        completionNotes.trim() || undefined
      );
      if (success) {
        toast({
          type: "success",
          message: "Task Completed",
          description: "Task has been marked as completed successfully.",
        });
        setCompleteTaskId(null);
        setCompletionNotes("");
        fetchTasks();
      } else {
        toast({
          type: "error",
          message: "Completion Failed",
          description: "Could not complete task.",
        });
      }
    } finally {
      setCompleting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTaskId) return;
    setDeleting(true);
    try {
      const success = await deleteEmployeeTask(deleteTaskId);
      if (success) {
        toast({
          type: "success",
          message: "Task Deleted",
          description: "Task record has been removed.",
        });
        setDeleteTaskId(null);
        fetchTasks();
      } else {
        toast({
          type: "error",
          message: "Delete Failed",
          description: "Could not delete task.",
        });
      }
    } finally {
      setDeleting(false);
    }
  };

  const isOverdue = (dueDate: string, dueTime?: string, status?: TaskStatus) => {
    if (status === "completed" || status === "cancelled") return false;
    try {
      const due = new Date(`${dueDate}T${dueTime || "23:59:59"}`);
      return due < new Date();
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-4">
      {/* 4 Summary Stat Mini-Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white border border-slate-200/80 rounded-lg shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Tasks</span>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{metrics.total}</p>
        </div>
        <div className="p-3 bg-white border border-slate-200/80 rounded-lg shadow-xs">
          <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Pending Assignment</span>
          <p className="text-xl font-bold text-amber-700 mt-0.5">{metrics.pending}</p>
        </div>
        <div className="p-3 bg-white border border-slate-200/80 rounded-lg shadow-xs">
          <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">In Progress</span>
          <p className="text-xl font-bold text-blue-700 mt-0.5">{metrics.inProgress}</p>
        </div>
        <div className="p-3 bg-white border border-slate-200/80 rounded-lg shadow-xs">
          <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Completed</span>
          <p className="text-xl font-bold text-emerald-700 mt-0.5">{metrics.completed}</p>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200/80 rounded-lg shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>

        {onAssignTaskClick && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={onAssignTaskClick}
          >
            Assign Task
          </Button>
        )}
      </div>

      {/* Tasks Table / Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs bg-white border border-slate-200 rounded-lg">
          Loading assigned operational tasks...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-lg space-y-3">
          <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <CheckSquare className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No operational tasks found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {employeeName
              ? `There are no operational tasks currently assigned to ${employeeName}.`
              : "No tasks match the active filters."}
          </p>
          {onAssignTaskClick && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={onAssignTaskClick}
            >
              Assign First Task
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((task) => {
            const overdue = isOverdue(task.dueDate, task.dueTime, task.status);
            const priorityInfo = PRIORITY_CONFIG[task.priority || "normal"];
            const statusInfo = STATUS_CONFIG[task.status || "assigned"];

            return (
              <div
                key={task.id}
                className="bg-white border border-slate-200/80 rounded-lg p-4 shadow-xs hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {task.taskNumber}
                    </span>
                    <Badge variant={priorityInfo.badgeVariant} dot>
                      {priorityInfo.label}
                    </Badge>
                    <Badge variant={statusInfo.badgeVariant}>{statusInfo.label}</Badge>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                      {TYPE_LABELS[task.taskType || "general"] || task.taskType}
                    </span>
                    {overdue && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Overdue
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{task.title}</h4>

                  {task.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{task.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      Due: {task.dueDate} {task.dueTime ? `@ ${task.dueTime}` : ""}
                    </span>

                    {!employeeId && task.assignedToName && (
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        <User className="h-3 w-3 text-slate-400" />
                        Assigned To: {task.assignedToName}
                      </span>
                    )}

                    {task.assignedByName && (
                      <span>By: {task.assignedByName}</span>
                    )}

                    {task.completedAt && (
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed on {new Date(task.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {task.completionNotes && (
                    <div className="mt-2 text-[11px] bg-slate-50 p-2 rounded border border-slate-200 text-slate-700">
                      <span className="font-semibold text-slate-900">Completion Note:</span> {task.completionNotes}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {task.status === "assigned" && (
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Play className="h-3 w-3" />}
                      onClick={() => handleStartTask(task.id)}
                    >
                      Start
                    </Button>
                  )}

                  {task.status !== "completed" && task.status !== "cancelled" && (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<CheckCircle2 className="h-3 w-3" />}
                      onClick={() => {
                        setCompleteTaskId(task.id);
                        setCompletionNotes("");
                      }}
                    >
                      Complete
                    </Button>
                  )}

                  <button
                    type="button"
                    onClick={() => setDeleteTaskId(task.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Complete Task Modal */}
      <Modal
        isOpen={Boolean(completeTaskId)}
        onClose={() => setCompleteTaskId(null)}
        title="Mark Task as Completed"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Confirm completion of this operational task. You can optionally attach notes or remarks regarding work done.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Completion Notes / Remarks (Optional)
            </label>
            <textarea
              rows={3}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="e.g., Completed 500 pcs stitching on Line 2 without defect."
              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="sm" onClick={() => setCompleteTaskId(null)} disabled={completing}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
            onClick={handleConfirmComplete}
            disabled={completing}
          >
            {completing ? "Saving..." : "Confirm Completed"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Task Modal */}
      <Modal
        isOpen={Boolean(deleteTaskId)}
        onClose={() => setDeleteTaskId(null)}
        title="Delete Operational Task"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete this task? This action cannot be undone.
          </p>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTaskId(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteTask}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Task"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
