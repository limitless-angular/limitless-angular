import {
  inputBinding,
  reflectComponentType,
  type EnvironmentInjector,
  type Injector,
  type Type,
  type ViewContainerRef,
} from '@angular/core';

export function renderOverlayComponent(
  container: ViewContainerRef,
  component: Type<unknown>,
  environmentInjector: EnvironmentInjector,
  injector: Injector,
  values: Record<string, unknown>,
): void {
  const inputs = new Set(
    reflectComponentType(component)?.inputs.map((input) => input.templateName),
  );
  const entries = Object.entries(values);
  const componentRef = container.createComponent(component, {
    environmentInjector,
    injector,
    bindings: entries
      .filter(([name]) => inputs.has(name))
      .map(([name, value]) => inputBinding(name, () => value)),
  });

  for (const [name, value] of entries) {
    if (!inputs.has(name)) {
      Reflect.set(componentRef.instance as object, name, value);
    }
  }
}
