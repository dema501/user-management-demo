FROM golang:1.24.1-alpine3.21 AS builder
WORKDIR /app
# Copy only necessary files first to leverage build cache
COPY go.mod go.sum ./
RUN go mod download
# Copy the rest of the application
COPY . .
# Build with security flags
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-w -s" -o userapi ./cmd/rest/main.go
# Build CLI tool
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-w -s" -o usercli ./cmd/cli/main.go

# Run stage - use distroless for minimal attack surface
FROM gcr.io/distroless/static-debian12:nonroot
# Set up a non-root user
USER nonroot:nonroot
WORKDIR /app
# Copy only necessary artifacts
COPY --from=builder --chown=nonroot:nonroot /app/userapi .
COPY --from=builder --chown=nonroot:nonroot /app/usercli .
COPY --from=builder --chown=nonroot:nonroot /app/docs/swagger ./docs/swagger

# Set default port (can be overridden at runtime)
ENV PORT=8080

# Expose the port that will be used (note: this is just documentation)
EXPOSE $PORT

# Use exec form of CMD
CMD ["./userapi"]
