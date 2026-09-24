import {
  ApplicationRef,
  EnvironmentInjector,
  getDebugNode,
  Injector,
  type DebugElement,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { renderVisualEditing } from './render-visual-editing';
import { VisualEditingUiComponent } from './visual-editing.component';

describe('renderVisualEditing', () => {
  it('updates a reused component and its perspective listener', async () => {
    TestBed.overrideComponent(VisualEditingUiComponent, {
      set: { template: '' },
    });
    await TestBed.compileComponents();
    const applicationRef = TestBed.inject(ApplicationRef);
    const environmentInjector = TestBed.inject(EnvironmentInjector);
    const injector = TestBed.inject(Injector);
    const firstController = new AbortController();
    const secondController = new AbortController();
    const thirdController = new AbortController();
    const firstListener = vi.fn();
    const secondListener = vi.fn();

    try {
      renderVisualEditing(firstController.signal, {
        applicationRef,
        environmentInjector,
        injector,
        onPerspectiveChange: firstListener,
        zIndex: 10,
      });
      TestBed.tick();

      const host = document.querySelector('sanity-visual-editing');
      if (!host) {
        throw new Error('Visual editing host was not created');
      }
      const component = (getDebugNode(host) as DebugElement)
        .componentInstance as VisualEditingUiComponent;
      expect(component.zIndex()).toBe(10);
      component.perspectiveChange.emit('published');
      expect(firstListener).toHaveBeenCalledWith('published');
      firstListener.mockClear();

      firstController.abort();
      renderVisualEditing(secondController.signal, {
        applicationRef,
        environmentInjector,
        injector,
        onPerspectiveChange: secondListener,
        zIndex: 20,
      });
      TestBed.tick();

      expect(document.querySelector('sanity-visual-editing')).toBe(host);
      expect(component.zIndex()).toBe(20);
      component.perspectiveChange.emit('drafts');
      expect(firstListener).not.toHaveBeenCalled();
      expect(secondListener).toHaveBeenCalledWith('drafts');

      renderVisualEditing(thirdController.signal, {
        applicationRef,
        environmentInjector,
        injector,
        zIndex: 30,
      });
      TestBed.tick();

      expect(component.zIndex()).toBe(30);
      expect(component.handlesPerspectiveChange()).toBe(false);
      secondListener.mockClear();
      component.perspectiveChange.emit('published');
      expect(secondListener).not.toHaveBeenCalled();
    } finally {
      vi.useFakeTimers();
      firstController.abort();
      secondController.abort();
      thirdController.abort();
      vi.advanceTimersByTime(1000);
      vi.useRealTimers();
    }
  });
});
