FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
COPY uploads ./uploads
EXPOSE 8080

# Memory flags matter in a container. Heap is only part of the JVM's footprint —
# thread stacks, metaspace and direct buffers sit outside it and are otherwise
# unbounded, which is how a container gets OOM-killed while the heap looks healthy.
#
#   -Xss512k                     halves each thread's stack. With Tomcat's pool plus the
#                                WebSocket and async schedulers this is the biggest saving.
#   -XX:MaxMetaspaceSize         Spring loads a lot of classes; uncapped, metaspace grows
#                                until the container dies rather than the JVM.
#   -XX:+ExitOnOutOfMemoryError  die at once instead of limping on degraded, so the
#                                platform restarts a clean process.
CMD ["java", \
     "-Xss512k", \
     "-XX:MaxMetaspaceSize=192m", \
     "-XX:+ExitOnOutOfMemoryError", \
     "-jar", "app.jar"]