import type {
  AngularOverlayComponent,
  AngularOverlayComponentDefinition,
} from '../types';

export function defineOverlayComponent<T extends AngularOverlayComponent>(
  component: T,
  inputs?: Record<string, unknown>,
): AngularOverlayComponentDefinition<T> {
  return {
    component,
    inputs,
  };
}
