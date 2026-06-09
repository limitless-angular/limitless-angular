import {
  createComponent,
  type ComponentRef,
  type ViewRef,
} from '@angular/core';

import type { VisualEditingRuntimeOptions } from '../types';
import { VisualEditingUiComponent } from './visual-editing.component';

let node: HTMLElement | null = null;
let componentRef: ComponentRef<VisualEditingUiComponent> | null = null;
let cleanup: ReturnType<typeof setTimeout> | null = null;

function setInputs(
  ref: ComponentRef<VisualEditingUiComponent>,
  {
    components,
    history,
    plugins,
    refresh,
    zIndex,
  }: VisualEditingRuntimeOptions,
): void {
  ref.setInput('components', components);
  ref.setInput('history', history);
  ref.setInput('plugins', plugins);
  ref.setInput('refresh', refresh);
  ref.setInput('zIndex', zIndex);
  ref.changeDetectorRef.detectChanges();
}

export function renderVisualEditing(
  signal: AbortSignal,
  options: VisualEditingRuntimeOptions,
): void {
  const { applicationRef, environmentInjector, injector } = options;

  if (!applicationRef || !environmentInjector) {
    console.warn(
      '[@limitless-angular/sanity] enableVisualEditing requires Angular applicationRef and environmentInjector options. Prefer using <visual-editing /> from an Angular component tree.',
    );
    return;
  }

  if (cleanup) {
    clearTimeout(cleanup);
    cleanup = null;
  }

  signal.addEventListener('abort', () => {
    cleanup = setTimeout(() => {
      if (componentRef) {
        applicationRef.detachView(componentRef.hostView as ViewRef);
        componentRef.destroy();
        componentRef = null;
      }
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
    });
    applicationRef.attachView(componentRef.hostView);
  }

  setInputs(componentRef, options);
}
