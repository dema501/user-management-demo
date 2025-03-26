package validator

import (
	"log/slog"
	"os"
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
)

const alphaUnicodeNumericRegexString = `^[\p{L}\p{N},.:;&# ]+$`

// wrapper implementation.
type wrapper struct {
	validator *validator.Validate
}

// NewValidator creates a new validator with custom validation
func NewValidator() (*validator.Validate, error) {
	v := validator.New()

	if err := v.RegisterValidation("alphaNumUnicodeWithSpaces", IsAlphanumUnicodeWithSpaces); err != nil {
		return nil, err
	}

	return v, nil
}

// NewEchoValidator creates a new validator for echo framework.
func NewEchoValidator() echo.Validator {
	v, err := NewValidator()
	if err != nil {
		slog.With("error", err).
			Error("failed to register validation")
		os.Exit(1)
	}

	return &wrapper{
		validator: v,
	}
}

// Validate data
func (v *wrapper) Validate(i any) error {
	return v.validator.Struct(i)
}

// alphaUnicodeNumericRegex returns a compiled regex
func alphaUnicodeNumericRegex() *regexp.Regexp {
	return regexp.MustCompile(alphaUnicodeNumericRegexString)
}

// IsAlphanumUnicodeWithSpaces is the validation function for validating if the current field's value
// is a valid alphanumeric unicode value with allowed special symbols
func IsAlphanumUnicodeWithSpaces(fl validator.FieldLevel) bool {
	value := fl.Field().String()

	// Check if the string is just whitespace
	if strings.TrimSpace(value) == "" {
		return false
	}

	// Check against the regex
	return alphaUnicodeNumericRegex().MatchString(value)
}
