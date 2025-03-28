import { Component, Inject, OnInit, OnDestroy } from "@angular/core";
import { NgIf, NgFor } from "@angular/common";
import {
  FormsModule,
  FormBuilder,
  FormGroup,
  ValidatorFn,
  Validators,
  ReactiveFormsModule,
} from "@angular/forms";

import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from "@angular/material/dialog";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatRadioModule } from "@angular/material/radio";
import { Subscription } from "rxjs";

import {
  User,
  UserCreateRequest,
  UserUpdateRequest,
  UserStatus,
} from "../../models/user.model";

import { UserService } from "../../services/user.service";

interface DialogData {
  mode: "create" | "edit";
  user?: User;
}

// for json schema validation
import schema from "../../models/schema.json";

interface SchemaProperty {
  description?: string;
  type?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  format?: string;
  $ref?: string;
}

interface RequestSchemaDefinition {
  properties: {
    [key: string]: SchemaProperty;
  };
  required: string[];
}

interface UserStatusSchema {
  description?: string;
  enum: UserStatus[];
  type: string;
}

interface JsonSchema {
  definitions: {
    UserCreateRequest: RequestSchemaDefinition;
    UserUpdateRequest: RequestSchemaDefinition;
    UserStatus: UserStatusSchema;
  };
}

// Add a ValidationMessages interface
interface ValidationMessages {
  [key: string]: {
    [validationType: string]: string;
  };
}

@Component({
  selector: "app-user-form",
  templateUrl: "./user-form.component.html",
  styleUrls: ["./user-form.component.scss"],
  imports: [
    NgIf,
    NgFor,
    FormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
})
export class UserFormComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];

  userForm!: FormGroup;
  isSubmitting = false;
  errorMessage = "";
  validationMessages: ValidationMessages = {};

  userStatusOptions: { value: UserStatus; label: string }[] = [
    { value: "A", label: "Active" },
    { value: "I", label: "Inactive" },
    { value: "T", label: "Terminated" },
  ];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<UserFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
  ) {}

  ngOnInit(): void {
    this.generateValidationMessages();
    this.initForm();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  // Generate validation messages from schema
  private generateValidationMessages(): void {
    const requestSchema = (schema as JsonSchema).definitions[
      this.data.mode === "edit" ? "UserUpdateRequest" : "UserCreateRequest"
    ] as RequestSchemaDefinition;
    const requestProperties = requestSchema.properties;

    const userStatusSchema = (schema as JsonSchema).definitions.UserStatus;

    Object.entries(requestProperties).forEach(([fieldName, fieldSchema]) => {
      this.validationMessages[fieldName] = {
        required: `${fieldSchema.description || fieldName} is required`,
        maxlength: `${fieldSchema.description || fieldName} cannot be longer than ${fieldSchema.maxLength} characters`,
        minlength: `${fieldSchema.description || fieldName} must be at least ${fieldSchema.minLength} characters`,
        pattern: `${fieldSchema.description || fieldName} format is invalid`,
        email: "Please enter a valid email address",
      };

      // Add specific messages based on field
      if (fieldSchema.$ref === "#/definitions/UserStatus") {
        this.validationMessages[fieldName]["enum"] =
          `Status must be one of: ${userStatusSchema.enum.join(", ")}`;
      }
    });
  }

  private getValidatorsFromSchema(fieldName: string): ValidatorFn[] {
    const requestSchema = (schema as JsonSchema).definitions[
      this.data.mode === "edit" ? "UserUpdateRequest" : "UserCreateRequest"
    ] as RequestSchemaDefinition;
    const requestProperties = requestSchema.properties;

    const fieldSchema = requestProperties[fieldName];
    const validators: ValidatorFn[] = [];

    if (
      (schema as JsonSchema).definitions[
        this.data.mode === "edit" ? "UserUpdateRequest" : "UserCreateRequest"
      ].required.includes(fieldName)
    ) {
      validators.push(Validators.required);
    }

    if (fieldSchema) {
      if (fieldSchema.maxLength) {
        validators.push(Validators.maxLength(fieldSchema.maxLength));
      }

      if (fieldSchema.minLength) {
        validators.push(Validators.minLength(fieldSchema.minLength));
      }

      if (fieldSchema.pattern) {
        try {
          // Create RegExp with Unicode flag
          const pattern = new RegExp(fieldSchema.pattern, "u");
          validators.push(Validators.pattern(pattern));
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(`Invalid pattern for ${fieldName}:`, e);
        }
      }

      if (fieldSchema.format === "email") {
        validators.push(Validators.email);
      }
    }

    return validators;
  }

  initForm(): void {
    this.userForm = this.fb.group({
      userName: [
        this.data.user?.userName || "",
        this.getValidatorsFromSchema("userName"),
      ],
      firstName: [
        this.data.user?.firstName || "",
        this.getValidatorsFromSchema("firstName"),
      ],
      lastName: [
        this.data.user?.lastName || "",
        this.getValidatorsFromSchema("lastName"),
      ],

      email: [
        this.data.user?.email || "",
        this.getValidatorsFromSchema("email"),
      ],
      userStatus: [
        this.data.user?.userStatus || "A",
        this.getValidatorsFromSchema("userStatus"),
      ],

      department: [
        this.data.user?.department || "",
        this.getValidatorsFromSchema("department"),
      ],
    });

    // Disable the userName control if in edit mode
    // keep in mind that userName still needs to be sent to the server with UserUpdateRequest
    if (this.data.mode === "edit") {
      this.userForm.get("userName")?.disable();
    }
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = "";

    if (this.data.mode === "create") {
      const userRequest: UserCreateRequest = this.userForm.value;
      const sub = this.userService.createUser(userRequest).subscribe({
        next: () => {
          this.snackBar.open("User created successfully", "Close", {
            duration: 3000,
          });
          this.dialogRef.close(true);
        },
        error: (error: unknown) => {
          this.handleError(error);
        },
      });
      this.subscriptions.push(sub);
    } else if (this.data.mode === "edit" && this.data.user) {
      const userRequest: UserUpdateRequest = this.userForm.getRawValue();
      const sub = this.userService
        .updateUser(this.data.user.id, userRequest)
        .subscribe({
          next: () => {
            this.snackBar.open("User updated successfully", "Close", {
              duration: 3000,
            });
            this.dialogRef.close(true);
          },
          error: (error: unknown) => {
            this.handleError(error);
          },
        });
      this.subscriptions.push(sub);
    }
  }

  // Helper method to get error message
  getErrorMessage(fieldName: string): string {
    const control = this.userForm.get(fieldName);
    if (control && control.errors && this.validationMessages[fieldName]) {
      const firstError = Object.keys(control.errors)[0];
      return this.validationMessages[fieldName][firstError];
    }
    return "";
  }

  // Helper method to handle error
  handleError(error: unknown): void {
    this.isSubmitting = false;

    const defaultErrorMessage = "An error occurred. Please try again.";

    if (error instanceof Error) {
      this.errorMessage = error.message?.trim() || defaultErrorMessage;
    } else if (
      typeof error === "object" &&
      error !== null &&
      "error" in error
    ) {
      const errorObj = error as { error: { error?: string } };
      this.errorMessage = errorObj.error?.error || defaultErrorMessage;
    } else {
      this.errorMessage = defaultErrorMessage;
    }

    // eslint-disable-next-line no-console
    console.error(error);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
