# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS screens
WORKDIR /src/client
COPY client/package.json client/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

FROM eclipse-temurin:21-jdk-alpine AS server
WORKDIR /src/server
COPY server/gradlew ./
COPY server/gradle gradle
COPY server/build.gradle server/settings.gradle ./
RUN --mount=type=cache,target=/root/.gradle sh ./gradlew --no-daemon --console=plain -q dependencies > /dev/null
COPY server/ ./
RUN --mount=type=cache,target=/root/.gradle sh ./gradlew --no-daemon --console=plain -q bootJar

FROM eclipse-temurin:21-jre-alpine
LABEL org.opencontainers.image.title=bit
WORKDIR /app
COPY --from=server /src/server/build/libs/app.jar app.jar
COPY --from=screens /src/client/dist screens/
RUN mkdir -p /var/lib/bit && chown 10001:10001 /var/lib/bit
USER 10001:10001
ENV DB_PATH=/var/lib/bit/bit.db
ENV APP_SCREENS=file:/app/screens/
VOLUME /var/lib/bit
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/v1/health > /dev/null || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
