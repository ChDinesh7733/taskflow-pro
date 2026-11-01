package com.taskflow.service;

import com.taskflow.dto.task.*;
import com.taskflow.enums.TaskStatus;

import java.util.UUID;

public interface TaskService {

    TaskResponse    create(String ownerEmail, CreateTaskRequest req);

    TaskResponse    getById(String ownerEmail, UUID taskId);

    PagedTaskResponse list(String ownerEmail, TaskFilterRequest filter);

    TaskStatsResponse stats(String ownerEmail);

    TaskResponse    update(String ownerEmail, UUID taskId, UpdateTaskRequest req);

    TaskResponse    changeStatus(String ownerEmail, UUID taskId, TaskStatus newStatus);

    void            delete(String ownerEmail, UUID taskId);

    java.util.List<ActivityLogResponse> getActivity(UUID taskId);

    BulkOperationResponse bulkChangeStatus(String ownerEmail, BulkStatusRequest req);

    BulkOperationResponse bulkChangePriority(String ownerEmail, BulkPriorityRequest req);

    BulkOperationResponse bulkDelete(String ownerEmail, BulkDeleteRequest req);

    BulkOperationResponse bulkAssignCategory(String ownerEmail, BulkCategoryRequest req);
}
