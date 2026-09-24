import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { LivePreviewService } from './live-preview.service';
import { LiveQueryProviderComponent } from './live-query-provider.component';

describe('LiveQueryProviderComponent', () => {
  it('initializes once and updates perspective when its input changes', async () => {
    const service = {
      isInitialized: false,
      initialize: vi.fn(function (this: typeof service) {
        this.isInitialized = true;
      }),
      setPerspective: vi.fn(),
    };
    const logger = { log: vi.fn() };

    TestBed.configureTestingModule({ imports: [LiveQueryProviderComponent] });
    TestBed.overrideComponent(LiveQueryProviderComponent, {
      set: { providers: [{ provide: LivePreviewService, useValue: service }] },
    });

    const fixture = TestBed.createComponent(LiveQueryProviderComponent);
    fixture.componentRef.setInput('token', 'test-token');
    fixture.componentRef.setInput('logger', logger);
    fixture.componentRef.setInput('perspective', 'drafts');
    await fixture.whenStable();

    expect(service.initialize).toHaveBeenCalledExactlyOnceWith('test-token');
    expect(service.setPerspective).toHaveBeenCalledExactlyOnceWith('drafts');
    expect(logger.log).toHaveBeenCalledOnce();

    fixture.componentRef.setInput('perspective', 'published');
    await fixture.whenStable();

    expect(service.initialize).toHaveBeenCalledTimes(1);
    expect(service.setPerspective).toHaveBeenLastCalledWith('published');
    fixture.destroy();
  });
});
