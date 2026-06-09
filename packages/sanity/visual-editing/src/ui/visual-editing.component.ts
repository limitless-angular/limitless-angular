import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import {
  isMaybePreviewIframe,
  isMaybePreviewWindow,
} from '@sanity/presentation-comlink';

import type { HistoryAdapter, VisualEditingOptions } from '../types';
import { HistoryComponent } from './history.component';
import { MetaComponent } from './meta.component';
import { OverlaysComponent } from './overlays.component';
import { RefreshComponent } from './refresh.component';
import { ComlinkService } from './comlink.service';
import { DatasetMutatorService } from './dataset-mutator.service';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-ui',
  standalone: true,
  imports: [
    HistoryComponent,
    MetaComponent,
    OverlaysComponent,
    RefreshComponent,
  ],
  providers: [ComlinkService, DatasetMutatorService],
  template: `
    @if (ready()) {
      <sanity-visual-editing-overlays
        [comlink]="comlink.node()"
        [comlinkStatus]="comlink.status()"
        [components]="components()"
        [inFrame]="inFrame() === true"
        [inPopUp]="inPopUp() === true"
        [zIndex]="zIndex()"
      />
    }

    @if (comlink.node(); as node) {
      <sanity-visual-editing-history [comlink]="node" [history]="history()" />
      <sanity-visual-editing-meta [comlink]="node" />
      @if (refresh(); as refresh) {
        <sanity-visual-editing-refresh [comlink]="node" [refresh]="refresh" />
      }
    }
  `,
  styles: `
    :host {
      background-color: transparent;
      direction: ltr;
      inset: 0;
      pointer-events: none;
      position: absolute;
      width: 100%;
    }
  `,
  host: {
    '[style.z-index]': 'zIndex() ?? "9999999"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualEditingUiComponent {
  components = input<VisualEditingOptions['components']>();
  history = input<HistoryAdapter>();
  refresh = input<VisualEditingOptions['refresh']>();
  zIndex = input<VisualEditingOptions['zIndex']>();

  protected comlink = inject(ComlinkService);
  private datasetMutator = inject(DatasetMutatorService);

  protected inFrame = signal<boolean | null>(null);
  protected inPopUp = signal<boolean | null>(null);

  protected ready = computed(
    () => this.inFrame() !== null && this.inPopUp() !== null,
  );

  constructor() {
    this.inFrame.set(isMaybePreviewIframe());
    this.inPopUp.set(isMaybePreviewWindow());

    effect((onCleanup) => {
      const enabled = this.inFrame() === true || this.inPopUp() === true;
      untracked(() => this.comlink.start(enabled));

      onCleanup(() => untracked(() => this.comlink.stop()));
    });

    effect((onCleanup) => {
      const comlink =
        this.comlink.status() === 'connected' ? this.comlink.node() : undefined;

      untracked(() => this.datasetMutator.connect(comlink));
      onCleanup(() => untracked(() => this.datasetMutator.disconnect()));
    });
  }
}
