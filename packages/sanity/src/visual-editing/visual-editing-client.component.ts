import {
  Component,
  inject,
  effect,
  signal,
  computed,
  ChangeDetectionStrategy,
  input,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';

import {
  enableVisualEditing,
  type HistoryAdapterNavigate,
  type VisualEditingOptions,
} from '@sanity/visual-editing';
import { filter } from 'rxjs/operators';

// import { revalidateRootLayout } from 'next-sanity/visual-editing/server-actions'; // You might need to adapt this import

import {
  addPathPrefix,
  normalizePathTrailingSlash,
  removePathPrefix,
} from './utils';

export interface VisualEditingProps
  extends Omit<VisualEditingOptions, 'history'> {
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
  refresh = input<VisualEditingProps['refresh']>();

  zIndex = input<VisualEditingProps['zIndex']>();

  basePath = input<string, VisualEditingProps['basePath']>('', {
    transform: (value) => value ?? '',
  });

  trailingSlash = input<boolean, VisualEditingProps['trailingSlash']>(false, {
    transform: (value) => Boolean(value),
  });

  private navigate = signal<HistoryAdapterNavigate | undefined>(undefined);

  private currentUrl = computed(() => {
    const urlTree = this.router.parseUrl(this.router.url);
    const pathname =
      urlTree.root.children['primary']?.segments
        .map((segment) => segment.path)
        .join('/') || '/';
    const searchParams = new URLSearchParams(urlTree.queryParams).toString();
    return normalizePathTrailingSlash(
      addPathPrefix(
        `${pathname}${searchParams ? `?${searchParams}` : ''}`,
        this.basePath(),
      ),
      this.trailingSlash(),
    );
  });

  private location = inject(Location);

  private router = inject(Router);

  constructor() {
    effect(() => {
      const zIndex = this.zIndex();
      const refresh = this.refresh();
      const basePath = this.basePath();

      return untracked(() => {
        const disable = enableVisualEditing({
          zIndex,
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

        return () => disable();
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
    switch (payload.source) {
      case 'manual':
        return payload.livePreviewEnabled
          ? this.manualFastRefresh()
          : this.manualFallbackRefresh();
      case 'mutation':
        return payload.livePreviewEnabled
          ? this.mutationFastRefresh()
          : this.mutationFallbackRefresh();
      default:
        // eslint-disable-next-line no-case-declarations
        const error = new Error('Unknown refresh source');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any).details = { cause: payload };
        throw error;
    }
  };

  private manualFastRefresh() {
    console.debug(
      'Live preview is setup, refreshing the view without refetching cached data',
    );
    // In Angular, we don't have a direct equivalent to router.refresh()
    // You might need to implement a custom solution here
    // TODO: check alternative
    return Promise.resolve();
  }

  private manualFallbackRefresh() {
    console.debug(
      'No loaders in live mode detected, or preview kit setup, revalidating root layout',
    );
    return Promise.resolve();
    // TODO: check alternative
    // return revalidateRootLayout();
  }

  private mutationFastRefresh(): false {
    console.debug(
      'Live preview is setup, mutation is skipped assuming its handled by the live preview',
    );
    return false;
  }

  private mutationFallbackRefresh() {
    console.debug(
      'No loaders in live mode detected, or preview kit setup, revalidating root layout',
    );
    return Promise.resolve();
    // TODO: check alternative
    // return revalidateRootLayout();
  }
}
