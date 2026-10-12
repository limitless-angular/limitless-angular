import {
  createComponent,
  inputBinding,
  outputBinding,
  signal,
  type ComponentRef,
  type ViewRef,
} from '@angular/core';
import type { ClientPerspective } from '@sanity/client';

import type { VisualEditingOptions } from '../types';
import { VisualEditingUiComponent } from './visual-editing.component';

let node: HTMLElement | null = null;
let componentRef: ComponentRef<VisualEditingUiComponent> | null = null;
let cleanup: ReturnType<typeof setTimeout> | null = null;
const currentOptions = signal<VisualEditingOptions | null>(null);

export function renderVisualEditing(
  abortSignal: AbortSignal,
  options: VisualEditingOptions,
): void {
  const { applicationRef, environmentInjector, injector } = options;

  if (!applicationRef || !environmentInjector) {
    console.warn(
      '[@limitless-angular/sanity] enableVisualEditing requires Angular applicationRef and environmentInjector options. Prefer using <visual-editing /> from an Angular component tree.',
    );
    return;
  }

  currentOptions.set(options);

  if (cleanup) {
    clearTimeout(cleanup);
    cleanup = null;
  }

  abortSignal.addEventListener('abort', () => {
    cleanup = setTimeout(() => {
      if (componentRef) {
        applicationRef.detachView(componentRef.hostView as ViewRef);
        componentRef.destroy();
        componentRef = null;
      }
      currentOptions.set(null);
      if (node?.parentNode) {
        node.parentNode.removeChild(node);
        node = null;
      }
    }, 1000);
  });

  if (!node) {
    node = document.createElement('sanity-visual-editing');
    document.body.parentNode?.insertBefore(node, document.body.nextSibling);
  }

  if (!componentRef) {
    componentRef = createComponent(VisualEditingUiComponent, {
      environmentInjector,
      hostElement: node,
      elementInjector: injector,
      bindings: [
        inputBinding('components', () => currentOptions()?.components),
        inputBinding('handlesPerspectiveChange', () =>
          Boolean(currentOptions()?.onPerspectiveChange),
        ),
        inputBinding('history', () => currentOptions()?.history),
        inputBinding('plugins', () => currentOptions()?.plugins),
        inputBinding('refresh', () => currentOptions()?.refresh),
        inputBinding('zIndex', () => currentOptions()?.zIndex),
        outputBinding<ClientPerspective>('perspectiveChange', (perspective) =>
          currentOptions()?.onPerspectiveChange?.(perspective),
        ),
      ],
    });
    applicationRef.attachView(componentRef.hostView);
  }

  componentRef.changeDetectorRef.detectChanges();
}
