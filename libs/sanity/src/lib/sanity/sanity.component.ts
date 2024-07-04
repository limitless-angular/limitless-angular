import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'lib-sanity',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sanity.component.html',
  styleUrl: './sanity.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SanityComponent {}
