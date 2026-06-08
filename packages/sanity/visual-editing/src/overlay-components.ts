import type {
  AngularOverlayComponent,
  AngularOverlayComponentDefinition,
  AngularOverlayComponentResolver,
} from './types';

export function defineOverlayComponent<T extends AngularOverlayComponent>(
  component: T,
  inputs?: Record<string, unknown>,
): AngularOverlayComponentDefinition<T> {
  return {
    component,
    inputs,
  };
}

export function defineOverlayComponents<T extends AngularOverlayComponent>(
  resolver: AngularOverlayComponentResolver<T>,
): typeof resolver {
  return resolver;
}
