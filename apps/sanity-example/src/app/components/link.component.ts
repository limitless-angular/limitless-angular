import { ChangeDetectionStrategy, Component, computed } from '@angular/core';

import { PortableTextMarkComponent } from '@limitless-angular/sanity/portabletext';

interface LinkMark {
  _type: 'link';
  href: string;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'a',
  standalone: true,
  template: `<ng-container #children />`,
  host: {
    '[href]': 'value()?.href',
    '[target]': 'target()',
    '[rel]': 'rel()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkComponent extends PortableTextMarkComponent<LinkMark> {
  target = computed(() =>
    (this.value()?.href ?? '').startsWith('http') ? '_blank' : undefined,
  );

  rel = computed(() =>
    this.target() === '_blank' ? 'noindex nofollow' : undefined,
  );
}
