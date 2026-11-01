package com.taskflow.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflow.dto.auth.LoginRequest;
import com.taskflow.dto.auth.RegisterRequest;
import com.taskflow.dto.task.CreateTaskRequest;
import com.taskflow.dto.task.StatusTransitionRequest;
import com.taskflow.enums.TaskStatus;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)   // allows non-static @BeforeAll + shared state
@DisplayName("Task CRUD + Ownership + Status Transition Integration Tests")
class TaskIntegrationTest {

    @Autowired MockMvc         mockMvc;
    @Autowired ObjectMapper    mapper;

    String tokenAlice;
    String tokenBob;
    String aliceTaskId;

    /* ─── Auth helpers ───────────────────────────────────────────────── */

    private String registerAndLogin(String name, String email, String pw) throws Exception {
        // Register — ignore 409 if user already exists from a previous test run
        mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content(mapper.writeValueAsString(new RegisterRequest(name, email, pw))));

        // Login
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(new LoginRequest(email, pw))))
            .andExpect(status().isOk())
            .andReturn();

        return mapper.readTree(res.getResponse().getContentAsString())
            .get("accessToken").asText();
    }

    /* ─── One-time setup ─────────────────────────────────────────────── */

    @BeforeAll
    void setup() throws Exception {
        tokenAlice = registerAndLogin("Alice", "alice@integtest.com", "Test@1234");
        tokenBob   = registerAndLogin("Bob",   "bob@integtest.com",   "Test@1234");
    }

    /* ─── Tests ──────────────────────────────────────────────────────── */

    @Test @Order(1)
    @DisplayName("POST /api/tasks — Alice creates a task → 201")
    void aliceCreatesTask() throws Exception {
        var req = new CreateTaskRequest("Alice Task 1", "desc", null, null, null, null);

        MvcResult res = mockMvc.perform(post("/api/tasks")
                .header("Authorization", "Bearer " + tokenAlice)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(req)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.title").value("Alice Task 1"))
            .andExpect(jsonPath("$.status").value("TODO"))
            .andReturn();

        aliceTaskId = mapper.readTree(res.getResponse().getContentAsString())
            .get("id").asText();
        assertThat(aliceTaskId).isNotBlank();
    }

    @Test @Order(2)
    @DisplayName("GET /api/tasks/{id} — Alice can read her own task → 200")
    void aliceReadsOwnTask() throws Exception {
        mockMvc.perform(get("/api/tasks/" + aliceTaskId)
                .header("Authorization", "Bearer " + tokenAlice))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(aliceTaskId));
    }

    @Test @Order(3)
    @DisplayName("GET /api/tasks/{id} — Bob cannot see Alice's task → 404")
    void bobCannotSeeAliceTask() throws Exception {
        mockMvc.perform(get("/api/tasks/" + aliceTaskId)
                .header("Authorization", "Bearer " + tokenBob))
            .andExpect(status().isNotFound());
    }

    @Test @Order(4)
    @DisplayName("PATCH /api/tasks/{id}/status — Valid: TODO → IN_PROGRESS → 200")
    void validStatusTransition() throws Exception {
        var req = new StatusTransitionRequest(TaskStatus.IN_PROGRESS);
        mockMvc.perform(patch("/api/tasks/" + aliceTaskId + "/status")
                .header("Authorization", "Bearer " + tokenAlice)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(req)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test @Order(5)
    @DisplayName("PATCH /api/tasks/{id}/status — Invalid: DONE → IN_PROGRESS → 400")
    void invalidStatusTransition() throws Exception {
        // Move to DONE first (IN_PROGRESS → DONE is valid)
        mockMvc.perform(patch("/api/tasks/" + aliceTaskId + "/status")
                .header("Authorization", "Bearer " + tokenAlice)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(new StatusTransitionRequest(TaskStatus.DONE))))
            .andExpect(status().isOk());

        // DONE → IN_PROGRESS must return 400
        mockMvc.perform(patch("/api/tasks/" + aliceTaskId + "/status")
                .header("Authorization", "Bearer " + tokenAlice)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(new StatusTransitionRequest(TaskStatus.IN_PROGRESS))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Invalid Status Transition"));
    }

    @Test @Order(6)
    @DisplayName("GET /api/tasks — Alice only sees her own tasks")
    void aliceListOnlyOwnTasks() throws Exception {
        MvcResult res = mockMvc.perform(get("/api/tasks")
                .header("Authorization", "Bearer " + tokenAlice))
            .andExpect(status().isOk())
            .andReturn();

        var tree = mapper.readTree(res.getResponse().getContentAsString());
        var content = tree.get("content");
        // All tasks returned must belong to Alice
        content.forEach(node ->
            assertThat(node.get("ownerName").asText()).isEqualTo("Alice"));
    }

    @Test @Order(7)
    @DisplayName("GET /api/tasks/stats — Returns accurate counts")
    void statsMatchDb() throws Exception {
        MvcResult res = mockMvc.perform(get("/api/tasks/stats")
                .header("Authorization", "Bearer " + tokenAlice))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.total").isNumber())
            .andExpect(jsonPath("$.completionRate").isNumber())
            .andReturn();

        var stats = mapper.readTree(res.getResponse().getContentAsString());
        long  total     = stats.get("total").asLong();
        long  completed = stats.get("completed").asLong();
        double rate     = stats.get("completionRate").asDouble();

        double expected = total == 0 ? 0.0 : Math.round(completed * 10000.0 / total) / 100.0;
        assertThat(rate).isEqualTo(expected);
    }

    @Test @Order(8)
    @DisplayName("DELETE /api/tasks/{id} — Bob cannot delete Alice's task → 404")
    void bobCannotDeleteAliceTask() throws Exception {
        mockMvc.perform(delete("/api/tasks/" + aliceTaskId)
                .header("Authorization", "Bearer " + tokenBob))
            .andExpect(status().isNotFound());
    }

    @Test @Order(9)
    @DisplayName("GET /api/tasks — No token → 401")
    void noTokenReturns401() throws Exception {
        mockMvc.perform(get("/api/tasks"))
            .andExpect(status().isUnauthorized());
    }

    @Test @Order(10)
    @DisplayName("GET /api/tasks?status=TODO — Filter by status works")
    void filterByStatus() throws Exception {
        mockMvc.perform(get("/api/tasks?status=TODO")
                .header("Authorization", "Bearer " + tokenAlice))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray());
    }

    @Test @Order(11)
    @DisplayName("GET /api/tasks/{id} — Random UUID returns 404")
    void unknownTaskReturns404() throws Exception {
        mockMvc.perform(get("/api/tasks/" + UUID.randomUUID())
                .header("Authorization", "Bearer " + tokenAlice))
            .andExpect(status().isNotFound());
    }
}
