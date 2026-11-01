# ============================================================
# Stage 1 — Build the JAR with Maven
# ============================================================
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy pom first so dependency layer is cached separately
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Copy source and build (tests run in CI, skipped here)
COPY src src
RUN mvn package -DskipTests -q

# ============================================================
# Stage 2 — Minimal JRE runtime (~200 MB)
# ============================================================
FROM eclipse-temurin:17-jre-alpine AS runtime
WORKDIR /app

# Non-root user for security
RUN addgroup -S taskflow && adduser -S taskflow -G taskflow
USER taskflow

COPY --from=builder /app/target/*.jar app.jar

# Render injects $PORT at runtime; default 8081 for local Docker
EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-8081}/api/health || exit 1

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Xmx300m", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
