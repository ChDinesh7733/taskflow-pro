package com.taskmanagement;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.mock.web.MockHttpSession;

import java.util.Arrays;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end security tests: registration, login, session lifecycle,
 * CSRF enforcement, rate limiting and per-user task isolation.
 *
 * Runs against H2 (MODE=MySQL) so no external database is required.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:authdb;MODE=MySQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "taskflow.seed.enabled=false",
        "taskflow.security.register.max-per-ip-hour=1000",
        "taskflow.security.login.max-attempts=5"
})
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Authentication & API security integration tests")
class AuthSecurityIntegrationTest {

    private static final String SESSION_COOKIE = "TASKFLOWSESSION";
    private static final String CSRF_COOKIE = "XSRF-TOKEN";

    @Autowired
    private MockMvc mockMvc;

    private String userAEmail;
    private String userBEmail;
    private final String password = "Sup3rSecret!";
    private MockHttpSession sessionA;
    private String taskAId;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String fetchCsrfToken() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").exists())
                .andReturn();
        return cookieValue(result, CSRF_COOKIE);
    }

    private String cookieValue(MvcResult result, String name) {
        return Arrays.stream(result.getResponse().getCookies())
                .filter(c -> name.equals(c.getName()))
                .findFirst()
                .map(Cookie::getValue)
                .orElse(null);
    }

    private void register(String email, String name) throws Exception {
        String csrf = fetchCsrfToken();
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-XSRF-TOKEN", csrf)
                        .cookie(new Cookie(CSRF_COOKIE, csrf))
                        .content("{\"name\":\"" + name + "\",\"email\":\"" + email
                                + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.email").value(email));
    }

    private MockHttpSession login(String email, String pass) throws Exception {
        String csrf = fetchCsrfToken();
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-XSRF-TOKEN", csrf)
                        .cookie(new Cookie(CSRF_COOKIE, csrf))
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + pass + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(session).as("login must establish a server-side session").isNotNull();
        return session;
    }

    @BeforeAll
    void setupUsers() {
        userAEmail = "alice-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local";
        userBEmail = "bob-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local";
    }

    // ── Tests ────────────────────────────────────────────────────────────────

    @Test
    @Order(1)
    @DisplayName("Unauthenticated API requests are rejected with 401 JSON")
    void tasksEndpoint_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/tasks"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Authentication required"));
    }

    @Test
    @Order(2)
    @DisplayName("Login without a CSRF token is rejected with 403")
    void login_withoutCsrfToken_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + userAEmail + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message",
                        org.hamcrest.Matchers.containsString("missing or invalid security token")));
    }

    @Test
    @Order(3)
    @DisplayName("Registration creates an account and rejects duplicates")
    void register_andDuplicate() throws Exception {
        register(userAEmail, "Alice");
        register(userBEmail, "Bob");

        // duplicate e-mail → 409
        String csrf = fetchCsrfToken();
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-XSRF-TOKEN", csrf)
                        .cookie(new Cookie(CSRF_COOKIE, csrf))
                        .content("{\"name\":\"Alice Again\",\"email\":\"" + userAEmail
                                + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    @Order(4)
    @DisplayName("Registration rejects weak passwords and invalid e-mails")
    void register_validationErrors() throws Exception {
        String csrf = fetchCsrfToken();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-XSRF-TOKEN", csrf)
                        .cookie(new Cookie(CSRF_COOKIE, csrf))
                        .content("{\"name\":\"Weak\",\"email\":\"weak@test.local\",\"password\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.password").exists());

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-XSRF-TOKEN", csrf)
                        .cookie(new Cookie(CSRF_COOKIE, csrf))
                        .content("{\"name\":\"No Mail\",\"email\":\"not-an-email\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(5)
    @DisplayName("Invalid credentials return 401 without leaking which field failed")
    void login_wrongPassword_returns401() throws Exception {
        String csrf = fetchCsrfToken();
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-XSRF-TOKEN", csrf)
                        .cookie(new Cookie(CSRF_COOKIE, csrf))
                        .content("{\"email\":\"" + userAEmail + "\",\"password\":\"WrongPass123!\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-XSRF-TOKEN", csrf)
                        .cookie(new Cookie(CSRF_COOKIE, csrf))
                        .content("{\"email\":\"ghost-" + UUID.randomUUID() + "@test.local\",\"password\":\"whatever123\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    @Order(6)
    @DisplayName("Valid login starts a session; /me reflects the signed-in user")
    void login_success_thenMe() throws Exception {
        sessionA = login(userAEmail, password);

        mockMvc.perform(get("/api/v1/auth/me").session(sessionA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(userAEmail))
                .andExpect(jsonPath("$.data.name").value("Alice"));
    }

    @Test
    @Order(7)
    @DisplayName("Authenticated user can run the full task CRUD flow")
    void taskCrud_authenticated() throws Exception {
        String csrf = fetchCsrfToken();

        MvcResult created = mockMvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-XSRF-TOKEN", csrf)
                        .session(sessionA).cookie(new Cookie(CSRF_COOKIE, csrf))
                        .content("{\"title\":\"Security integration task\",\"description\":\"created in test\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value("Security integration task"))
                .andReturn();

        taskAId = com.jayway.jsonpath.JsonPath.read(
                created.getResponse().getContentAsString(), "$.data.id");

        mockMvc.perform(get("/api/v1/tasks").session(sessionA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1));

        mockMvc.perform(put("/api/v1/tasks/" + taskAId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-XSRF-TOKEN", csrf)
                        .session(sessionA).cookie(new Cookie(CSRF_COOKIE, csrf))
                        .content("{\"title\":\"Security integration task (edited)\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Security integration task (edited)"));

        // Mutating request without CSRF token must be rejected even with a session.
        mockMvc.perform(delete("/api/v1/tasks/" + taskAId).session(sessionA))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(8)
    @DisplayName("A second user cannot read or modify the first user's task")
    void userCannotAccessOtherUsersTask() throws Exception {
        MockHttpSession sessionB = login(userBEmail, password);
        String csrf = fetchCsrfToken();

        mockMvc.perform(get("/api/v1/tasks").session(sessionB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));

        mockMvc.perform(get("/api/v1/tasks/" + taskAId).session(sessionB))
                .andExpect(status().isNotFound());

        mockMvc.perform(put("/api/v1/tasks/" + taskAId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-XSRF-TOKEN", csrf)
                        .session(sessionB).cookie(new Cookie(CSRF_COOKIE, csrf))
                        .content("{\"title\":\"hijacked\"}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/v1/tasks/" + taskAId)
                        .header("X-XSRF-TOKEN", csrf)
                        .session(sessionB).cookie(new Cookie(CSRF_COOKIE, csrf)))
                .andExpect(status().isNotFound());

        // Owner still sees the task untouched.
        mockMvc.perform(get("/api/v1/tasks/" + taskAId).session(sessionA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Security integration task (edited)"));
    }

    @Test
    @Order(9)
    @DisplayName("Logout invalidates the session")
    void logout_invalidatesSession() throws Exception {
        String csrf = fetchCsrfToken();
        MockHttpSession session = sessionA;

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("X-XSRF-TOKEN", csrf)
                        .session(session).cookie(new Cookie(CSRF_COOKIE, csrf)))
                .andExpect(status().isOk());

        assertThat(session.isInvalid()).as("logout must invalidate the server-side session").isTrue();
        sessionA = null;

        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Order(10)
    @DisplayName("Repeated failed logins trigger rate limiting (429)")
    void repeatedFailures_areRateLimited() throws Exception {
        String victim = "brute-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local";
        register(victim, "Brute");

        String csrf = fetchCsrfToken();
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-XSRF-TOKEN", csrf)
                            .cookie(new Cookie(CSRF_COOKIE, csrf))
                            .content("{\"email\":\"" + victim + "\",\"password\":\"BadPass123!\"}"))
                    .andExpect(status().isUnauthorized());
        }

        // 6th attempt — even with the CORRECT password — must be locked out.
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-XSRF-TOKEN", csrf)
                        .cookie(new Cookie(CSRF_COOKIE, csrf))
                        .content("{\"email\":\"" + victim + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429));
    }
}
