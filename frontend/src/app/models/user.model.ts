export type UserStatus = "A" | "I" | "T";

export interface User {
  id: number;
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  userStatus: UserStatus;
  department: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserCreateRequest {
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  userStatus: UserStatus;
  department: string;
}

export interface UserUpdateRequest {
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  userStatus: UserStatus;
  department: string;
}
