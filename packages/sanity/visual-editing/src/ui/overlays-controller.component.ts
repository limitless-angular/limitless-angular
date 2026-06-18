import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { createOverlayController } from '../controller';
import type {
  DragEndEvent,
  OverlayController,
  OverlayEventHandler,
  OverlayMsg,
  VisualEditingNode,
} from '../types';
import { DatasetMutatorService } from './dataset-mutator.service';
import { DocumentsService } from './documents.service';
import { TelemetryService } from './telemetry/telemetry.service';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-overlays-controller',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverlaysControllerComponent {
  comlink = input<VisualEditingNode>();
  inFrame = input.required<boolean>();
  inPopUp = input.required<boolean>();
  overlayEnabled = input.required<boolean>();
  rootElement = input<HTMLElement>();

  dragPosition = output<{ x: number; y: number }>();
  controllerMessage = output<OverlayMsg>();

  private datasetMutator = inject(DatasetMutatorService);
  private documents = inject(DocumentsService);
  private telemetry = inject(TelemetryService);

  private controller = signal<OverlayController | undefined>(undefined);

  constructor() {
    effect((onCleanup) => {
      const rootElement = this.rootElement();
      const inFrame = this.inFrame();
      const inPopUp = this.inPopUp();
      const optimisticActorReady = this.datasetMutator.optimisticActorReady();

      if (!rootElement) {
        return;
      }

      const controller = createOverlayController({
        handler: this.overlayEventHandler,
        inFrame,
        inPopUp,
        optimisticActorReady,
        overlayElement: rootElement,
      });
      this.controller.set(controller);

      onCleanup(() => {
        controller.destroy();
        this.controller.set(undefined);
      });
    });

    effect(() => {
      const controller = this.controller();
      if (this.overlayEnabled()) {
        controller?.activate();
      } else {
        controller?.deactivate();
      }
    });
  }

  private overlayEventHandler: OverlayEventHandler = (message) => {
    if (message.type === 'element/click') {
      this.comlink()?.post('visual-editing/focus', message.sanity);
      this.telemetry.send('Visual Editing Overlay Clicked');
    } else if (message.type === 'overlay/activate') {
      this.comlink()?.post('visual-editing/toggle', { enabled: true });
    } else if (message.type === 'overlay/deactivate') {
      this.comlink()?.post('visual-editing/toggle', { enabled: false });
    } else if (message.type === 'overlay/dragEnd') {
      const dragEndEvent: DragEndEvent = {
        dragGroup: message.dragGroup,
        flow: message.flow,
        insertPosition: message.insertPosition,
        preventInsertDefault: message.preventInsertDefault,
        target: message.target,
      };

      window.dispatchEvent(
        new CustomEvent('sanity/dragEnd', {
          cancelable: true,
          detail: dragEndEvent,
        }),
      );

      if (this.datasetMutator.actor()) {
        import('../util/drag-events')
          .then(({ handleDragEndEvent }) => {
            handleDragEndEvent(dragEndEvent, this.documents.getDocument);
          })
          .catch((error) => {
            console.warn(
              '[@limitless-angular/sanity] Failed to handle visual editing drag mutation.',
              error,
            );
          });
      }

      if (message.insertPosition) {
        this.telemetry.send('Visual Editing Drag Sequence Completed');
      }
    } else if (message.type === 'overlay/dragUpdateCursorPosition') {
      this.dragPosition.emit({ x: message.x, y: message.y });
      return;
    } else if (
      message.type === 'overlay/dragToggleMinimap' &&
      message.display === true
    ) {
      this.telemetry.send('Visual Editing Drag Minimap Enabled');
    } else if (message.type === 'overlay/setCursor') {
      if (message.cursor) {
        message.element.style.cursor = message.cursor;
      } else {
        message.element.style.removeProperty('cursor');
      }
    }

    this.controllerMessage.emit(message);
  };
}
