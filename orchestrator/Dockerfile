# ── Stage 1: Build the JAR ────────────────────────────────────────────────────
# Use an Eclipse Temurin JDK 21 image to compile and package the app.
# Temurin is the open-source reference JDK — safe, widely used in production.
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

# Copy Gradle wrapper and config first.
# Just like with pip, Docker caches layers — if build.gradle hasn't changed,
# the dependency download layer is reused on next build.
COPY gradlew .
COPY gradle/ gradle/
COPY build.gradle .
COPY settings.gradle .

# Make gradlew executable
RUN chmod +x gradlew

# Download dependencies only (no source yet) — this layer gets cached.
# --no-daemon: don't start a background Gradle daemon inside Docker (wastes memory).
RUN ./gradlew dependencies --no-daemon

# Now copy source code and build the fat JAR
COPY src/ src/
RUN ./gradlew bootJar --no-daemon -x test

# ── Stage 2: Runtime image ────────────────────────────────────────────────────
# Switch to a lightweight JRE (not full JDK) for the final image.
# We don't need the compiler at runtime — just the Java Virtual Machine.
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy only the compiled JAR from the builder stage
COPY --from=builder /app/build/libs/*.jar app.jar

# Port the Spring Boot app listens on
EXPOSE 8081

# Spring Boot environment variables can be passed in at runtime.
# DATABASE_URL, SPRING_DATASOURCE_* etc. come from docker-compose.
CMD ["java", "-jar", "app.jar"]
