import { ComponentFixture, TestBed } from "@angular/core/testing";
import { AppComponent } from "./app.component";
import { provideRouter } from "@angular/router";
import { MatToolbarModule } from "@angular/material/toolbar";
import { By } from "@angular/platform-browser";

describe("AppComponent", () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatToolbarModule, AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
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
