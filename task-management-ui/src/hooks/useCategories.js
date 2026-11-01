import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import categoryApi from '../api/categoryApi';
import toast from 'react-hot-toast';

export const CATEGORY_KEYS = {
  all: ['categories'],
};

/** Fetches the logged-in user's categories. Cached for 5 minutes. */
export function useCategories() {
  return useQuery({
    queryKey: CATEGORY_KEYS.all,
    queryFn:  categoryApi.getAll,
    staleTime: 5 * 60 * 1000,
    placeholderData: () => [],
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: categoryApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
      toast.success('Project created!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to create project');
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: categoryApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
      toast.success('Project removed');
    },
  });
}
