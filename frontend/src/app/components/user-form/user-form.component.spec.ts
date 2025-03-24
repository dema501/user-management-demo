import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ReactiveFormsModule } from "@angular/forms";
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from "@angular/material/dialog";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatRadioModule } from "@angular/material/radio";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { UserFormComponent } from "./user-form.component";
import { UserService } from "../../services/user.service";
import { of, throwError } from "rxjs";
import {
  User,
  UserCreateRequest,
  UserUpdateRequest,
} from "../../models/user.model";
import { HarnessLoader } from "@angular/cdk/testing";
import { TestbedHarnessEnvironment } from "@angular/cdk/testing/testbed";
import { MatInputHarness } from "@angular/material/input/testing";
import { MatRadioGroupHarness } from "@angular/material/radio/testing";
import { MatButtonHarness } from "@angular/material/button/testing";

describe("UserFormComponent", () => {
  let component: UserFormComponent;
  let fixture: ComponentFixture<UserFormComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<UserFormComponent>>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let loader: HarnessLoader;

  const mockUser: User = {
    id: 1,
    userName: "johndoe",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    userStatus: "A",
    department: "IT",
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
  };

  const setupTestWithMode = async (mode: "create" | "edit", user?: User) => {
    dialogRef = jasmine.createSpyObj("MatDialogRef", ["close"]);
    userServiceSpy = jasmine.createSpyObj("UserService", [
      "createUser",
      "updateUser",
    ]);

    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatSnackBarModule,
        MatFormFieldModule,
        MatInputModule,
        MatRadioModule,
        MatButtonModule,
        MatIconModule,
        UserFormComponent,
      ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { mode, user } },
        { provide: UserService, useValue: userServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserFormComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  };

  describe("Create Mode", () => {
    beforeEach(async () => {
      await setupTestWithMode("create");
    });

    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("should initialize form with empty values for create mode", () => {
      expect(component.userForm.get("userName")?.value).toBe("");
      expect(component.userForm.get("firstName")?.value).toBe("");
      expect(component.userForm.get("lastName")?.value).toBe("");
      expect(component.userForm.get("email")?.value).toBe("");
      expect(component.userForm.get("userStatus")?.value).toBe("A");
      expect(component.userForm.get("department")?.value).toBe("");
    });

    it("should enable userName field in create mode", () => {
      expect(component.userForm.get("userName")?.enabled).toBeTrue();
    });

    it("should validate form fields properly", () => {
      // Validate userName
      let userNameControl = component.userForm.get("userName");
      userNameControl?.setValue("");
      expect(userNameControl?.valid).toBeFalse();
      userNameControl?.setValue("a".repeat(51));
      expect(userNameControl?.valid).toBeFalse();
      userNameControl?.setValue("validuser");
      expect(userNameControl?.valid).toBeTrue();

      // Validate email
      let emailControl = component.userForm.get("email");
      emailControl?.setValue("");
      expect(emailControl?.valid).toBeFalse();
      emailControl?.setValue("invalid-email");
      expect(emailControl?.valid).toBeFalse();
      emailControl?.setValue("valid@example.com");
      expect(emailControl?.valid).toBeTrue();
    });

    it("should call createUser on submit when form is valid", async () => {
      // Setup form with valid values
      component.userForm.setValue({
        userName: "newuser",
        firstName: "New",
        lastName: "User",
        email: "newuser@example.com",
        userStatus: "A",
        department: "Finance",
      });

      // Setup service mock response
      userServiceSpy.createUser.and.returnValue(
        of({
          id: 3,
          userName: "newuser",
          firstName: "New",
          lastName: "User",
          email: "newuser@example.com",
          userStatus: "A",
          department: "Finance",
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        }),
      );

      // Trigger form submit
      component.onSubmit();

      // Verify service was called
      expect(userServiceSpy.createUser).toHaveBeenCalledWith(
        jasmine.objectContaining({
          userName: "newuser",
          firstName: "New",
          lastName: "User",
          email: "newuser@example.com",
          userStatus: "A",
          department: "Finance",
        }),
      );

      // Verify dialog was closed
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it("should handle error when creating user", () => {
      // Setup form with valid values
      component.userForm.setValue({
        userName: "newuser",
        firstName: "New",
        lastName: "User",
        email: "newuser@example.com",
        userStatus: "A",
        department: "Finance",
      });

      // Setup service mock to throw error
      const errorResponse = { error: { error: "Username already exists" } };
      userServiceSpy.createUser.and.returnValue(
        throwError(() => errorResponse),
      );

      // Trigger form submit
      component.onSubmit();

      // Verify error handling
      expect(component.errorMessage).toBe("Username already exists");
      expect(component.isSubmitting).toBeFalse();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe("Edit Mode", () => {
    beforeEach(async () => {
      await setupTestWithMode("edit", mockUser);
    });

    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("should initialize form with user values for edit mode", () => {
      expect(component.userForm.get("userName")?.value).toBe("johndoe");
      expect(component.userForm.get("firstName")?.value).toBe("John");
      expect(component.userForm.get("lastName")?.value).toBe("Doe");
      expect(component.userForm.get("email")?.value).toBe("john@example.com");
      expect(component.userForm.get("userStatus")?.value).toBe("A");
      expect(component.userForm.get("department")?.value).toBe("IT");
    });

    it("should disable userName field in edit mode", () => {
      expect(component.userForm.get("userName")?.disabled).toBeTrue();
    });

    it("should call updateUser on submit when form is valid", () => {
      // Modify form values
      component.userForm.patchValue({
        firstName: "JohnUpdated",
        lastName: "DoeUpdated",
        email: "updated@example.com",
        userStatus: "I",
        department: "Marketing",
      });

      // Setup service mock response
      userServiceSpy.updateUser.and.returnValue(
        of({
          id: 1,
          userName: "johndoe",
          firstName: "JohnUpdated",
          lastName: "DoeUpdated",
          email: "updated@example.com",
          userStatus: "I",
          department: "Marketing",
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-02T00:00:00Z",
        }),
      );

      // Trigger form submit
      component.onSubmit();

      // Verify service was called
      expect(userServiceSpy.updateUser).toHaveBeenCalledWith(
        1,
        jasmine.objectContaining({
          // we don't want update userName from UI
          // userName: "johndoe",
          firstName: "JohnUpdated",
          lastName: "DoeUpdated",
          email: "updated@example.com",
          userStatus: "I",
          department: "Marketing",
        }),
      );

      // Verify dialog was closed
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it("should handle error when updating user", () => {
      // Modify form values
      component.userForm.patchValue({
        email: "pdated@example.com",
      });

      const errorMessage = "email already exists";
      // Setup service mock to throw error
      const errorResponse = { error: { error: errorMessage } };
      userServiceSpy.updateUser.and.returnValue(
        throwError(() => errorResponse),
      );

      // Trigger form submit
      component.onSubmit();

      // Verify error handling
      expect(component.errorMessage).toBe(errorMessage);
      expect(component.isSubmitting).toBeFalse();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe("UI Interaction Tests", () => {
    beforeEach(async () => {
      await setupTestWithMode("create");
    });

    it("should update form values when inputs change", async () => {
      // Get input fields
      const userNameInput = await loader.getHarness(
        MatInputHarness.with({ selector: 'input[formControlName="userName"]' }),
      );
      const emailInput = await loader.getHarness(
        MatInputHarness.with({ selector: 'input[formControlName="email"]' }),
      );

      // Set values
      await userNameInput.setValue("testuser");
      await emailInput.setValue("test@example.com");

      // Check form values
      expect(component.userForm.get("userName")?.value).toBe("testuser");
      expect(component.userForm.get("email")?.value).toBe("test@example.com");
    });

    it("should change status when radio button is selected", async () => {
      // Get radio group
      const radioGroup = await loader.getHarness(
        MatRadioGroupHarness.with({
          selector: 'mat-radio-group[formControlName="userStatus"]',
        }),
      );

      // Select inactive status
      const radioButtons = await radioGroup.getRadioButtons();
      await radioButtons[1].check(); // Select Inactive

      // Check form value
      expect(component.userForm.get("userStatus")?.value).toBe("I");
    });

    it("should disable submit button when form is invalid", async () => {
      // Get submit button
      const submitButton = await loader.getHarness(
        MatButtonHarness.with({ text: "Create" }),
      );

      // Clear required field to make form invalid
      const emailInput = await loader.getHarness(
        MatInputHarness.with({ selector: 'input[formControlName="email"]' }),
      );
      await emailInput.setValue("");

      // Check button is disabled
      expect(await submitButton.isDisabled()).toBeTrue();
    });

    it("should close dialog when cancel button is clicked", async () => {
      // Get cancel button
      const cancelButton = await loader.getHarness(
        MatButtonHarness.with({ text: "Cancel" }),
      );

      // Click cancel
      await cancelButton.click();

      // Verify dialog was closed
      expect(dialogRef.close).toHaveBeenCalled();
    });
  });
});
