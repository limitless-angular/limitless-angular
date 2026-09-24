import { Component, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import type { HistoryAdapterNavigate } from './types';
import { VisualEditingClientComponent } from './visual-editing-client.component';

@Component({ template: '' })
class EmptyRouteComponent {}

describe('VisualEditingClientComponent', () => {
  it('sends the new URL to visual editing after each navigation', async () => {
    TestBed.configureTestingModule({
      imports: [VisualEditingClientComponent],
      providers: [
        provideRouter([
          { path: 'first', component: EmptyRouteComponent },
          { path: 'second', component: EmptyRouteComponent },
        ]),
      ],
    });

    const fixture = TestBed.createComponent(VisualEditingClientComponent);
    const navigate = vi.fn<HistoryAdapterNavigate>();
    const component = fixture.componentInstance as unknown as {
      navigate: WritableSignal<HistoryAdapterNavigate | undefined>;
    };
    component.navigate.set(navigate);
    TestBed.tick();

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/first?preview=true#section');
    TestBed.tick();
    expect(navigate).toHaveBeenLastCalledWith({
      type: 'push',
      url: '/first?preview=true#section',
    });

    await router.navigateByUrl('/second');
    TestBed.tick();
    expect(navigate).toHaveBeenLastCalledWith({
      type: 'push',
      url: '/second',
    });

    fixture.destroy();
  });
});
