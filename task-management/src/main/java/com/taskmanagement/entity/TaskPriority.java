package com.taskmanagement.entity;

/**
 * Priority levels for a task.
 * Used to communicate urgency — does not affect automatic status transitions.
 */
public enum TaskPriority {

    /** Low urgency. Can be handled when time allows. */
    LOW,

    /** Default priority. Normal workload. */
    MEDIUM,

    /** High urgency. Should be addressed soon. */
    HIGH
}
