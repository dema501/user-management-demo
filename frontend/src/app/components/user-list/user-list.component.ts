import { Component, OnInit, ViewChild } from "@angular/core";
import { NgClass } from "@angular/common";
import { MatTableModule, MatTableDataSource } from "@angular/material/table";
import { Subscription } from "rxjs";
import { MatIconModule } from "@angular/material/icon";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatButtonModule } from "@angular/material/button";
import { MatSortModule } from "@angular/material/sort";

import { User } from "../../models/user.model";
import { UserService } from "../../services/user.service";
import { UserFormComponent } from "../user-form/user-form.component";

@Component({
  selector: "app-user-list",
  templateUrl: "./user-list.component.html",
  styleUrls: ["./user-list.component.scss"],
  imports: [
    NgClass,
    MatPaginatorModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSortModule,
  ],
})
export class UserListComponent implements OnInit {
  private subscriptions: Subscription[] = [];

  displayedColumns: string[] = [
    "id",
    "userName",
    "email",
    "firstName",
    "lastName",
    "userStatus",
    "department",
    "actions",
  ];
  dataSource = new MatTableDataSource<User>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  loadUsers(): void {
    const sub = this.userService.getUsers().subscribe({
      next: (users) => {
        this.dataSource.data = users;
      },
      error: (error: unknown) => {
        this.snackBar.open("Failed to load users", "Close", { duration: 3000 });

        // eslint-disable-next-line no-console
        console.error(error);
      },
    });
    this.subscriptions.push(sub);
  }

  getStatusClass(status: string): string {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case "a":
        return "status-active";
      case "i":
        return "status-inactive";
      case "t":
        return "status-terminated";
      default:
        return "";
    }
  }

  getStatus(userStatus: string): string {
    const statusLower = userStatus?.toLowerCase();
    switch (statusLower) {
      case "a":
        return "Active";
      case "i":
        return "Inactive";
      case "t":
        return "Terminated";
      default:
        return "";
    }
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(UserFormComponent, {
      width: "500px",
      data: { mode: "create" },
    });

    const sub = dialogRef.afterClosed().subscribe((result: User) => {
      if (result) {
        this.loadUsers();
      }
    });
    this.subscriptions.push(sub);
  }

  openEditDialog(user: User): void {
    const dialogRef = this.dialog.open(UserFormComponent, {
      width: "500px",
      data: { mode: "edit", user },
    });

    const sub = dialogRef.afterClosed().subscribe((result: User) => {
      if (result) {
        this.loadUsers();
      }
    });
    this.subscriptions.push(sub);
  }

  deleteUser(id: number): void {
    if (confirm("Are you sure you want to delete this user?")) {
      const sub = this.userService.deleteUser(id).subscribe({
        next: () => {
          this.snackBar.open("User deleted successfully", "Close", {
            duration: 3000,
          });
          this.loadUsers();
        },
        error: (error: unknown) => {
          this.snackBar.open("Failed to delete user", "Close", {
            duration: 3000,
          });

          // eslint-disable-next-line no-console
          console.error(error);
        },
      });
      this.subscriptions.push(sub);
    }
  }
}
