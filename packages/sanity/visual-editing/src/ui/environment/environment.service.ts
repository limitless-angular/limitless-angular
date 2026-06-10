import {
  Injectable,
  computed,
  inject,
  signal,
  untracked,
  type Signal,
} from '@angular/core';

/**
 * The environment is `null` until `<visual-editing />` is rendered on the page.
 */
export type VisualEditingEnvironment =
  | null
  | 'presentation-iframe'
  | 'presentation-window'
  | 'standalone';

@Injectable({ providedIn: 'root' })
export class VisualEditingEnvironmentService {
  readonly environment = computed(() => this.#environment());
  readonly isPresentationTool = computed(() => {
    const environment = this.environment();
    if (environment === null) {
      return null;
    }
    return (
      environment === 'presentation-iframe' ||
      environment === 'presentation-window'
    );
  });

  readonly #environment = signal<VisualEditingEnvironment>(null);

  setEnvironment(environment: VisualEditingEnvironment): void {
    if (untracked(() => this.#environment()) === environment) {
      return;
    }
    this.#environment.set(environment);
  }
}

export function injectVisualEditingEnvironment(): Signal<VisualEditingEnvironment> {
  return inject(VisualEditingEnvironmentService).environment;
}

export function injectIsPresentationTool(): Signal<null | boolean> {
  return inject(VisualEditingEnvironmentService).isPresentationTool;
}
