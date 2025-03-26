import { Component, Inject, OnInit } from "@angular/core";
import { NgIf, NgFor } from "@angular/common";
import {
  FormsModule,
  FormBuilder,
  FormGroup,
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
export class UserFormComponent implements OnInit {
  userForm!: FormGroup;
  isSubmitting = false;
  errorMessage = "";

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
    this.initForm();
  }

  initForm(): void {
    this.userForm = this.fb.group({
      userName: [
        this.data.user?.userName || "",
        [Validators.required, Validators.maxLength(50)],
      ],
      firstName: [this.data.user?.firstName || "", [Validators.maxLength(255)]],
      lastName: [this.data.user?.lastName || "", [Validators.maxLength(255)]],
      email: [
        this.data.user?.email || "",
        [Validators.required, Validators.email],
      ],
      userStatus: [this.data.user?.userStatus || "A", [Validators.required]],
      department: [
        this.data.user?.department || "",
        [Validators.maxLength(255)],
      ],
    });

    // Disable the userName control if in edit mode
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
      this.userService.createUser(userRequest).subscribe({
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
    } else if (this.data.mode === "edit" && this.data.user) {
      const userRequest: UserUpdateRequest = this.userForm.value;
      this.userService.updateUser(this.data.user.id, userRequest).subscribe({
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
    }
  }

  handleError(error: unknown): void {
    this.isSubmitting = false;

    const defaultErrorMessage = "An error occurred. Please try again.";
    this.errorMessage =
      error instanceof Error && error.message?.trim()
        ? error.message
        : defaultErrorMessage;

    // eslint-disable-next-line no-console
    console.error(error);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
