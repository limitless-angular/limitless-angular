import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  Type,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

/**
 * A common component for rendering different node types in Portable Text
 * This component serves as a base for rendering various node types with a consistent pattern
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'pt-node-renderer',
  imports: [NgComponentOutlet],
  template: `<ng-template
    let-componentType="componentType"
    let-inputProps="inputProps"
    ><ng-container *ngComponentOutlet="componentType; inputs: inputProps"
  /></ng-template>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class NodeRendererComponent {
  /**
   * Template reference for the renderer
   */
  template = viewChild.required<
    TemplateRef<{
      componentType: Type<unknown>;
      inputProps: Record<string, unknown>;
    }>
  >(TemplateRef);
}
