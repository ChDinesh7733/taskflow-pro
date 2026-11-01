package com.taskmanagement.mapper;

import com.taskmanagement.dto.TaskResponseDTO;
import com.taskmanagement.entity.Task;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Mapper component for converting between Task entity and DTOs.
 * Keeps mapping logic separate from service and controller layers.
 */
@Component
public class TaskMapper {

    /**
     * Converts a Task entity to a TaskResponseDTO.
     *
     * @param task the Task entity
     * @return mapped TaskResponseDTO
     */
    public TaskResponseDTO toResponseDTO(Task task) {
        if (task == null) return null;

        return TaskResponseDTO.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus())
                .priority(task.getPriority())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .scheduledStartTime(task.getScheduledStartTime())
                .scheduledCompletionTime(task.getScheduledCompletionTime())
                .build();
    }

    /**
     * Converts a list of Task entities to a list of TaskResponseDTOs.
     *
     * @param tasks list of Task entities
     * @return list of mapped TaskResponseDTOs
     */
    public List<TaskResponseDTO> toResponseDTOList(List<Task> tasks) {
        return tasks.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }
}
