import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
} from '@angular/core';
import { createNode, createNodeMachine } from '@sanity/comlink';
import {
  createCompatibilityActors,
  type LoaderControllerMsg,
  type LoaderNodeMsg,
} from '@sanity/presentation-comlink';

import { LoaderComlinkService } from './loader-comlink/loader-comlink.service';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-loader-comlink',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoaderComlinkComponent {
  private loaderComlink = inject(LoaderComlinkService);

  constructor() {
    effect((onCleanup) => {
      const node = createNode<LoaderNodeMsg, LoaderControllerMsg>(
        {
          name: 'loaders',
          connectTo: 'presentation',
        },
        createNodeMachine<LoaderNodeMsg, LoaderControllerMsg>().provide({
          actors: createCompatibilityActors<LoaderNodeMsg>(),
        }),
      );

      const unsubscribePerspective = node.on('loader/perspective', (data) => {
        this.loaderComlink.setClientConfig(data.projectId, data.dataset);
        this.loaderComlink.setPerspective(data.perspective);
      });
      const stop = node.start();

      this.loaderComlink.setComlink(node);

      onCleanup(() => {
        unsubscribePerspective();
        stop();
        this.loaderComlink.setComlink(null);
        this.loaderComlink.setClientConfig(null, null);
        this.loaderComlink.setPerspective(null);
      });
    });
  }
}
