import { Injectable, signal } from '@angular/core';

import type { VisualEditingNode } from '../../types';

type TelemetryEvent = {
  type: 'log';
  name: string;
  version: number;
  description: string;
  maxSampleRate: number | undefined;
  schema: undefined;
};

function defineTelemetryEvent(options: {
  name: string;
  description: string;
  version: number;
  maxSampleRate?: number;
}): TelemetryEvent {
  return {
    type: 'log',
    name: options.name,
    version: options.version,
    description: options.description,
    maxSampleRate: options.maxSampleRate,
    schema: undefined,
  };
}

export const telemetryEvents = {
  'Visual Editing Drag Sequence Completed': defineTelemetryEvent({
    name: 'Visual Editing Drag Sequence Completed',
    description: 'An array is successfully reordered using drag and drop.',
    version: 1,
  }),
  'Visual Editing Drag Minimap Enabled': defineTelemetryEvent({
    name: 'Visual Editing Drag Minimap Enabled',
    description:
      'The zoomed-out minimap view is enabled during a drag sequence.',
    version: 1,
  }),
  'Visual Editing Context Menu Item Removed': defineTelemetryEvent({
    name: 'Visual Editing Context Menu Item Removed',
    description: 'An item is removed using the Context Menu.',
    version: 1,
  }),
  'Visual Editing Context Menu Item Duplicated': defineTelemetryEvent({
    name: 'Visual Editing Context Menu Item Duplicated',
    description: 'An item is duplicated using the Context Menu.',
    version: 1,
  }),
  'Visual Editing Context Menu Item Moved': defineTelemetryEvent({
    name: 'Visual Editing Context Menu Item Moved',
    description: 'An item is moved using the Context Menu.',
    version: 1,
  }),
  'Visual Editing Context Menu Item Inserted': defineTelemetryEvent({
    name: 'Visual Editing Context Menu Item Inserted',
    description: 'An item is inserted using the Context Menu.',
    version: 1,
  }),
  'Visual Editing Insert Menu Item Inserted': defineTelemetryEvent({
    name: 'Visual Editing Insert Menu Item Inserted',
    description: 'An item is inserted using the Insert Menu.',
    version: 1,
  }),
  'Visual Editing Overlay Clicked': defineTelemetryEvent({
    name: 'Visual Editing Overlay Clicked',
    description: 'An Overlay is clicked.',
    version: 1,
  }),
};

export type TelemetryEventName = keyof typeof telemetryEvents;

@Injectable()
export class TelemetryService {
  readonly comlink = signal<VisualEditingNode | undefined>(undefined);

  send(name: TelemetryEventName, data: unknown = null): void {
    const event = telemetryEvents[name];

    if (!event) {
      throw new Error(`Telemetry event: ${name} does not exist`);
    }

    this.comlink()?.post('visual-editing/telemetry-log', {
      event,
      data,
    });
  }
}
