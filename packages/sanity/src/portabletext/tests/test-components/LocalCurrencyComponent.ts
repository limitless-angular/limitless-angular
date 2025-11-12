import { Component, computed } from '@angular/core';
import { PortableTextTypeComponent } from '../../directives/portable-text-directives';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'span',
  template: '~{{ round(value().sourceAmount * rate()) }} NOK',
  host: { '[class.currency]': 'true' },
})
export class LocalCurrencyComponent extends PortableTextTypeComponent {
  // in the real world we'd look up the users local currency,
  // do some rate calculations and render the result. Obviously.
  readonly rates: Record<string, number> = { USD: 8.82, DKK: 1.35, EUR: 10.04 };
  rate = computed(() => this.rates[this.value().sourceCurrency] || 1);
  round = Math.round;
}
