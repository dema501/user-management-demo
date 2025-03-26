package handlers_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"user-management/internal/handlers"
	"user-management/internal/models"
	"user-management/internal/repository"
	"user-management/internal/services"
	"user-management/internal/validator"
)

func TestHandlers(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "Api Suite")
}

var srv *echo.Echo

var _ = BeforeSuite(func() {
	// use in-memory database
	sqldb, err := sql.Open(sqliteshim.ShimName, "file::memory:?cache=shared")
	Expect(err).NotTo(HaveOccurred())

	db := bun.NewDB(sqldb, sqlitedialect.New())
	//db.AddQueryHook(bundebug.NewQueryHook(bundebug.WithVerbose(true)))

	err = db.ResetModel(context.TODO(), (*models.User)(nil))
	Expect(err).NotTo(HaveOccurred())

	userRepo := repository.NewUserRepository(db)
	userService := services.NewUserService(userRepo)
	userHandler := handlers.NewUserHandler(userService)

	srv = echo.New()
	srv.GET("/users", userHandler.ListUsers)
	srv.POST("/users", userHandler.CreateUser)
	srv.GET("/users/:id", userHandler.GetUser)
	srv.PUT("/users/:id", userHandler.UpdateUser)
	srv.DELETE("/users/:id", userHandler.DeleteUser)

	srv.Validator = validator.NewEchoValidator()
})

var _ = Describe("User API", func() {
	It("should server setup", func() {
		Expect(srv).ToNot(BeNil())
	})

	It("should create a user successfully", func() {
		user := models.UserCreateRequest{
			UserCommon: models.UserCommon{
				UserName:   "test",
				FirstName:  "John",
				LastName:   "Doe",
				Email:      "john@doe.com",
				UserStatus: models.UserStatusActive,
				Department: "IT",
			},
		}
		jsonBody, err := json.Marshal(user)
		Expect(err).NotTo(HaveOccurred())
		req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewReader(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()
		srv.ServeHTTP(resp, req)
		Expect(resp.Code).To(Equal(http.StatusCreated))
	})

	It("should return BadRequest when creating a user with invalid data", func() {
		// Missing required fields
		user := models.UserCreateRequest{
			UserCommon: models.UserCommon{
				// Missing UserName
				FirstName: "John",
				// Missing other required fields
			},
		}
		jsonBody, err := json.Marshal(user)
		Expect(err).NotTo(HaveOccurred())
		req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewReader(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()
		srv.ServeHTTP(resp, req)
		Expect(resp.Code).To(Equal(http.StatusUnprocessableEntity))
	})

	It("should retrieve an existing user", func() {
		req := httptest.NewRequest(http.MethodGet, "/users/1", nil)
		resp := httptest.NewRecorder()
		srv.ServeHTTP(resp, req)
		Expect(resp.Code).To(Equal(http.StatusOK))
	})

	It("should update an existing user", func() {
		updateData := models.UserUpdateRequest{
			UserCommon: models.UserCommon{
				UserName:   "test",
				FirstName:  "John",
				LastName:   "Doe",
				Email:      "john@doe.com",
				UserStatus: models.UserStatusTerminated,
				Department: "IT & Co",
			},
		}
		jsonBody, err := json.Marshal(updateData)
		Expect(err).NotTo(HaveOccurred())
		req := httptest.NewRequest(http.MethodPut, "/users/1", bytes.NewReader(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()
		srv.ServeHTTP(resp, req)
		Expect(resp.Code).To(Equal(http.StatusOK))
	})

	It("should return BadRequest when updating a user with invalid data", func() {
		// Invalid email format
		updateData := models.UserUpdateRequest{
			UserCommon: models.UserCommon{
				UserName:   "test",
				FirstName:  "John",
				LastName:   "Doe",
				Email:      "invalid-email", // Invalid email format
				UserStatus: models.UserStatusActive,
				Department: "Sales Dep",
			},
		}
		jsonBody, err := json.Marshal(updateData)
		Expect(err).NotTo(HaveOccurred())
		req := httptest.NewRequest(http.MethodPut, "/users/1", bytes.NewReader(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()
		srv.ServeHTTP(resp, req)
		Expect(resp.Code).To(Equal(http.StatusUnprocessableEntity))
	})

	It("should delete an existing user", func() {
		req := httptest.NewRequest(http.MethodDelete, "/users/1", nil)
		resp := httptest.NewRecorder()
		srv.ServeHTTP(resp, req)
		Expect(resp.Code).To(Equal(http.StatusAccepted))
	})

	It("should return error for non-existent user", func() {
		req := httptest.NewRequest(http.MethodGet, "/users/999", nil)
		resp := httptest.NewRecorder()
		srv.ServeHTTP(resp, req)
		Expect(resp.Code).To(Equal(http.StatusNotFound))
	})
})
