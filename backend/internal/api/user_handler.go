// Package api provides HTTP handlers for user-related operations.
package api

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"user-management/internal/models"
	"user-management/internal/service"
)

type UserHandler struct {
	userService service.UserService
}

func NewUserHandler(userService service.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

// ListUsers godoc
// @Summary List all users
// @Description get all users
// @Accept  json
// @Produce  json
// @Success 200 {array} models.User
// @Router /users [get]
func (h *UserHandler) ListUsers(c echo.Context) error {
	ctx := c.Request().Context()
	users, err := h.userService.ListUsers(ctx)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, users)
}

// GetUser godoc
// @Summary Get a user
// @Description get user by ID
// @Accept  json
// @Produce  json
// @Param id path string true "User ID (int64)"
// @Success 200 {object} models.User
// @Failure 404 {object} map[string]string
// @Router /users/{id} [get]
func (h *UserHandler) GetUser(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid user id format"})
	}

	user, err := h.userService.GetUser(ctx, id)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	return c.JSON(http.StatusOK, user)
}

// CreateUser godoc
// @Summary Create a user
// @Description create a new user
// @Accept  json
// @Produce  json
// @Param user body models.UserCreateRequest true "User Data"
// @Success 201 {object} models.User
// @Failure 400 {object} map[string]string
// @Failure 422 {object} map[string]string
// @Router /users [post]
func (h *UserHandler) CreateUser(c echo.Context) error {
	ctx := c.Request().Context()
	var req models.UserCreateRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
	}

	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]string{"error": err.Error()})
	}

	user, err := h.userService.CreateUser(ctx, req)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusCreated, user)
}

// UpdateUser godoc
// @Summary Update a user
// @Description update a user by ID
// @Accept  json
// @Produce  json
// @Param id path string true "User ID (int64)"
// @Param user body models.UserUpdateRequest true "User Data"
// @Success 200 {object} models.User
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 422 {object} map[string]string
// @Router /users/{id} [put]
func (h *UserHandler) UpdateUser(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid user id format"})
	}

	var req models.UserUpdateRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
	}

	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]string{"error": err.Error()})
	}

	user, err := h.userService.UpdateUser(ctx, id, req)
	if err != nil {
		if err.Error() == "username already exists" || err.Error() == "email already exists" || err.Error() == "invalid user status" {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	return c.JSON(http.StatusOK, user)
}

// DeleteUser godoc
// @Summary Delete a user
// @Description delete a user by ID
// @Accept  json
// @Produce  json
// @Param id path string true "User ID (int64)"
// @Success 204 {object} nil
// @Failure 400 {object} map[string]string
// @Router /users/{id} [delete]
func (h *UserHandler) DeleteUser(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid user id format"})
	}

	if err := h.userService.DeleteUser(ctx, id); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.NoContent(http.StatusAccepted)
}
