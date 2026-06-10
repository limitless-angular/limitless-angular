import {
  ApplicationRef,
  Component,
  inject,
  effect,
  signal,
  computed,
  ChangeDetectionStrategy,
  EnvironmentInjector,
  Injector,
  input,
  output,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';

import { filter } from 'rxjs/operators';
import type { ClientPerspective } from '@sanity/client';

import { enableVisualEditing } from './ui/enable-visual-editing';
import type { HistoryAdapterNavigate, VisualEditingOptions } from './types';
import {
  addPathPrefix,
  normalizePathTrailingSlash,
  removePathPrefix,
} from './utils';

export interface VisualEditingProps
  extends Omit<VisualEditingOptions, 'history' | 'onPerspectiveChange'> {
  /**
   * If next.config.ts is configured with a basePath we try to configure it automatically,
   * you can disable this by setting basePath to ''.
   * @example basePath="/my-custom-base-path"
   * @alpha experimental and may change without notice
   * @defaultValue process.env.__NEXT_ROUTER_BASEPATH || ''
   */
  basePath?: string;
  /**
   * If next.config.ts is configured with a `trailingSlash` we try to detect it automatically,
   * it can be controlled manually by passing a boolean.
   * @example trailingSlash={true}
   * @alpha experimental and may change without notice
   * @defaultValue Boolean(process.env.__NEXT_TRAILING_SLASH)
   */
  trailingSlash?: boolean;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'visual-editing-client',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualEditingClientComponent {
  components = input<VisualEditingProps['components']>();

  plugins = input<VisualEditingProps['plugins']>();

  refresh = input<VisualEditingProps['refresh']>();

  zIndex = input<VisualEditingProps['zIndex']>();

  handlesPerspectiveChange = input(false);

  perspectiveChange = output<ClientPerspective>();

  basePath = input<string, VisualEditingProps['basePath']>('', {
    transform: (value) => value ?? '',
  });

  trailingSlash = input<boolean, VisualEditingProps['trailingSlash']>(false, {
    transform: (value) => Boolean(value),
  });

  private navigate = signal<HistoryAdapterNavigate | undefined>(undefined);

  private applicationRef = inject(ApplicationRef);

  private currentUrl = computed(() => {
    const urlTree = this.router.parseUrl(this.router.url);
    const primaryPath =
      urlTree.root.children['primary']?.segments
        .map((segment) => segment.path)
        .join('/') ?? '';
    const pathname = primaryPath ? `/${primaryPath}` : '/';
    const searchParams = new URLSearchParams(urlTree.queryParams).toString();
    const hash = urlTree.fragment ? `#${urlTree.fragment}` : '';
    return normalizePathTrailingSlash(
      addPathPrefix(
        `${pathname}${searchParams ? `?${searchParams}` : ''}${hash}`,
        this.basePath(),
      ),
      this.trailingSlash(),
    );
  });

  private location = inject(Location);

  private environmentInjector = inject(EnvironmentInjector);

  private injector = inject(Injector);

  private router = inject(Router);

  constructor() {
    effect((onCleanup) => {
      const components = this.components();
      const plugins = this.plugins();
      const zIndex = this.zIndex();
      const refresh = this.refresh();
      const basePath = this.basePath();
      const handlesPerspectiveChange = this.handlesPerspectiveChange();
      const onPerspectiveChange = handlesPerspectiveChange
        ? (perspective: ClientPerspective) => {
            this.perspectiveChange.emit(perspective);
          }
        : undefined;

      untracked(() => {
        const disable = enableVisualEditing({
          applicationRef: this.applicationRef,
          components,
          environmentInjector: this.environmentInjector,
          injector: this.injector,
          plugins,
          zIndex,
          onPerspectiveChange,
          refresh: refresh || this.defaultRefresh,
          history: {
            subscribe: (_navigate) => {
              this.navigate.set(_navigate);
              return () => this.navigate.set(undefined);
            },
            update: (update) => {
              switch (update.type) {
                case 'push':
                  return this.router.navigateByUrl(
                    removePathPrefix(update.url, basePath),
                  );
                case 'pop':
                  return this.location.back();
                case 'replace':
                  return this.router.navigateByUrl(
                    removePathPrefix(update.url, basePath),
                    { replaceUrl: true },
                  );
                default:
                  throw new Error(`Unknown update type: ${update.type}`);
              }
            },
          },
        });

        onCleanup(() => disable());
      });
    });

    effect(() => {
      const currentNavigate = this.navigate();
      const url = this.currentUrl();

      untracked(() => {
        if (currentNavigate) {
          currentNavigate({
            type: 'push',
            url,
          });
        }
      });
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        const currentNavigate = this.navigate();
        const url = this.currentUrl();

        untracked(() => {
          if (currentNavigate) {
            currentNavigate({
              type: 'push',
              url,
            });
          }
        });
      });
  }

  private defaultRefresh: VisualEditingOptions['refresh'] = (payload) => {
    if (payload.source === 'mutation' && payload.livePreviewEnabled) {
      console.debug(
        'Live preview is setup, mutation is skipped assuming its handled by the live preview',
      );
      return false;
    }

    console.debug(
      'No Angular route revalidation hook was provided, refreshing the browser document',
    );
    window.location.reload();
    return Promise.resolve();
  };
}
