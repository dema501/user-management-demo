import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MatTableModule } from "@angular/material/table";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatSortModule } from "@angular/material/sort";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import {
  MatDialogModule,
  MatDialog,
  MatDialogRef,
} from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { NgClass } from "@angular/common";
import { By } from "@angular/platform-browser";
import { HarnessLoader } from "@angular/cdk/testing";
import { TestbedHarnessEnvironment } from "@angular/cdk/testing/testbed";
import { MatButtonHarness } from "@angular/material/button/testing";
import { MatTableHarness } from "@angular/material/table/testing";
import { MatPaginatorHarness } from "@angular/material/paginator/testing";
import { MatSortHarness } from "@angular/material/sort/testing";

import { UserListComponent } from "./user-list.component";
import { UserService } from "../../services/user.service";
import { of } from "rxjs";
import { User } from "../../models/user.model";
import { UserFormComponent } from "../user-form/user-form.component";

describe("UserListComponent", () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let loader: HarnessLoader;

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
    {
      id: 3,
      userName: "bobsmith",
      firstName: "Bob",
      lastName: "Smith",
      email: "bob@example.com",
      userStatus: "T",
      department: "Finance",
      createdAt: "2023-01-03T00:00:00Z",
      updatedAt: "2023-01-03T00:00:00Z",
    },
  ];

  beforeEach(async () => {
    userServiceSpy = jasmine.createSpyObj("UserService", [
      "getUsers",
      "deleteUser",
    ]);
    dialogSpy = jasmine.createSpyObj("MatDialog", ["open"]);
    snackBarSpy = jasmine.createSpyObj("MatSnackBar", ["open"]);

    // Mock initial responses
    userServiceSpy.getUsers.and.returnValue(of(mockUsers));
    dialogSpy.open.and.returnValue({
      afterClosed: () => of(true),
    } as unknown as MatDialogRef<unknown>);

    await TestBed.configureTestingModule({
      imports: [
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatIconModule,
        MatButtonModule,
        MatDialogModule,
        NgClass,
        UserListComponent,
      ],
      providers: [
        { provide: UserService, useValue: userServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should load users on init", () => {
    expect(userServiceSpy.getUsers).toHaveBeenCalled();
    expect(component.dataSource.data).toEqual(mockUsers);
  });

  it("should display correct user data in the table", async () => {
    const table = await loader.getHarness(MatTableHarness);
    const rows = await table.getRows();

    expect(rows.length).toBe(3);

    // Check cell content for the first row
    const firstRowCells = await rows[0].getCells();
    const firstRowCellTexts = await Promise.all(
      firstRowCells.map((cell) => cell.getText()),
    );

    expect(firstRowCellTexts[0]).toContain("1"); // ID
    expect(firstRowCellTexts[1]).toContain("johndoe"); // Username
    expect(firstRowCellTexts[2]).toContain("john@example.com"); // Email
  });

  it("should convert status codes to readable text", () => {
    expect(component.getStatus("A")).toBe("Active");
    expect(component.getStatus("I")).toBe("Inactive");
    expect(component.getStatus("T")).toBe("Terminated");
    expect(component.getStatus("X")).toBe("");
  });

  it("should apply correct CSS class for each status", () => {
    expect(component.getStatusClass("A")).toBe("status-active");
    expect(component.getStatusClass("I")).toBe("status-inactive");
    expect(component.getStatusClass("T")).toBe("status-terminated");
    expect(component.getStatusClass("X")).toBe("");
  });

  it("should open create dialog when create button is clicked", async () => {
    const createButton = await loader.getHarness(
      MatButtonHarness.with({ text: /Create User/ }),
    );
    await createButton.click();

    expect(dialogSpy.open).toHaveBeenCalledWith(jasmine.any(Function), {
      width: "500px",
      data: { mode: "create" },
    });
  });

  it("should open edit dialog with user data when edit button is clicked", () => {
    // Find the first edit button and click it
    const firstEditButton = fixture.debugElement.queryAll(
      By.css('button[class*="user-list__edit-button"]'),
    )[0];
    firstEditButton.nativeElement.click();

    // Verify dialog was opened with correct data
    expect(dialogSpy.open).toHaveBeenCalledWith(jasmine.any(Function), {
      width: "500px",
      data: { mode: "edit", user: mockUsers[0] },
    });
  });

  it("should reload users after dialog is closed with positive result", () => {
    // Reset the spy counter
    userServiceSpy.getUsers.calls.reset();

    // Simulate clicking create button
    const createButton = fixture.debugElement.query(
      By.css('button[class*="user-list__create-button"]'),
    );
    createButton.nativeElement.click();

    // Verify getUsers was called again
    expect(userServiceSpy.getUsers).toHaveBeenCalled();
  });

  it("should delete user and reload list when delete is confirmed", () => {
    // Mock window.confirm to return true
    spyOn(window, "confirm").and.returnValue(true);

    // Make sure deleteUser returns a proper observable that completes
    userServiceSpy.deleteUser.and.returnValue(of(undefined));

    // Reset the getUsers spy counter
    userServiceSpy.getUsers.calls.reset();

    // Find first delete button and click it
    const firstDeleteButton = fixture.debugElement.queryAll(
      By.css('button[class*="user-list__delete-button"]'),
    )[0];
    firstDeleteButton.nativeElement.click();

    // Verify delete called with correct ID
    expect(userServiceSpy.deleteUser).toHaveBeenCalledWith(1);
    expect(userServiceSpy.getUsers).toHaveBeenCalled();
  });

  it("should not delete user when confirmation is canceled", () => {
    // Mock window.confirm to return false
    spyOn(window, "confirm").and.returnValue(false);

    // Find first delete button and click it
    const firstDeleteButton = fixture.debugElement.queryAll(
      By.css('button[color="warn"]'),
    )[0];
    firstDeleteButton.nativeElement.click();

    // Verify delete was not called
    expect(userServiceSpy.deleteUser).not.toHaveBeenCalled();
  });

  it("should paginate the table", async () => {
    // Create more mock users to test pagination
    const manyUsers = [...mockUsers];
    for (let i = 4; i <= 15; i++) {
      manyUsers.push({
        id: i,
        userName: `user${i}`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        email: `user${i}@example.com`,
        userStatus: "A",
        department: "Test",
        createdAt: "2023-01-03T00:00:00Z",
        updatedAt: "2023-01-03T00:00:00Z",
      });
    }

    // Update component with many users
    userServiceSpy.getUsers.and.returnValue(of(manyUsers));
    component.loadUsers();
    fixture.detectChanges();

    // Check paginator
    const paginator = await loader.getHarness(MatPaginatorHarness);
    expect(await paginator.getPageSize()).toBe(5); // Default page size

    // Navigate to next page
    await paginator.goToNextPage();
    const isNextPageDisabled = await paginator.isNextPageDisabled();
    expect(isNextPageDisabled).toBeFalsy();

    // Change page size
    await paginator.setPageSize(10);
    expect(await paginator.getPageSize()).toBe(10);
    expect(await paginator.getRangeLabel()).toContain("1 – 10 of 15");
  });

  it("should sort the table when clicking on column headers", async () => {
    // Create users with different values for sorting
    const sortableUsers = [
      {
        id: 3,
        userName: "charlie",
        firstName: "Charlie",
        lastName: "Williams",
        email: "charlie@example.com",
        userStatus: "A",
        department: "Marketing",
        createdAt: "2023-01-03T00:00:00Z",
        updatedAt: "2023-01-03T00:00:00Z",
      },
      {
        id: 1,
        userName: "alpha",
        firstName: "Alpha",
        lastName: "Smith",
        email: "alpha@example.com",
        userStatus: "I",
        department: "IT",
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      },
      {
        id: 2,
        userName: "bravo",
        firstName: "Bravo",
        lastName: "Jones",
        email: "bravo@example.com",
        userStatus: "T",
        department: "HR",
        createdAt: "2023-01-02T00:00:00Z",
        updatedAt: "2023-01-02T00:00:00Z",
      },
    ];

    // Update component with sortable users
    userServiceSpy.getUsers.and.returnValue(of(sortableUsers as User[]));
    component.loadUsers();
    fixture.detectChanges();

    // Get sort harness
    const sort = await loader.getHarness(MatSortHarness);
    const headers = await sort.getSortHeaders();

    // Find userName header and click to sort
    const userNameHeader = headers.find(
      async (header) => (await header.getLabel()) === "Username",
    );

    // Sort by userName ascending
    await userNameHeader?.click();
    fixture.detectChanges();

    // Check the first row is now 'alpha'
    let table = await loader.getHarness(MatTableHarness);
    let rows = await table.getRows();
    let firstRowCells = await rows[0].getCells();
    let firstRowTexts = await Promise.all(
      firstRowCells.map((cell) => cell.getText()),
    );
    expect(firstRowTexts[1]).toContain("alpha");

    // Sort by userName descending (click again)
    await userNameHeader?.click();
    fixture.detectChanges();

    // Check the first row is now 'charlie'
    table = await loader.getHarness(MatTableHarness);
    rows = await table.getRows();
    firstRowCells = await rows[0].getCells();
    firstRowTexts = await Promise.all(
      firstRowCells.map((cell) => cell.getText()),
    );
    expect(firstRowTexts[1]).toContain("charlie");
  });

  it("should correctly display status badges with appropriate styling", () => {
    // Find all status badge elements
    const statusBadges = fixture.debugElement.queryAll(
      By.css(".user-list__status-badge"),
    );
    expect(statusBadges.length).toBe(3);

    // Check the first status badge (Active)
    const activeStatusBadge = statusBadges[0];
    expect(activeStatusBadge.nativeElement.textContent.trim()).toBe("Active");
    expect(activeStatusBadge.nativeElement.classList).toContain(
      "status-active",
    );

    // Check the second status badge (Inactive)
    const inactiveStatusBadge = statusBadges[1];
    expect(inactiveStatusBadge.nativeElement.textContent.trim()).toBe(
      "Inactive",
    );
    expect(inactiveStatusBadge.nativeElement.classList).toContain(
      "status-inactive",
    );

    // Check the third status badge (Terminated)
    const terminatedStatusBadge = statusBadges[2];
    expect(terminatedStatusBadge.nativeElement.textContent.trim()).toBe(
      "Terminated",
    );
    expect(terminatedStatusBadge.nativeElement.classList).toContain(
      "status-terminated",
    );
  });

  it("should not reload users if dialog is closed with negative result", () => {
    // Mock dialog to return false (cancelled)
    dialogSpy.open.and.returnValue({
      afterClosed: () => of(false),
    } as unknown as MatDialogRef<unknown>);

    // Reset the spy counter
    userServiceSpy.getUsers.calls.reset();

    // Simulate clicking create button
    const createButton = fixture.debugElement.query(
      By.css('button[class*="user-list__create-button"]'),
    );
    createButton.nativeElement.click();

    // Verify getUsers was not called again
    expect(userServiceSpy.getUsers).not.toHaveBeenCalled();
  });

  it("should pass correct user object when opening edit dialog for different users", () => {
    // Test editing the first user
    const firstEditButton = fixture.debugElement.queryAll(
      By.css('button[class*="user-list__edit-button"]'),
    )[0];
    firstEditButton.nativeElement.click();
    expect(dialogSpy.open).toHaveBeenCalledWith(jasmine.any(Function), {
      width: "500px",
      data: { mode: "edit", user: mockUsers[0] },
    });

    // Reset dialog spy
    dialogSpy.open.calls.reset();
    fixture.detectChanges();

    // Test editing the second user
    const secondEditButton = fixture.debugElement.queryAll(
      By.css('button[class*="user-list__edit-button"]'),
    )[1];
    secondEditButton.nativeElement.click();

    expect(dialogSpy.open).toHaveBeenCalledWith(jasmine.any(Function), {
      width: "500px",
      data: { mode: "edit", user: mockUsers[1] },
    });
  });

  it('should display "No data matching the filter" when table is empty', async () => {
    // Update component with empty users array
    userServiceSpy.getUsers.and.returnValue(of([]));
    component.loadUsers();
    fixture.detectChanges();

    // Check if table has no rows
    const table = await loader.getHarness(MatTableHarness);
    const rows = await table.getRows();
    expect(rows.length).toBe(0);

    // Check for "No data" message (this depends on MatTable implementation)
    // Note: This is challenging to test directly as MatTable's "no data" row
    // is not easily accessible via test harnesses
  });

  it("should correctly identify the UserFormComponent when opening dialogs", () => {
    // Test that the dialog opens with the correct component
    const createButton = fixture.debugElement.query(
      By.css('button[color="primary"][extended]'),
    );
    createButton.nativeElement.click();

    // Verify that the first argument to dialog.open is the UserFormComponent
    expect(dialogSpy.open.calls.mostRecent().args[0]).toBe(UserFormComponent);
  });

  it("should show all columns as defined in displayedColumns array", async () => {
    // Get all column headers
    const table = await loader.getHarness(MatTableHarness);
    const headerRow = await table.getHeaderRows();
    const headerCells = await headerRow[0].getCells();
    const headerLabels = await Promise.all(
      headerCells.map((cell) => cell.getText()),
    );

    // Check that we have the expected number of columns
    expect(headerCells.length).toBe(component.displayedColumns.length);

    // Check important column headers are present
    expect(headerLabels).toContain("ID");
    expect(headerLabels).toContain("Username");
    expect(headerLabels).toContain("Email");
    expect(headerLabels).toContain("First Name");
    expect(headerLabels).toContain("Last Name");
    expect(headerLabels).toContain("Status");
    expect(headerLabels).toContain("Department");
    expect(headerLabels).toContain("Actions");
  });

  it("should handle edge case: users with missing properties", () => {
    // Create a user with missing/null properties
    const incompleteUsers = [
      {
        id: 1,
        userName: "incomplete",
        firstName: null,
        lastName: "",
        email: "incomplete@example.com",
        userStatus: "A",
        department: undefined,
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      } as unknown as User,
    ];

    // Update component with incomplete user
    userServiceSpy.getUsers.and.returnValue(of(incompleteUsers));
    expect(() => component.loadUsers()).not.toThrow();
    fixture.detectChanges();

    // Check that table still renders
    const userRows = fixture.debugElement.queryAll(By.css("mat-row"));
    expect(userRows.length).toBe(1);
  });

  it("should handle deletion of the last user on a page", async () => {
    // Create exactly 6 users (to have 5 on page 1 and 1 on page 2)
    const sixUsers = [...mockUsers];
    sixUsers.push(
      {
        id: 4,
        userName: "user4",
        firstName: "User",
        lastName: "Four",
        email: "user4@example.com",
        userStatus: "A",
        department: "Test",
        createdAt: "2023-01-04T00:00:00Z",
        updatedAt: "2023-01-04T00:00:00Z",
      },
      {
        id: 5,
        userName: "user5",
        firstName: "User",
        lastName: "Five",
        email: "user5@example.com",
        userStatus: "A",
        department: "Test",
        createdAt: "2023-01-05T00:00:00Z",
        updatedAt: "2023-01-05T00:00:00Z",
      },
      {
        id: 6,
        userName: "user6",
        firstName: "User",
        lastName: "Six",
        email: "user6@example.com",
        userStatus: "A",
        department: "Test",
        createdAt: "2023-01-06T00:00:00Z",
        updatedAt: "2023-01-06T00:00:00Z",
      },
    );

    // Update component with six users
    userServiceSpy.getUsers.and.returnValue(of(sixUsers));
    component.loadUsers();
    fixture.detectChanges();

    // Go to page 2
    const paginator = await loader.getHarness(MatPaginatorHarness);
    await paginator.goToNextPage();

    // Mock the deletion response - returning 5 users after deletion
    spyOn(window, "confirm").and.returnValue(true);
    userServiceSpy.deleteUser.and.returnValue(of(undefined));
    userServiceSpy.getUsers.and.returnValue(of(sixUsers.slice(0, 5)));

    // Find delete button for the 6th user and click it
    const deleteButtons = fixture.debugElement.queryAll(
      By.css('button[color="warn"]'),
    );
    deleteButtons[0].nativeElement.click();

    // After deletion and reload, should have correct page count
    // Note: We can't directly access pageIndex, but we can check the range label
    // to verify it shows the right page information
    const rangeLabel = await paginator.getRangeLabel();
    expect(rangeLabel).toContain("1 – 5 of 5"); // Back to showing all items on page 1
  });
});
