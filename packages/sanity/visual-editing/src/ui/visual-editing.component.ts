import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import type { ClientPerspective } from '@sanity/client';
import {
  isMaybePreviewIframe,
  isMaybePreviewWindow,
} from '@sanity/presentation-comlink';

import type { HistoryAdapter, VisualEditingOptions } from '../types';
import { HistoryComponent } from './history.component';
import { LoaderComlinkComponent } from './loader-comlink.component';
import { LoaderComlinkService } from './loader-comlink/loader-comlink.service';
import { MetaComponent } from './meta.component';
import { OverlaysComponent } from './overlays.component';
import { RefreshComponent } from './refresh.component';
import { ComlinkService } from './comlink.service';
import { DatasetMutatorService } from './dataset-mutator.service';
import { VisualEditingEnvironmentService } from './environment/environment.service';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-ui',
  standalone: true,
  imports: [
    HistoryComponent,
    LoaderComlinkComponent,
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
        [plugins]="plugins()"
        [handlesPerspectiveChange]="handlesPerspectiveChange()"
        [inFrame]="inFrame() === true"
        [inPopUp]="inPopUp() === true"
        [zIndex]="zIndex()"
        (perspectiveChange)="perspectiveChange.emit($event)"
      />
    }

    @if (comlink.node(); as node) {
      <sanity-visual-editing-history [comlink]="node" [history]="history()" />
      <sanity-visual-editing-meta [comlink]="node" />
      @if (refresh(); as refresh) {
        <sanity-visual-editing-refresh [comlink]="node" [refresh]="refresh" />
      }
    }

    @if (
      comlink.status() === 'connected' && loaderComlink.hasQueryListeners()
    ) {
      @defer (on immediate) {
        <sanity-visual-editing-loader-comlink />
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
  plugins = input<VisualEditingOptions['plugins']>();
  history = input<HistoryAdapter>();
  refresh = input<VisualEditingOptions['refresh']>();
  handlesPerspectiveChange = input(false);
  zIndex = input<VisualEditingOptions['zIndex']>();
  perspectiveChange = output<ClientPerspective>();

  protected comlink = inject(ComlinkService);
  protected loaderComlink = inject(LoaderComlinkService);
  private datasetMutator = inject(DatasetMutatorService);
  private environment = inject(VisualEditingEnvironmentService);

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

    effect((onCleanup) => {
      const comlinkStatus = this.comlink.status();
      const inFrame = this.inFrame();
      const inPopUp = this.inPopUp();

      if (comlinkStatus === 'connected') {
        untracked(() =>
          this.environment.setEnvironment(
            inPopUp ? 'presentation-window' : 'presentation-iframe',
          ),
        );
        onCleanup(() => untracked(() => this.environment.setEnvironment(null)));
        return;
      }

      if (inFrame || inPopUp) {
        const timeout = setTimeout(() => {
          this.environment.setEnvironment('standalone');
        }, 1000);

        onCleanup(() => {
          clearTimeout(timeout);
          untracked(() => this.environment.setEnvironment(null));
        });
        return;
      }

      if (inFrame === false && inPopUp === false) {
        untracked(() => this.environment.setEnvironment('standalone'));
        onCleanup(() => untracked(() => this.environment.setEnvironment(null)));
      }
    });
  }
}
