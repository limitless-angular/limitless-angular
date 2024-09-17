import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { format } from 'date-fns';

@Component({
  selector: 'date-component',
  standalone: true,
  imports: [],
  template: `
    <time [attr.dateTime]="dateString()">{{ formattedDate() }}</time>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateComponent {
  dateString = input.required<string>();

  formattedDate = computed(() =>
    format(new Date(this.dateString()), 'LLLL	d, yyyy'),
  );
}
