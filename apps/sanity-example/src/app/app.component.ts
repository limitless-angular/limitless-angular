import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterOutlet],
  selector: 'app-root',
  template: `<h1>Welcome sanity-example</h1>
    <router-outlet />`,
  styles: ``,
})
export class AppComponent {}
