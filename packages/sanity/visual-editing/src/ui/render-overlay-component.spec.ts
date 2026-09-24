import {
  Component,
  EnvironmentInjector,
  Injector,
  ViewContainerRef,
  input,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { renderOverlayComponent } from './render-overlay-component';

@Component({ template: '<ng-container #container />' })
class TestHostComponent {
  container = viewChild.required('container', { read: ViewContainerRef });
}

@Component({ template: '<p>{{ title() }} {{ legacy }}</p>' })
class TestConsumerComponent {
  // Exercise Angular's public input name when it differs from the class property.
  // eslint-disable-next-line @angular-eslint/no-input-rename
  title = input.required<string>({ alias: 'heading' });
  legacy = '';
}

describe('renderOverlayComponent', () => {
  it('binds public input names and preserves ordinary component properties', async () => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent, TestConsumerComponent],
    });
    const fixture = TestBed.createComponent(TestHostComponent);
    await fixture.whenStable();

    renderOverlayComponent(
      fixture.componentInstance.container(),
      TestConsumerComponent,
      TestBed.inject(EnvironmentInjector),
      TestBed.inject(Injector),
      { heading: 'Input value', legacy: 'Property value' },
    );
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain(
      'Input value Property value',
    );
    fixture.destroy();
  });
});
