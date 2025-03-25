package validator

import (
	"testing"

	"github.com/go-playground/validator/v10"
	"github.com/stretchr/testify/assert"
)

// TestIsAlphanumUnicodeWithSpaces performs a matrix test for the validation function
func TestIsAlphanumUnicodeWithSpaces(t *testing.T) {
	// Create a validator instance
	v := validator.New()

	// Register the custom validation
	err := v.RegisterValidation("alphaNumUnicodeWithSpaces", IsAlphanumUnicodeWithSpaces)
	assert.NoError(t, err)

	// Define test struct with the validation tag
	type TestStruct struct {
		Department string `validate:"required,alphaNumUnicodeWithSpaces"`
	}

	// Test matrix covering various input scenarios
	testCases := []struct {
		name        string
		input       string
		expectValid bool
	}{
		// Valid inputs
		{"English Department Name", "Sales Department", true},
		{"Department with Numbers", "IT Department 123", true},
		{"Department with Special Symbols", "R&D: Special Projects", true},
		{"Unicode Department Name", "中文部门 123", true},
		{"Department with Multiple Symbols", "Human Resources: Special Dept #2", true},
		{"Department with Cyrillic", "Отдел Продаж", true},
		{"Department with Arabic", "قسم المبيعات 123", true},

		// Invalid inputs
		{"Empty String", "", false},
		{"Only Spaces", "   ", false},
		{"With Forbidden Symbol @", "IT Department @Corp", false},
		{"With Forbidden Symbol !", "Sales! Department", false},
		{"With Forbidden Symbol %", "HR % Department", false},
		{"With Forbidden Symbol ^", "R^D Department", false},
		{"With Forbidden Symbol +", "Sales+ Department", false},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Create test struct with the input
			testStruct := TestStruct{Department: tc.input}

			// Validate the struct
			err := v.Struct(testStruct)

			if tc.expectValid {
				assert.NoError(t, err, "Input '%s' should be valid", tc.input)
			} else {
				assert.Error(t, err, "Input '%s' should be invalid", tc.input)
			}
		})
	}
}

// Benchmark the validation function
func BenchmarkIsAlphanumUnicodeWithSpaces(b *testing.B) {
	v := validator.New()
	_ = v.RegisterValidation("alphaNumUnicodeWithSpaces", IsAlphanumUnicodeWithSpaces)

	testStruct := struct {
		Department string `validate:"required,alphaNumUnicodeWithSpaces"`
	}{
		Department: "Sales Department 123",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = v.Struct(testStruct)
	}
}
