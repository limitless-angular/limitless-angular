import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'presentation-smoke',
    loadComponent: () =>
      import('./presentation-smoke/presentation-smoke.component').then(
        (module) => module.PresentationSmokeComponent,
      ),
  },
  { path: '', redirectTo: 'presentation-smoke', pathMatch: 'full' },
  { path: '**', redirectTo: 'presentation-smoke' },
];
