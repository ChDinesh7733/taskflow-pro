import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import taskApi from '../api/taskApi';

/* ── Query keys ─────────────────────────────────────────────────────────── */
export const TASK_KEYS = {
  all:    ['tasks'],
  list:   (filters) => ['tasks', 'list', filters],
  stats:  ['taskStats'],       // ← separate root so invalidating ['tasks'] doesn't wipe stats data
  detail: (id) => ['tasks', 'detail', id],
};

/* ── Stats ──────────────────────────────────────────────────────────────── */
export function useTaskStats() {
  return useQuery({
    queryKey: TASK_KEYS.stats,
    queryFn:  taskApi.getStats,
    refetchInterval:      30_000,
    staleTime:            20_000,
    placeholderData: () => ({ total: 0, todo: 0, inProgress: 0, inReview: 0, completed: 0, cancelled: 0, completionRate: 0 }),
  });
}

/* ── Paginated task list ─────────────────────────────────────────────────── */
export function useTaskList(filters) {
  return useQuery({
    queryKey: TASK_KEYS.list(filters),
    queryFn:  () => taskApi.getTasks(filters),
    refetchInterval: 30_000,
    staleTime:       20_000,
    placeholderData: (prev) => prev,   // RQ v5 equivalent of keepPreviousData
  });
}

/* ── Create ─────────────────────────────────────────────────────────────── */
export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: taskApi.create,

    // Optimistic: prepend a temp task so the list updates instantly
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: TASK_KEYS.all });
      const snapshots = qc.getQueriesData({ queryKey: ['tasks', 'list'] });

      const tempTask = {
        id:                   `temp-${Date.now()}`,
        title:                payload.title,
        description:          payload.description ?? null,
        status:               'TODO',
        priority:             payload.priority   ?? 'MEDIUM',
        startDate:            payload.startDate  ?? null,
        dueDate:              payload.dueDate    ?? null,
        categoryId:           payload.categoryId ?? null,
        createdAt:            new Date().toISOString(),
        subtaskCount:         0,
        completedSubtaskCount: 0,
      };

      qc.setQueriesData({ queryKey: ['tasks', 'list'] }, (old) => {
        if (!old?.content) return old;
        return {
          ...old,
          content:       [tempTask, ...old.content],
          totalElements: old.totalElements + 1,
        };
      });

      return { snapshots };
    },

    onError: (err, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(
        err.response?.data?.message || err.message || 'Failed to create task'
      );
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASK_KEYS.all });
      qc.invalidateQueries({ queryKey: TASK_KEYS.stats });
      toast.success('Task created! 🎉');
    },
  });
}

/* ── Update ─────────────────────────────────────────────────────────────── */
export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => taskApi.update(id, payload),

    // Optimistic update
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: TASK_KEYS.all });
      const snapshots = qc.getQueriesData({ queryKey: TASK_KEYS.all });

      qc.setQueriesData({ queryKey: ['tasks', 'list'] }, (old) => {
        if (!old?.content) return old;
        return {
          ...old,
          content: old.content.map(t => t.id === id ? { ...t, ...payload } : t),
        };
      });

      return { snapshots };
    },
    onError: (err, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(err.message || 'Failed to update task');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASK_KEYS.all });
      toast.success('Task updated!');
    },
  });
}

/* ── Status change ───────────────────────────────────────────────────────── */
export function useChangeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => taskApi.changeStatus(id, status),

    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: TASK_KEYS.all });
      const snapshots = qc.getQueriesData({ queryKey: TASK_KEYS.all });

      qc.setQueriesData({ queryKey: ['tasks', 'list'] }, (old) => {
        if (!old?.content) return old;
        return {
          ...old,
          content: old.content.map(t =>
            t.id === id ? { ...t, status, completedAt: status === 'DONE' ? new Date().toISOString() : t.completedAt } : t
          ),
        };
      });
      return { snapshots };
    },
    onError: (err, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(err.message || 'Invalid status transition');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASK_KEYS.all });
      toast.success('Status updated!');
    },
  });
}

/* ── Delete ─────────────────────────────────────────────────────────────── */
export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: taskApi.remove,

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: TASK_KEYS.all });
      const snapshots = qc.getQueriesData({ queryKey: TASK_KEYS.all });

      qc.setQueriesData({ queryKey: ['tasks', 'list'] }, (old) => {
        if (!old?.content) return old;
        return { ...old, content: old.content.filter(t => t.id !== id), totalElements: old.totalElements - 1 };
      });
      return { snapshots };
    },
    onError: (err, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(err.message || 'Failed to delete task');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASK_KEYS.all });
      toast.success('Task deleted!');
    },
  });
}

/* ── Comments ───────────────────────────────────────────────────────────── */
export function useTaskComments(taskId) {
  return useQuery({
    queryKey: ['tasks', 'comments', taskId],
    queryFn: () => taskApi.getComments(taskId),
    enabled: !!taskId,
    staleTime: 5_000,
  });
}

export function useAddComment(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content) => taskApi.addComment(taskId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', 'comments', taskId] });
      qc.invalidateQueries({ queryKey: ['tasks', 'activity', taskId] });
      toast.success('Comment posted!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to post comment');
    },
  });
}

/* ── Activity Log ───────────────────────────────────────────────────────── */
export function useTaskActivity(taskId) {
  return useQuery({
    queryKey: ['tasks', 'activity', taskId],
    queryFn: () => taskApi.getActivity(taskId),
    enabled: !!taskId,
    staleTime: 5_000,
  });
}

/* ── Bulk Actions (Step 8.1) ───────────────────────────────────────────────── */
export function useBulkStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskIds, status }) => taskApi.bulkStatus(taskIds, status),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: TASK_KEYS.lists() });
      qc.invalidateQueries({ queryKey: TASK_KEYS.stats() });
      toast.success(data.message || 'Tasks updated!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update tasks');
    }
  });
}

export function useBulkPriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskIds, priority }) => taskApi.bulkPriority(taskIds, priority),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: TASK_KEYS.lists() });
      toast.success(data.message || 'Task priorities updated!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update priorities');
    }
  });
}

export function useBulkDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskIds) => taskApi.bulkDelete(taskIds),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: TASK_KEYS.lists() });
      qc.invalidateQueries({ queryKey: TASK_KEYS.stats() });
      toast.success(data.message || 'Tasks deleted!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete tasks');
    }
  });
}

export function useBulkCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskIds, categoryId }) => taskApi.bulkCategory(taskIds, categoryId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: TASK_KEYS.lists() });
      toast.success(data.message || 'Tasks assigned to project!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to assign project');
    }
  });
}

