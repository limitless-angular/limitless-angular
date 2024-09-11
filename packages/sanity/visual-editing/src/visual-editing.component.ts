import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
  VisualEditingClientComponent,
  type VisualEditingProps,
} from './visual-editing-client.component';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'visual-editing',
  standalone: true,
  imports: [VisualEditingClientComponent],
  template: `
    @if (isBrowser) {
      <visual-editing-client
        [refresh]="refresh()"
        [zIndex]="zIndex()"
        [basePath]="computedBasePath()"
        [trailingSlash]="computedTrailingSlash()"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualEditingComponent {
  refresh = input<VisualEditingProps['refresh']>();
  zIndex = input<VisualEditingProps['zIndex']>();
  basePath = input<VisualEditingProps['basePath']>(undefined);
  trailingSlash = input<VisualEditingProps['trailingSlash']>();

  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private autoBasePath = computed(() => {
    if (typeof this.basePath() === 'string') {
      return undefined;
    }

    try {
      const detectedBasePath = !this.isBrowser
        ? process.env['__NEXT_ROUTER_BASEPATH']
        : undefined;
      if (detectedBasePath) {
        console.log(
          `Detected next basePath as ${JSON.stringify(detectedBasePath)} by reading "process.env.__NEXT_ROUTER_BASEPATH". If this is incorrect then you can set it manually with the basePath input on the VisualEditing component.`,
        );
      }

      return detectedBasePath;
    } catch (err) {
      console.error('Failed detecting basePath', err);
      return undefined;
    }
  });

  private autoTrailingSlash = computed(() => {
    if (typeof this.trailingSlash() === 'boolean') {
      return undefined;
    }

    try {
      const detectedTrailingSlash = Boolean(
        !this.isBrowser && process.env['__NEXT_TRAILING_SLASH'],
      );
      if (detectedTrailingSlash) {
        console.log(
          `Detected next trailingSlash as ${JSON.stringify(detectedTrailingSlash)} by reading "process.env.__NEXT_TRAILING_SLASH". If this is incorrect then you can set it manually with the trailingSlash input on the VisualEditing component.`,
        );
      }

      return detectedTrailingSlash;
    } catch (err) {
      console.error('Failed detecting trailingSlash', err);
      return undefined;
    }
  });

  computedBasePath = computed(() => this.basePath() ?? this.autoBasePath());
  computedTrailingSlash = computed(
    () => this.trailingSlash() ?? this.autoTrailingSlash(),
  );
}
