# Variables
APP_NAME := user-management
BUILD_DIR := build
API_MAIN := ./cmd/rest/main.go

# Default target when make is run without arguments
all: help

# Build the application
compile:
	@echo "Building $(APP_NAME)..."
	@mkdir -p $(BUILD_DIR)
	@CGO_ENABLED=0 go build -trimpath -ldflags="-w -s" -o $(BUILD_DIR)/$(APP_NAME) $(API_MAIN)

# Run the application
run:
	@go run $(API_MAIN) -vvv

# Clean build artifacts
clean:
	@echo "Cleaning build directory..."
	@rm -rf $(BUILD_DIR)

# Run tests
test:
	@go test -v ./...

# Generate API documentation
docs: swagger
	@echo "Documentation generated at /swagger/index.html"

# Run swagger to generate API docs
swagger:
	@echo "Generating Swagger documentation..."
	@swag init --dir $(CURDIR) --generalInfo $(API_MAIN) --output $(CURDIR)/docs/swagger --parseInternal --parseDependency -q

# Start development environment with hot reload
dev:
	@echo "Starting development server with air..."
	@which air > /dev/null || go install github.com/cosmtrek/air@latest
	@air -c .air.toml

# Display help information
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  compile  - Compile the application"
	@echo "  run      - Run the application"
	@echo "  clean    - Remove build artifacts"
	@echo "  test     - Run tests"
	@echo "  docs     - Generate API documentation"
	@echo "  swagger  - Generate Swagger documentation"
	@echo "  dev      - Run with hot reload using Air"
	@echo "  help     - Show this help message"
