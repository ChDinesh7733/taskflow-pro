import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subtaskApi } from '../api/subtaskApi';

export function useSubtasks(taskId) {
  return useQuery({
    queryKey: ['subtasks', taskId],
    queryFn:  () => subtaskApi.list(taskId),
    enabled:  !!taskId,
    staleTime: 10_000,
  });
}

export function useAddSubtask(taskId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title) => subtaskApi.add(taskId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useToggleSubtask(taskId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subtaskId) => subtaskApi.toggle(taskId, subtaskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskStats'] });
    },
  });
}

export function useDeleteSubtask(taskId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subtaskId) => subtaskApi.remove(taskId, subtaskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
