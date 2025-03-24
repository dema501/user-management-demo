import { ComponentFixture, TestBed } from "@angular/core/testing";
import { AppComponent } from "./app.component";
import { RouterTestingModule } from "@angular/router/testing";
import { MatToolbarModule } from "@angular/material/toolbar";
import { Router } from "@angular/router";
import { By } from "@angular/platform-browser";
// import { NoopAnimationsModule } from "@angular/platform-browser/animations";

describe("AppComponent", () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        MatToolbarModule,
        // NoopAnimationsModule,
        AppComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it("should create the app", () => {
    expect(component).toBeTruthy();
  });

  it(`should have the correct title`, () => {
    expect(component.title).toEqual("User Management System");
  });

  it("should render toolbar with title", () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector("mat-toolbar")?.textContent).toContain(
      "User Management System",
    );
  });

  it("should contain router-outlet", () => {
    const routerOutlet = fixture.debugElement.query(By.css("router-outlet"));
    expect(routerOutlet).toBeTruthy();
  });
});
