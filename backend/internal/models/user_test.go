package models

import (
	"testing"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	vld "user-management/internal/validator"
)

func TestUserModel(t *testing.T) {
	t.Parallel()

	t.Run("UserStatusConstants", func(t *testing.T) {
		t.Parallel()

		// Test all predefined user status constants
		assert.Equal(t, UserStatus("A"), UserStatusActive)
		assert.Equal(t, UserStatus("I"), UserStatusInactive)
		assert.Equal(t, UserStatus("T"), UserStatusTerminated)
	})

	t.Run("UserFieldsInitialization", func(t *testing.T) {
		t.Parallel()

		now := time.Now().UTC()
		user := User{
			UserID: 123,
			UserCommon: UserCommon{
				UserName:   "testuser",
				FirstName:  "Test",
				LastName:   "User",
				Email:      "test@example.com",
				UserStatus: UserStatusActive,
				Department: "Testing",
			},
			CreatedAt: now,
			UpdatedAt: now,
		}

		assert.Equal(t, int64(123), user.UserID)
		assert.Equal(t, "testuser", user.UserName)
		assert.Equal(t, "Test", user.FirstName)
		assert.Equal(t, "User", user.LastName)
		assert.Equal(t, "test@example.com", user.Email)
		assert.Equal(t, UserStatusActive, user.UserStatus)
		assert.Equal(t, "Testing", user.Department)
		assert.Equal(t, now, user.CreatedAt)
		assert.Equal(t, now, user.UpdatedAt)
	})
}

func TestUserCreateRequestValidation(t *testing.T) {
	t.Parallel()

	validate, err := vld.NewValidator()
	require.NoError(t, err)

	// Set up a matrix of test cases for UserCreateRequest validation
	testCases := []struct {
		name          string
		request       UserCreateRequest
		expectedError bool
		errorField    string
		errorTag      string
	}{
		{
			name: "Valid Request",
			request: UserCreateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "Valid",
					LastName:   "User",
					Email:      "valid@example.com",
					UserStatus: UserStatusActive,
					Department: "Testing",
				},
			},
			expectedError: false,
		},
		{
			name: "Username Too Short",
			request: UserCreateRequest{
				UserCommon{
					UserName:   "usr",
					FirstName:  "Valid",
					LastName:   "User",
					Email:      "valid@example.com",
					UserStatus: UserStatusActive,
					Department: "Testing",
				},
			},
			expectedError: true,
			errorField:    "UserName",
			errorTag:      "min",
		},
		{
			name: "Username With Non-Alphanumeric Characters",
			request: UserCreateRequest{
				UserCommon{
					UserName:   "user-name",
					FirstName:  "Valid",
					LastName:   "User",
					Email:      "valid@example.com",
					UserStatus: UserStatusActive,
					Department: "Testing",
				},
			},
			expectedError: true,
			errorField:    "UserName",
			errorTag:      "alphanum",
		},
		{
			name: "Missing First Name",
			request: UserCreateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "",
					LastName:   "User",
					Email:      "valid@example.com",
					UserStatus: UserStatusActive,
					Department: "Testing",
				},
			},
			expectedError: true,
			errorField:    "FirstName",
			errorTag:      "required",
		},
		{
			name: "First Name With Special Characters",
			request: UserCreateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "First@Name",
					LastName:   "User",
					Email:      "valid@example.com",
					UserStatus: UserStatusActive,
					Department: "Testing",
				},
			},
			expectedError: true,
			errorField:    "FirstName",
			errorTag:      "alphanumunicode",
		},
		{
			name: "Missing Last Name",
			request: UserCreateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "Valid",
					LastName:   "",
					Email:      "valid@example.com",
					UserStatus: UserStatusActive,
					Department: "Testing",
				},
			},
			expectedError: true,
			errorField:    "LastName",
			errorTag:      "required",
		},
		{
			name: "Last Name With Special Characters",
			request: UserCreateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "Valid",
					LastName:   "Last@Name",
					Email:      "valid@example.com",
					UserStatus: UserStatusActive,
					Department: "Testing",
				},
			},
			expectedError: true,
			errorField:    "LastName",
			errorTag:      "alphanumunicode",
		},
		{
			name: "Invalid Email Format",
			request: UserCreateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "Valid",
					LastName:   "User",
					Email:      "invalid-email",
					UserStatus: UserStatusActive,
					Department: "Testing",
				},
			},
			expectedError: true,
			errorField:    "Email",
			errorTag:      "email",
		},
		{
			name: "Missing Email",
			request: UserCreateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "Valid",
					LastName:   "User",
					Email:      "",
					UserStatus: UserStatusActive,
					Department: "Testing",
				},
			},
			expectedError: true,
			errorField:    "Email",
			errorTag:      "required",
		},
		{
			name: "Invalid User Status",
			request: UserCreateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "Valid",
					LastName:   "User",
					Email:      "valid@example.com",
					UserStatus: "X", // Invalid status
					Department: "Testing",
				},
			},
			expectedError: true,
			errorField:    "UserStatus",
			errorTag:      "oneof",
		},
		{
			name: "Empty User Status",
			request: UserCreateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "Valid",
					LastName:   "User",
					Email:      "valid@example.com",
					UserStatus: "",
					Department: "Testing",
				},
			},
			expectedError: true,
			errorField:    "UserStatus",
			errorTag:      "required",
		},
		{
			name: "Department With Special Characters",
			request: UserCreateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "Valid",
					LastName:   "User",
					Email:      "valid@example.com",
					UserStatus: UserStatusActive,
					Department: "Testing@Department", // Contains special character
				},
			},
			expectedError: true,
			errorField:    "Department",
			errorTag:      "alphaNumUnicodeWithSpaces",
		},
		{
			name: "Optional Department Can Be Empty",
			request: UserCreateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "Valid",
					LastName:   "User",
					Email:      "valid@example.com",
					UserStatus: UserStatusActive,
					Department: "", // Optional field
				},
			},
			expectedError: false,
		},
	}

	for _, tc := range testCases {
		tc := tc // Capture range variable for parallel execution
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			err := validate.Struct(tc.request)

			if tc.expectedError {
				require.Error(t, err, "Expected validation to fail")
				if tc.errorField != "" {
					validationErrors, ok := err.(validator.ValidationErrors)
					require.True(t, ok, "Expected validator.ValidationErrors")

					foundFieldError := false
					for _, fieldErr := range validationErrors {
						if fieldErr.Field() == tc.errorField {
							foundFieldError = true
							if tc.errorTag != "" {
								assert.Equal(t, tc.errorTag, fieldErr.Tag(), "Expected error tag '%s' on field %s, got '%s'", tc.errorTag, tc.errorField, fieldErr.Tag())
							}
							break
						}
					}
					assert.True(t, foundFieldError, "Expected error on field %s", tc.errorField)
				}
			} else {
				assert.NoError(t, err, "Expected validation to pass")
			}
		})
	}
}

