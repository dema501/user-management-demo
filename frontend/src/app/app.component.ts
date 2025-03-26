import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { MatToolbarModule } from "@angular/material/toolbar";
@Component({
  selector: "app-root",
  imports: [RouterOutlet, MatToolbarModule],
  templateUrl: "./app.component.html",
  host: { class: "app-root" },
})
export class AppComponent {
  title = "User Management System";
}
