// Code generated by tygo. DO NOT EDIT.

//////////
// source: user.go

export type UserStatus = "A" | "I" | "T";
/**
 * UserCommon defines common fields for a user
 */
export interface UserCommon {
  /**
   * The username
   * 	@minLength	4
   * 	@maxLength	255
   * 	@pattern	^[a-zA-Z0-9]+$
   * 	@example	johndoe
   */
  userName: string;
  /**
   *  First name
   * 	@minLength	1
   * 	@maxLength	255
   * 	@pattern	^[\p{L}\p{N}]+$
   * 	@example	John
   */
  firstName: string;
  /**
   * 	Last name
   * 	@minLength	1
   * 	@maxLength	255
   * 	@pattern	^[\p{L}\p{N}]+$
   * 	@example	Doe
   */
  lastName: string;
  /**
   * Email address
   * 	@maxLength	255
   * 	@format		email
   * 	@example	john.doe@example.com
   */
  email: string;
  /**
   * User Status
   * 	@enum		A,I,T
   * 	@example	A
   */
  userStatus: UserStatus;
  /**
   * Department
   * 	@maxLength	255
   * 	@example	Engineering
   */
  department: string;
} // @name UserCommon
/**
 * User represents a user in the system
 */
export interface User extends UserCommon {
  id: number /* int64 */;
  createdAt: string /* RFC3339 */;
  updatedAt: string /* RFC3339 */;
} // @name User
/**
 * UserCreateRequest is the request body for creating a user
 * swagger:model UserCreateRequest
 * 	@required	["userName", "firstName", "lastName", "email", "userStatus"]
 */
export interface UserCreateRequest extends UserCommon {} // @name UserCreateRequest
/**
 * UserUpdateRequest is the request body for updating a user
 * swagger:model UserUpdateRequest
 * 	@required	["userName", "firstName", "lastName", "email", "userStatus"]
 */
export interface UserUpdateRequest extends UserCommon {} // @name UserUpdateRequest
