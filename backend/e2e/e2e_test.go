package e2e_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	//tc "github.com/testcontainers/testcontainers-go/modules/compose"
	//"github.com/testcontainers/testcontainers-go/wait"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"

	"user-management/internal/models"
)

const (
	defaultWaitTimeout = 30 * time.Second
	apiBaseURL         = "http://localhost:8083/api/v1"
	dsn                = "postgresql://postgres:postgres@localhost:25432/user-management?sslmode=disable&timeout=5s"
)

func isFeatureEnabled(envVar string) bool {
	return strings.ContainsAny(os.Getenv(envVar), "yY1")
}

func isFeatureDisabled(envVar string) bool {
	return !isFeatureEnabled(envVar)
}

//
//func setupServices(t *testing.T, ctx context.Context) {
//	t.Helper()
//
//	identifier := tc.StackIdentifier("user-management_test")
//	compose, err := tc.NewDockerComposeWith(tc.WithStackFiles("./docker-compose.yml"), identifier)
//	require.NoError(t, err, "failed to create DockerCompose")
//
//	// Define services configurations
//	services := []struct {
//		name    string
//		waitFor wait.Strategy
//	}{
//		{
//			name: "postgres",
//			waitFor: wait.ForListeningPort(nat.Port("5432/tcp")).
//				WithStartupTimeout(defaultWaitTimeout),
//		},
//		{
//			name: "backend",
//			waitFor: wait.ForListeningPort(nat.Port("8080/tcp")).
//				WithStartupTimeout(defaultWaitTimeout),
//		},
//		//{
//		//	name: "toxiproxy",
//		//	waitFor: wait.ForListeningPort(nat.Port("8474/tcp")).
//		//		WithStartupTimeout(DefaultWaitTimeout),
//		//},
//	}
//
//	// Wait for services to be ready using a loop
//	for _, services := range services {
//		err := compose.
//			WaitForService(services.name, services.waitFor).
//			Up(ctx, tc.Wait(true))
//		require.NoError(t, err, fmt.Sprintf("failed to start %s services", services.name))
//	}
//}

