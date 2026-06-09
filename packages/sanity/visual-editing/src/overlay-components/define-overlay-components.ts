import type {
  AngularOverlayComponent,
  AngularOverlayComponentResolver,
} from '../types';

export function defineOverlayComponents<T extends AngularOverlayComponent>(
  resolver: AngularOverlayComponentResolver<T>,
): typeof resolver {
  return resolver;
}