func TestUserUpdateRequestValidation(t *testing.T) {
	t.Parallel()

	validate, err := vld.NewValidator()
	require.NoError(t, err)

	// Set up a matrix of test cases for UserUpdateRequest validation
	testCases := []struct {
		name          string
		request       UserUpdateRequest
		expectedError bool
		errorField    string
		errorTag      string
	}{
		{
			name: "Valid Update Request",
			request: UserUpdateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "Valid",
					LastName:   "User",
					Email:      "valid@example.com",
					UserStatus: UserStatusActive,
					Department: "Testing",
				},
			},
			expectedError: false,
		},
		{
			name: "Username Too Short",
			request: UserUpdateRequest{
				UserCommon{
					UserName:   "usr",
					FirstName:  "Valid",
					LastName:   "User",
					Email:      "valid@example.com",
					UserStatus: UserStatusActive,
					Department: "Testing",
				},
			},
			expectedError: true,
			errorField:    "UserName",
			errorTag:      "min",
		},
		{
			name: "Username With Non-Alphanumeric Characters",
			request: UserUpdateRequest{
				UserCommon{
					UserName:   "user-name",
					FirstName:  "Valid",
					LastName:   "User",
					Email:      "valid@example.com",
					UserStatus: UserStatusActive,
					Department: "Testing",
				},
			},
			expectedError: true,
			errorField:    "UserName",
			errorTag:      "alphanum",
		},
		{
			name: "Missing Username",
			request: UserUpdateRequest{
				UserCommon{
					UserName:   "",
					FirstName:  "Valid",
					LastName:   "User",
					Email:      "valid@example.com",
					UserStatus: UserStatusActive,
					Department: "Testing",
				},
			},
			expectedError: true,
			errorField:    "UserName",
			errorTag:      "required",
		},
		{
			name: "Missing First Name",
			request: UserUpdateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "",
					LastName:   "User",
					Email:      "valid@example.com",
					UserStatus: UserStatusActive,
					Department: "Testing",
				},
			},
			expectedError: true,
			errorField:    "FirstName",
			errorTag:      "required",
		},
		{
			name: "First Name With Special Characters",
			request: UserUpdateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "First@Name",
					LastName:   "User",
					Email:      "valid@example.com",
					UserStatus: UserStatusActive,
					Department: "Testing",
				},
			},
			expectedError: true,
			errorField:    "FirstName",
			errorTag:      "alphanumunicode",
		},
		{
			name: "Missing Last Name",
			request: UserUpdateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "Valid",
					LastName:   "",
					Email:      "valid@example.com",
					UserStatus: UserStatusActive,
					Department: "Testing",
				},
			},
			expectedError: true,
			errorField:    "LastName",
			errorTag:      "required",
		},
		{
			name: "Last Name With Special Characters",
			request: UserUpdateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "Valid",
					LastName:   "Last@Name",
					Email:      "valid@example.com",
					UserStatus: UserStatusActive,
					Department: "Testing"},
			},
			expectedError: true,
			errorField:    "LastName",
			errorTag:      "alphanumunicode",
		},
		{
			name: "Invalid Email Format",
			request: UserUpdateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "Valid",
					LastName:   "User",
					Email:      "invalid-email",
					UserStatus: UserStatusActive,
					Department: "Testing",
				},
			},
			expectedError: true,
			errorField:    "Email",
			errorTag:      "email",
		},
		{
			name: "Missing Email",
			request: UserUpdateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "Valid",
					LastName:   "User",
					Email:      "",
					UserStatus: UserStatusActive,
					Department: "Testing"},
			},
			expectedError: true,
			errorField:    "Email",
			errorTag:      "required",
		},
		{
			name: "Invalid User Status",
			request: UserUpdateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "Valid",
					LastName:   "User",
					Email:      "valid@example.com",
					UserStatus: "X", // Invalid status
					Department: "Testing",
				},
			},
			expectedError: true,
			errorField:    "UserStatus",
			errorTag:      "oneof",
		},
		{
			name: "Empty User Status",
			request: UserUpdateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "Valid",
					LastName:   "User",
					Email:      "valid@example.com",
					UserStatus: "",
					Department: "Testing",
				},
			},
			expectedError: true,
			errorField:    "UserStatus",
			errorTag:      "required",
		},
		{
			name: "Department With Special Characters",
			request: UserUpdateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "Valid",
					LastName:   "User",
					Email:      "valid@example.com",
					UserStatus: UserStatusActive,
					Department: "Testing@Department", // Contains special character
				},
			},
			expectedError: true,
			errorField:    "Department",
			errorTag:      "alphaNumUnicodeWithSpaces",
		},
		{
			name: "Optional Department Can Be Empty",
			request: UserUpdateRequest{
				UserCommon{
					UserName:   "validuser",
					FirstName:  "Valid",
					LastName:   "User",
					Email:      "valid@example.com",
					UserStatus: UserStatusActive,
					Department: "", // Optional field
				},
			},
			expectedError: false,
		},
	}

	for _, tc := range testCases {
		tc := tc // Capture range variable for parallel execution
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			err := validate.Struct(tc.request)

			if tc.expectedError {
				require.Error(t, err, "Expected validation to fail")
				if tc.errorField != "" {
					validationErrors, ok := err.(validator.ValidationErrors)
					require.True(t, ok, "Expected validator.ValidationErrors")

					foundFieldError := false
					for _, fieldErr := range validationErrors {
						if fieldErr.Field() == tc.errorField {
							foundFieldError = true
							if tc.errorTag != "" {
								assert.Equal(t, tc.errorTag, fieldErr.Tag(), "Expected error tag '%s' on field %s, got '%s'", tc.errorTag, tc.errorField, fieldErr.Tag())
							}
							break
						}
					}
					assert.True(t, foundFieldError, "Expected error on field %s", tc.errorField)
				}
			} else {
				assert.NoError(t, err, "Expected validation to pass")
			}
		})
	}
}
