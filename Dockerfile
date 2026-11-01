# ============================================================
# TaskFlow Pro SaaS Platform — Unified Multi-Stage Dockerfile
# Combines React 18 frontend and Spring Boot 3 backend into a
# single, production-hardened JRE 17 Alpine container.
# ============================================================

# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /ui
COPY task-management-ui/package*.json ./
RUN npm ci --silent
COPY task-management-ui/ ./
RUN npm run build

# Stage 2: Build Spring Boot JAR with embedded frontend static bundle
FROM maven:3.9-eclipse-temurin-17 AS backend-builder
WORKDIR /build
COPY taskflow-api/pom.xml ./
RUN mvn dependency:go-offline -q
COPY taskflow-api/src ./src
# Copy freshly built frontend into Spring Boot static resources
COPY --from=frontend-builder /ui/../taskflow-api/src/main/resources/static ./src/main/resources/static
RUN mvn package -DskipTests -q

# Stage 3: Minimal, Secure JRE 17 Alpine Runtime (~200MB)
FROM eclipse-temurin:17-jre-alpine AS runtime
WORKDIR /app

# Non-root user for security compliance
RUN addgroup -S taskflow && adduser -S taskflow -G taskflow
USER taskflow

COPY --from=backend-builder /build/target/*.jar app.jar

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-8081}/actuator/health || exit 1

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
