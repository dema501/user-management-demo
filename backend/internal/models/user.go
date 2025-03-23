package models

import (
	"time"

	"github.com/uptrace/bun"
)

// UserStatus defines the status of a user
type UserStatus string

const (
	UserStatusActive     UserStatus = "A"
	UserStatusInactive   UserStatus = "I"
	UserStatusTerminated UserStatus = "T"
)

type User struct {
	bun.BaseModel `bun:"table:users,alias:u"`

	UserID     int64      `bun:"user_id,pk,autoincrement" json:"userId"`
	UserName   string     `bun:"user_name,notnull" json:"userName"`
	FirstName  string     `bun:"first_name" json:"firstName"`
	LastName   string     `bun:"last_name" json:"lastName"`
	Email      string     `bun:"email,unique,notnull" json:"email"`
	UserStatus UserStatus `bun:"user_status,notnull,type:varchar(1)" json:"userStatus" check:"user_status IN ('A', 'I', 'T')"`
	Department string     `bun:"department" json:"department"`
	CreatedAt  time.Time  `bun:"created_at,notnull,default:current_timestamp" json:"createdAt"`
	UpdatedAt  time.Time  `bun:"updated_at,notnull,default:current_timestamp" json:"updatedAt"`
}

// UserCreateRequest is the request body for creating a user
// swagger:model UserCreateRequest
type UserCreateRequest struct {
	// The username for the user, must be provided, minimum 4 alphanumeric characters
	// required: true
	// minLength: 4
	// maxLength: 255
	// pattern: ^[a-zA-Z0-9]+$
	// example: johndoe
	UserName string `json:"userName" validate:"required,min=4,max=255,alphanum"`

	// The first name of the user, must be provided, minimum 1 character, can have spaces
	// required: true
	// minLength: 1
	// maxLength: 255
	// pattern: ^[a-zA-Z0-9]+$
	// example: John
	FirstName string `json:"firstName" validate:"required,min=1,max=255,alphanumunicode"`

	// The last name of the user, must be provided, minimum 1 character, can have spaces
	// required: true
	// minLength: 1
	// maxLength: 255
	// pattern: ^[a-zA-Z0-9]+$
	// example: Doe
	LastName string `json:"lastName" validate:"required,min=1,max=255,alphanumunicode"`

	// Email address of the user, must be a valid email format
	// required: true
	// maxLength: 255
	// format: email
	// example: john.doe@example.com
	Email string `json:"email" validate:"required,max=255,email"`

	// Status of the user (A=Active, I=Inactive, T=Terminated)
	// required: true
	// enum: A,I,T
	// example: A
	UserStatus UserStatus `json:"userStatus" validate:"required,oneof=A I T"`

	// Department the user belongs to, alphanumeric with spaces allowed
	// maxLength: 255
	// example: Engineering
	Department string `json:"department" validate:"omitempty,max=255,alphanumunicode"`
}

// UserUpdateRequest is the request body for updating a user
// swagger:model UserUpdateRequest
type UserUpdateRequest struct {
	// The username for the user, must be provided, minimum 4 alphanumeric characters
	// required: true
	// minLength: 4
	// maxLength: 255
	// pattern: ^[a-zA-Z0-9]+$
	// example: johndoe
	UserName string `json:"userName" validate:"required,min=4,max=255,alphanum"`

	// The first name of the user, must be provided, minimum 1 character, can have spaces
	// required: true
	// minLength: 1
	// maxLength: 255
	// pattern: ^[a-zA-Z0-9]+$
	// example: John
	FirstName string `json:"firstName" validate:"required,min=1,max=255,alphanumunicode"`

	// The last name of the user, must be provided, minimum 1 character, can have spaces
	// required: true
	// minLength: 1
	// maxLength: 255
	// pattern: ^[a-zA-Z0-9]+$
	// example: Doe
	LastName string `json:"lastName" validate:"required,min=1,max=255,alphanumunicode"`

	// Email address of the user, must be a valid email format
	// required: true
	// maxLength: 255
	// format: email
	// example: john.doe@example.com
	Email string `json:"email" validate:"required,max=255,email"`

	// Status of the user (A=Active, I=Inactive, T=Terminated)
	// required: true
	// enum: A,I,T
	// example: A
	UserStatus UserStatus `json:"userStatus" validate:"required,oneof=A I T"`

	// Department the user belongs to, alphanumeric with spaces allowed
	// maxLength: 255
	// example: Engineering
	Department string `json:"department" validate:"omitempty,max=255,alphanumunicode"`
}
