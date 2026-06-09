import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-pointer-events',
  standalone: true,
  template: '<ng-content />',
  host: {
    'data-sanity-overlay-element': '',
    style: 'display: block; pointer-events: all;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualEditingPointerEventsComponent {}
