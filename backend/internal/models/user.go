package models

import (
	"time"

	"github.com/uptrace/bun"
)

// UserCommon defines common fields for a user
//
//tygo:emit export type UserStatus = "A" | "I" | "T";
type UserCommon struct {
	// The username
	//	@minLength	4
	//	@maxLength	255
	//	@pattern	^[a-zA-Z0-9]+$
	//	@example	johndoe
	UserName string `json:"userName" validate:"required,min=4,max=255,alphanum" bun:"user_name,notnull" example:"johndoe"`

	//  First name
	//	@minLength	1
	//	@maxLength	255
	//	@pattern	^[\p{L}\p{N}]+$
	//	@example	John
	FirstName string `json:"firstName" validate:"required,min=1,max=255,alphanumunicode" bun:"first_name,notnull" example:"John"`

	// 	Last name
	//	@minLength	1
	//	@maxLength	255
	//	@pattern	^[\p{L}\p{N}]+$
	//	@example	Doe
	LastName string `json:"lastName" validate:"required,min=1,max=255,alphanumunicode" bun:"last_name,notnull" example:"Doe"`

	// Email address
	//	@maxLength	255
	//	@format		email
	//	@example	john.doe@example.com
	Email string `json:"email" validate:"required,max=255,email" bun:"email,unique,notnull" format:"email" example:"john.doe@example.com"`

	// User Status
	//	@enum		A,I,T
	//	@example	A
	UserStatus UserStatus `json:"userStatus" validate:"required,oneof=A I T" tstype:"UserStatus" bun:"user_status,notnull,type:varchar(1)" check:"user_status IN ('A', 'I', 'T')" example:"A" enums:"A,I,T"`

	// Department
	//	@maxLength	255
	//	@example	Engineering
	Department string `json:"department" validate:"omitempty,max=255,alphaNumUnicodeWithSpaces" bun:"department" example:"Engineering"`
} //@name UserCommon

// User represents a user in the system
type User struct {
	bun.BaseModel `bun:"table:users,alias:u" tstype:"-"`

	UserID int64 `bun:"user_id,pk,autoincrement" json:"id" example:"1"`

	UserCommon `tstype:",extends"`

	CreatedAt time.Time `bun:"created_at,notnull,default:current_timestamp" json:"createdAt" format:"date-time" example:"2025-03-27T10:23:51.495798-05:00"`
	UpdatedAt time.Time `bun:"updated_at,notnull,default:current_timestamp" json:"updatedAt" format:"date-time" example:"2025-03-27T10:23:51.495798-05:00"`
} //@name User

// UserCreateRequest is the request body for creating a user
// swagger:model UserCreateRequest
//
//	@required	["userName", "firstName", "lastName", "email", "userStatus"]
type UserCreateRequest struct {
	UserCommon `tstype:",extends"`
} //@name UserCreateRequest

// UserUpdateRequest is the request body for updating a user
// swagger:model UserUpdateRequest
//
//	@required	["userName", "firstName", "lastName", "email", "userStatus"]
type UserUpdateRequest struct {
	UserCommon `tstype:",extends"`
} //@name UserUpdateRequest
