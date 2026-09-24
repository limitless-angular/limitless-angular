import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ElementOverlayComponent } from './element-overlay.component';
import { PreviewSnapshotsService } from './preview/preview-snapshots.service';
import { SchemaService } from './schema/schema.service';

const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalScrollIntoView) {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
  }
});

describe('ElementOverlayComponent', () => {
  it('observes and scrolls after rendering, then closes its menu when hover ends', async () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = observe;
        disconnect = disconnect;
      },
    );

    TestBed.configureTestingModule({
      imports: [ElementOverlayComponent],
      providers: [
        {
          provide: PreviewSnapshotsService,
          useValue: { snapshots: signal([]) },
        },
        { provide: SchemaService, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(ElementOverlayComponent);
    const inputs = {
      id: 'overlay-1',
      draggable: false,
      element: document.createElement('div'),
      elementType: 'group',
      inFrame: false,
      enableScrollIntoView: true,
      focused: false,
      hovered: false,
      isDragging: false,
      node: { href: 'https://example.com' },
      rect: { x: 0, y: 0, w: 50, h: 30 },
      showActions: false,
      targets: [],
      wasMaybeCollapsed: false,
    };
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();

    fixture.componentRef.setInput('hovered', true);
    fixture.componentRef.setInput('focused', true);
    await fixture.whenStable();

    expect(observe).toHaveBeenCalledOnce();
    expect(scrollIntoView).toHaveBeenCalledOnce();

    const menuOpen = (
      fixture.componentInstance as unknown as {
        menuOpen: WritableSignal<boolean>;
      }
    ).menuOpen;
    menuOpen.set(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.root').dataset.menuOpen).toBe(
      '',
    );

    fixture.componentRef.setInput('hovered', false);
    await fixture.whenStable();

    expect(disconnect).toHaveBeenCalledOnce();
    expect(menuOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('.root').dataset.menuOpen).toBe(
      undefined,
    );
    fixture.destroy();
  });
});
