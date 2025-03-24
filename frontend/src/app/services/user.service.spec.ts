import { TestBed } from "@angular/core/testing";
import {
  provideHttpClientTesting,
  HttpTestingController,
} from "@angular/common/http/testing";
import { provideHttpClient } from "@angular/common/http";
import { UserService } from "./user.service";
import {
  User,
  UserCreateRequest,
  UserUpdateRequest,
} from "../models/user.model";

import { environment } from "../../environments/environment";

describe("UserService", () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/api/v1/users`;

  const mockUsers: User[] = [
    {
      id: 1,
      userName: "johndoe",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      userStatus: "A",
      department: "IT",
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
    },
    {
      id: 2,
      userName: "janedoe",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      userStatus: "I",
      department: "HR",
      createdAt: "2023-01-02T00:00:00Z",
      updatedAt: "2023-01-02T00:00:00Z",
    },
  ];

  const mockUserCreateRequest: UserCreateRequest = {
    userName: "newuser",
    firstName: "New",
    lastName: "User",
    email: "newuser@example.com",
    userStatus: "A",
    department: "Finance",
  };

  const mockUserUpdateRequest: UserUpdateRequest = {
    userName: "johndoe",
    firstName: "John",
    lastName: "Doe Updated",
    email: "john@example.com",
    userStatus: "I",
    department: "Marketing",
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("getUsers", () => {
    it("should return an Observable<User[]>", () => {
      service.getUsers().subscribe((users) => {
        expect(users.length).toBe(2);
        expect(users).toEqual(mockUsers);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe("GET");
      req.flush(mockUsers);
    });
  });

  describe("getUserById", () => {
    it("should return a single user by id", () => {
      const userId = 1;
      service.getUserById(userId).subscribe((user) => {
        expect(user).toEqual(mockUsers[0]);
      });

      const req = httpMock.expectOne(`${apiUrl}/${userId}`);
      expect(req.request.method).toBe("GET");
      req.flush(mockUsers[0]);
    });
  });

  describe("createUser", () => {
    it("should create a new user", () => {
      const newUser: User = {
        ...mockUserCreateRequest,
        id: 3,
        createdAt: "2023-01-03T00:00:00Z",
        updatedAt: "2023-01-03T00:00:00Z",
      };

      service.createUser(mockUserCreateRequest).subscribe((user) => {
        expect(user).toEqual(newUser);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe("POST");
      expect(req.request.body).toEqual(mockUserCreateRequest);
      req.flush(newUser);
    });
  });

  describe("updateUser", () => {
    it("should update an existing user", () => {
      const userId = 1;
      const updatedUser: User = {
        ...mockUserUpdateRequest,
        id: userId,
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-04T00:00:00Z",
      };

      service.updateUser(userId, mockUserUpdateRequest).subscribe((user) => {
        expect(user).toEqual(updatedUser);
      });

      const req = httpMock.expectOne(`${apiUrl}/${userId}`);
      expect(req.request.method).toBe("PUT");
      expect(req.request.body).toEqual(mockUserUpdateRequest);
      req.flush(updatedUser);
    });
  });

  describe("deleteUser", () => {
    it("should delete a user", () => {
      const userId = 1;
      service.deleteUser(userId).subscribe((response) => {
        expect(response).toBeNull();
      });

      const req = httpMock.expectOne(`${apiUrl}/${userId}`);
      expect(req.request.method).toBe("DELETE");
      req.flush(null);
    });
  });
});
