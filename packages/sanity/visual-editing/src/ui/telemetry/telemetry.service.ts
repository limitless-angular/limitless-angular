import { Injectable, signal } from '@angular/core';

import type { VisualEditingNode } from '../../types';

export const telemetryEvents = {
  'Visual Editing Overlay Clicked': {
    name: 'Visual Editing Overlay Clicked',
    description: 'An Overlay is clicked.',
    version: 1,
  },
  'Visual Editing Drag Sequence Completed': {
    name: 'Visual Editing Drag Sequence Completed',
    description: 'An array is successfully reordered using drag and drop.',
    version: 1,
  },
  'Visual Editing Drag Minimap Enabled': {
    name: 'Visual Editing Drag Minimap Enabled',
    description: 'The zoomed-out minimap view is enabled during a drag sequence.',
    version: 1,
  },
  'Visual Editing Context Menu Item Removed': {
    name: 'Visual Editing Context Menu Item Removed',
    description: 'An item is removed using the Context Menu.',
    version: 1,
  },
  'Visual Editing Context Menu Item Duplicated': {
    name: 'Visual Editing Context Menu Item Duplicated',
    description: 'An item is duplicated using the Context Menu.',
    version: 1,
  },
  'Visual Editing Context Menu Item Moved': {
    name: 'Visual Editing Context Menu Item Moved',
    description: 'An item is moved using the Context Menu.',
    version: 1,
  },
  'Visual Editing Context Menu Item Inserted': {
    name: 'Visual Editing Context Menu Item Inserted',
    description: 'An item is inserted using the Context Menu.',
    version: 1,
  },
  'Visual Editing Insert Menu Item Inserted': {
    name: 'Visual Editing Insert Menu Item Inserted',
    description: 'An item is inserted using the Insert Menu.',
    version: 1,
  },
};

export type TelemetryEventName = keyof typeof telemetryEvents;

@Injectable()
export class TelemetryService {
  readonly comlink = signal<VisualEditingNode | undefined>(undefined);

  send(name: TelemetryEventName): void {
    this.comlink()?.post('visual-editing/telemetry-log', {
      event: telemetryEvents[name],
      data: null,
    });
  }
}
