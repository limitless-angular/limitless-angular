import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { VisualEditingComponent } from '@limitless-angular/sanity/visual-editing';
import { AlertBannerComponent } from './pages/(blog)/components/alert-banner.component';

@Component({
  selector: 'blog-root',
  standalone: true,
  imports: [RouterOutlet, VisualEditingComponent, AlertBannerComponent],
  template: `<router-outlet />`,
  styles: `
    :host {
      display: contents;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
