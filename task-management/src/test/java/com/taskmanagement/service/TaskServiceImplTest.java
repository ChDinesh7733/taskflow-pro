package com.taskmanagement.service;

import com.taskmanagement.dto.TaskRequestDTO;
import com.taskmanagement.dto.TaskResponseDTO;
import com.taskmanagement.entity.Task;
import com.taskmanagement.entity.TaskStatus;
import com.taskmanagement.exception.TaskNotFoundException;
import com.taskmanagement.mapper.TaskMapper;
import com.taskmanagement.repository.TaskRepository;
import com.taskmanagement.service.impl.TaskServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for TaskServiceImpl.
 * Uses Mockito to isolate the service layer from repository and mapper.
 *
 * Multi-user note: every service method is owner-scoped; {@link #OWNER} plays
 * the role of the authenticated caller.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("TaskServiceImpl Unit Tests")
class TaskServiceImplTest {

    private static final UUID OWNER = UUID.randomUUID();

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private TaskMapper taskMapper;

    @InjectMocks
    private TaskServiceImpl taskService;

    @BeforeEach
    void setUp() {
        // Inject @Value fields
        ReflectionTestUtils.setField(taskService, "defaultDelayMinutes", 2);
        ReflectionTestUtils.setField(taskService, "defaultCompletionDelayMinutes", 5);
    }

    // ── CREATE ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("createTask: throws IllegalArgumentException when title is blank")
    void createTask_blankTitle_throwsIllegalArgument() {
        TaskRequestDTO dto = TaskRequestDTO.builder().title("  ").build();
        assertThatThrownBy(() -> taskService.createTask(dto, OWNER))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Title is required");
    }

    @Test
    @DisplayName("createTask: throws IllegalArgumentException when title is null")
    void createTask_nullTitle_throwsIllegalArgument() {
        TaskRequestDTO dto = TaskRequestDTO.builder().title(null).build();
        assertThatThrownBy(() -> taskService.createTask(dto, OWNER))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("createTask: sets scheduled times using default delays")
    void createTask_setsScheduledTimesWithDefaults() {
        TaskRequestDTO dto = TaskRequestDTO.builder()
                .title("Test Task")
                .description("A description")
                .build();

        Task savedTask = Task.builder()
                .id(UUID.randomUUID())
                .title("Test Task")
                .status(TaskStatus.PENDING)
                .scheduledStartTime(LocalDateTime.now().plusMinutes(2))
                .scheduledCompletionTime(LocalDateTime.now().plusMinutes(7))
                .build();

        TaskResponseDTO responseDTO = TaskResponseDTO.builder()
                .id(savedTask.getId())
                .title("Test Task")
                .status(TaskStatus.PENDING)
                .build();

        when(taskRepository.save(any(Task.class))).thenReturn(savedTask);
        when(taskMapper.toResponseDTO(savedTask)).thenReturn(responseDTO);

        TaskResponseDTO result = taskService.createTask(dto, OWNER);

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Test Task");
        assertThat(result.getStatus()).isEqualTo(TaskStatus.PENDING);

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository, times(1)).save(captor.capture());
        assertThat(captor.getValue().getUserId()).isEqualTo(OWNER);
        verify(taskMapper, times(1)).toResponseDTO(savedTask);
    }

    @Test
    @DisplayName("createTask: uses custom delayMinutes when provided")
    void createTask_usesCustomDelay() {
        TaskRequestDTO dto = TaskRequestDTO.builder()
                .title("Custom Delay Task")
                .delayMinutes(10)
                .completionDelayMinutes(15)
                .build();

        Task savedTask = Task.builder()
                .id(UUID.randomUUID())
                .title("Custom Delay Task")
                .status(TaskStatus.PENDING)
                .scheduledStartTime(LocalDateTime.now().plusMinutes(10))
                .scheduledCompletionTime(LocalDateTime.now().plusMinutes(25))
                .build();

        TaskResponseDTO responseDTO = TaskResponseDTO.builder()
                .id(savedTask.getId())
                .title("Custom Delay Task")
                .status(TaskStatus.PENDING)
                .scheduledStartTime(savedTask.getScheduledStartTime())
                .build();

        when(taskRepository.save(any(Task.class))).thenReturn(savedTask);
        when(taskMapper.toResponseDTO(savedTask)).thenReturn(responseDTO);

        TaskResponseDTO result = taskService.createTask(dto, OWNER);

        assertThat(result).isNotNull();
        // scheduledStartTime should be ~10 min from now
        assertThat(result.getScheduledStartTime()).isAfter(LocalDateTime.now().plusMinutes(9));
    }

    // ── READ ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("getAllTasks: returns only the owner's tasks mapped to DTOs")
    void getAllTasks_returnsMappedList() {
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();
        List<Task> tasks = List.of(
                Task.builder().id(id1).title("Task 1").status(TaskStatus.PENDING).userId(OWNER).build(),
                Task.builder().id(id2).title("Task 2").status(TaskStatus.COMPLETED).userId(OWNER).build()
        );
        List<TaskResponseDTO> dtos = List.of(
                TaskResponseDTO.builder().id(id1).title("Task 1").status(TaskStatus.PENDING).build(),
                TaskResponseDTO.builder().id(id2).title("Task 2").status(TaskStatus.COMPLETED).build()
        );

        when(taskRepository.findByUserIdOrderByCreatedAtDesc(OWNER)).thenReturn(tasks);
        when(taskMapper.toResponseDTOList(tasks)).thenReturn(dtos);

        List<TaskResponseDTO> result = taskService.getAllTasks(OWNER);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getTitle()).isEqualTo("Task 1");
        assertThat(result.get(1).getStatus()).isEqualTo(TaskStatus.COMPLETED);
        verify(taskRepository).findByUserIdOrderByCreatedAtDesc(OWNER);
    }

    @Test
    @DisplayName("getTaskById: returns DTO when the caller owns the task")
    void getTaskById_found_returnsDTO() {
        UUID id = UUID.randomUUID();
        Task task = Task.builder().id(id).title("Found Task").status(TaskStatus.PENDING).userId(OWNER).build();
        TaskResponseDTO dto = TaskResponseDTO.builder().id(id).title("Found Task").status(TaskStatus.PENDING).build();

        when(taskRepository.findByIdAndUserId(id, OWNER)).thenReturn(Optional.of(task));
        when(taskMapper.toResponseDTO(task)).thenReturn(dto);

        TaskResponseDTO result = taskService.getTaskById(id, OWNER);

        assertThat(result.getId()).isEqualTo(id);
        assertThat(result.getTitle()).isEqualTo("Found Task");
    }

    @Test
    @DisplayName("getTaskById: throws TaskNotFoundException when task missing")
    void getTaskById_notFound_throwsException() {
        UUID id = UUID.randomUUID();
        when(taskRepository.findByIdAndUserId(id, OWNER)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.getTaskById(id, OWNER))
                .isInstanceOf(TaskNotFoundException.class);
    }

    @Test
    @DisplayName("getTaskById: throws TaskNotFoundException for another user's task (no leak)")
    void getTaskById_foreignTask_throwsNotFound() {
        UUID id = UUID.randomUUID();
        UUID stranger = UUID.randomUUID();
        // Repository correctly refuses to return a task owned by someone else.
        when(taskRepository.findByIdAndUserId(id, OWNER)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.getTaskById(id, OWNER))
                .isInstanceOf(TaskNotFoundException.class);
        verify(taskRepository, never()).findByIdAndUserId(id, stranger);
    }

    // ── UPDATE ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("updateTask: updates title and description")
    void updateTask_updatesTitleAndDescription() {
        UUID id = UUID.randomUUID();
        Task existing = Task.builder().id(id).title("Old Title").description("Old Desc").status(TaskStatus.PENDING).userId(OWNER).build();
        Task updated  = Task.builder().id(id).title("New Title").description("New Desc").status(TaskStatus.PENDING).userId(OWNER).build();
        TaskResponseDTO dto = TaskResponseDTO.builder().id(id).title("New Title").status(TaskStatus.PENDING).build();

        when(taskRepository.findByIdAndUserId(id, OWNER)).thenReturn(Optional.of(existing));
        when(taskRepository.save(existing)).thenReturn(updated);
        when(taskMapper.toResponseDTO(updated)).thenReturn(dto);

        TaskRequestDTO request = TaskRequestDTO.builder().title("New Title").description("New Desc").build();
        TaskResponseDTO result = taskService.updateTask(id, OWNER, request);

        assertThat(result.getTitle()).isEqualTo("New Title");
        verify(taskRepository).save(existing);
    }

    @Test
    @DisplayName("updateTask: throws TaskNotFoundException for unknown ID")
    void updateTask_notFound_throwsException() {
        UUID id = UUID.randomUUID();
        when(taskRepository.findByIdAndUserId(id, OWNER)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.updateTask(id, OWNER, TaskRequestDTO.builder().title("X").build()))
                .isInstanceOf(TaskNotFoundException.class);
    }

    // ── DELETE ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("deleteTask: deletes task when the caller owns it")
    void deleteTask_existingTask_deletesSuccessfully() {
        UUID id = UUID.randomUUID();
        Task task = Task.builder().id(id).title("To Delete").status(TaskStatus.PENDING).userId(OWNER).build();

        when(taskRepository.findByIdAndUserId(id, OWNER)).thenReturn(Optional.of(task));

        taskService.deleteTask(id, OWNER);

        verify(taskRepository, times(1)).delete(task);
    }

    @Test
    @DisplayName("deleteTask: throws TaskNotFoundException for unknown ID")
    void deleteTask_notFound_throwsException() {
        UUID id = UUID.randomUUID();
        when(taskRepository.findByIdAndUserId(id, OWNER)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.deleteTask(id, OWNER))
                .isInstanceOf(TaskNotFoundException.class);

        verify(taskRepository, never()).delete(any());
    }

    // ── FILTER BY STATUS ─────────────────────────────────────────────────────

    @Test
    @DisplayName("getTasksByStatus: returns only the owner's matching tasks")
    void getTasksByStatus_returnsFilteredList() {
        Task pendingTask = Task.builder().id(UUID.randomUUID()).title("Pending")
                .status(TaskStatus.PENDING).userId(OWNER).build();
        List<Task> tasks = List.of(pendingTask);
        List<TaskResponseDTO> dtos = List.of(
                TaskResponseDTO.builder().id(pendingTask.getId()).title("Pending").status(TaskStatus.PENDING).build()
        );

        when(taskRepository.findByUserIdAndStatus(OWNER, TaskStatus.PENDING)).thenReturn(tasks);
        when(taskMapper.toResponseDTOList(tasks)).thenReturn(dtos);

        List<TaskResponseDTO> result = taskService.getTasksByStatus(TaskStatus.PENDING, OWNER);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo(TaskStatus.PENDING);
        verify(taskRepository).findByUserIdAndStatus(OWNER, TaskStatus.PENDING);
    }
}
