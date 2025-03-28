package models

// UserStatus defines the status of a user
type UserStatus string //@name UserStatus

const (
	// UserStatusActive represents an active user
	UserStatusActive UserStatus = "A"
	// UserStatusInactive represents an inactive user
	UserStatusInactive UserStatus = "I"
	// UserStatusTerminated represents a terminated user
	UserStatusTerminated UserStatus = "T"
)