// TestUserCreationE2E  serves multiple purposes:
// - Validate Container Build & Execution – Ensures the backend services and database container can be built and run properly in the test environment.
// - Verify Container Communication – Confirms that services (backend API and database) can communicate as expected.
// - End-to-End API Validation – Tests core user management functionalities, including creation, retrieval, updating, and deletion.
// - Database Integration Check – Ensures that the data persists correctly and matches API expectations.
// - Environment Flag Handling – Validates that feature flags control test execution appropriately.
// - HTTP Request Handling – Assesses whether API endpoints return expected responses and status codes.
// - Data Consistency Verification – Cross-checks data between the API and the database to ensure accuracy.
// it requires to run test with docker-compose up
func TestUserCreationE2E(t *testing.T) {
	if isFeatureDisabled("E2E_ENABLE") {
		t.Skip("skipping integration test")
	}

	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)

	//if isFeatureEnabled("E2E_SERVICES_SETUP") {
	//	setupServices(t, ctx)
	//}

	pgConn := pgdriver.NewConnector(
		pgdriver.WithDSN(dsn),
	)
	sqldb := sql.OpenDB(pgConn)
	db := bun.NewDB(sqldb, pgdialect.New())
	t.Cleanup(func() {
		err := db.Close()
		require.NoError(t, err)
	})

	// Run tests
	t.Run("CreateUser", func(t *testing.T) {
		// Create a test user using your models.UserCreateRequest
		userRequest := models.UserCreateRequest{
			UserName:   "johndoe",
			FirstName:  "John",
			LastName:   "Doe",
			Email:      "john.doe@example.com",
			UserStatus: models.UserStatusActive,
			Department: "Engineering",
		}

		// Convert request to JSON
		userJSON, err := json.Marshal(userRequest)
		require.NoError(t, err)

		// Send POST request to create user
		resp, err := http.Post(
			fmt.Sprintf("%s/users", apiBaseURL),
			"application/json",
			strings.NewReader(string(userJSON)),
		)
		require.NoError(t, err)
		defer resp.Body.Close()

		// Check response status
		assert.Equal(t, http.StatusCreated, resp.StatusCode, "Expected 201 Created status code")

		// Parse response body
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)

		var createdUser models.User
		err = json.Unmarshal(body, &createdUser)
		require.NoError(t, err)

		// Verify created user data from API response
		assert.Greater(t, createdUser.UserID, int64(0))
		assert.Equal(t, userRequest.UserName, createdUser.UserName)
		assert.Equal(t, userRequest.FirstName, createdUser.FirstName)
		assert.Equal(t, userRequest.LastName, createdUser.LastName)
		assert.Equal(t, userRequest.Email, createdUser.Email)
		assert.Equal(t, userRequest.UserStatus, createdUser.UserStatus)
		assert.Equal(t, userRequest.Department, createdUser.Department)
		assert.NotZero(t, createdUser.CreatedAt)
		assert.NotZero(t, createdUser.UpdatedAt)

		// Verify user exists in database using bun
		var dbUser models.User
		err = db.NewSelect().
			Model(&dbUser).
			Where("user_name = ?", userRequest.UserName).
			Scan(ctx)
		require.NoError(t, err, "Failed to query user from database")

		// Verify database data matches the request
		assert.Equal(t, userRequest.UserName, dbUser.UserName)
		assert.Equal(t, userRequest.FirstName, dbUser.FirstName)
		assert.Equal(t, userRequest.LastName, dbUser.LastName)
		assert.Equal(t, userRequest.Email, dbUser.Email)
		assert.Equal(t, userRequest.UserStatus, dbUser.UserStatus)
		assert.Equal(t, userRequest.Department, dbUser.Department)
	})

	t.Run("GetUsers", func(t *testing.T) {
		// Get all users
		resp, err := http.Get(fmt.Sprintf("%s/users", apiBaseURL))
		require.NoError(t, err)
		defer resp.Body.Close()

		// Check response status
		assert.Equal(t, http.StatusOK, resp.StatusCode)

		// Parse response body
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)

		var users []models.User
		err = json.Unmarshal(body, &users)
		require.NoError(t, err)

		// Verify we got at least the user we created
		assert.NotEmpty(t, users, "Expected at least one user")

		// Check if our created user is in the list
		var foundUser bool
		for _, user := range users {
			if user.UserName == "johndoe" {
				foundUser = true
				break
			}
		}
		assert.True(t, foundUser, "Expected to find created user in list")
	})

	t.Run("GetUserById", func(t *testing.T) {
		// First, get the user ID from the database using bun
		var user models.User
		err := db.NewSelect().
			Model(&user).
			Where("user_name = ?", "johndoe").
			Scan(ctx)
		require.NoError(t, err)

		// Get the user by ID
		resp, err := http.Get(fmt.Sprintf("%s/users/%d", apiBaseURL, user.UserID))
		require.NoError(t, err)
		defer resp.Body.Close()

		// Check response status
		assert.Equal(t, http.StatusOK, resp.StatusCode)

		// Parse response body
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)

		var fetchedUser models.User
		err = json.Unmarshal(body, &fetchedUser)
		require.NoError(t, err)

		// Verify user details
		assert.Equal(t, user.UserID, fetchedUser.UserID)
		assert.Equal(t, "johndoe", fetchedUser.UserName)
		assert.Equal(t, "John", fetchedUser.FirstName)
		assert.Equal(t, "Doe", fetchedUser.LastName)
		assert.Equal(t, "john.doe@example.com", fetchedUser.Email)
	})

	t.Run("UpdateUser", func(t *testing.T) {
		// First, get the user ID from the database using bun
		var user models.User
		err := db.NewSelect().
			Model(&user).
			Where("user_name = ?", "jsmith").
			Scan(ctx)
		require.NoError(t, err)

		// Create update request
		updateRequest := models.UserUpdateRequest{
			UserName:   user.UserName, // Keep same username
			FirstName:  "Johnny",      // Change first name
			LastName:   "Doeson",      // Change last name
			Email:      user.Email,    // Change email
			UserStatus: models.UserStatusActive,
			Department: "ResearchDevelopment", // Change department
		}

		// Convert request to JSON
		updateJSON, err := json.Marshal(updateRequest)
		require.NoError(t, err)

		t.Log(string(updateJSON))

		// Create PUT request
		req, err := http.NewRequest(
			http.MethodPut,
			fmt.Sprintf("%s/users/%d", apiBaseURL, user.UserID),
			strings.NewReader(string(updateJSON)),
		)
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Send PUT request
		client := &http.Client{}
		resp, err := client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		// Check response status
		//assert.Equal(t, http.StatusOK, resp.StatusCode)

		// Parse response body
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)

		t.Log(string(body))

		var updatedUser models.User
		err = json.Unmarshal(body, &updatedUser)
		require.NoError(t, err)

		// Verify updated user data from API response
		assert.Equal(t, user.UserID, updatedUser.UserID)
		assert.Equal(t, updateRequest.UserName, updatedUser.UserName)
		assert.Equal(t, updateRequest.FirstName, updatedUser.FirstName)
		assert.Equal(t, updateRequest.LastName, updatedUser.LastName)
		assert.Equal(t, updateRequest.Email, updatedUser.Email)
		assert.Equal(t, updateRequest.Department, updatedUser.Department)

		// Verify user was updated in the database using bun
		var dbUser models.User
		err = db.NewSelect().
			Model(&dbUser).
			Where("user_id = ?", user.UserID).
			Scan(ctx)
		require.NoError(t, err)

		assert.Equal(t, updateRequest.FirstName, dbUser.FirstName)
		assert.Equal(t, updateRequest.LastName, dbUser.LastName)
		assert.Equal(t, updateRequest.Email, dbUser.Email)
		assert.Equal(t, updateRequest.Department, dbUser.Department)
	})

	t.Run("DeleteUser", func(t *testing.T) {
		// First, get the user ID from the database using bun
		var user models.User
		err := db.NewSelect().
			Model(&user).
			Where("user_name = ?", "johndoe").
			Scan(ctx)
		require.NoError(t, err)

		// Create DELETE request
		req, err := http.NewRequest(
			http.MethodDelete,
			fmt.Sprintf("%s/users/%d", apiBaseURL, user.UserID),
			nil,
		)
		require.NoError(t, err)

		// Send DELETE request
		client := &http.Client{}
		resp, err := client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		// Expected status code based on your handler
		assert.Equal(t, http.StatusAccepted, resp.StatusCode)

		// Verify user was deleted in the database using bun count
		count, err := db.NewSelect().
			Model((*models.User)(nil)).
			Where("user_id = ?", user.UserID).
			Count(ctx)
		require.NoError(t, err)
		assert.Equal(t, 0, count, "User should be deleted from database")
	})
}
