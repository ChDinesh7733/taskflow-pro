package com.taskmanagement;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Main entry point for the Task Management System.
 *
 * Features:
 * - RESTful CRUD operations for Tasks
 * - UUID primary keys for Tasks
 * - Auto status transitions: PENDING → IN_PROGRESS after a configurable delay
 * - Async scheduling for non-blocking status updates
 */
@SpringBootApplication
@EnableScheduling
@EnableAsync
public class TaskManagementApplication {

    public static void main(String[] args) {
        SpringApplication.run(TaskManagementApplication.class, args);
    }
}
