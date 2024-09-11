// eslint-disable-next-line @nx/enforce-module-boundaries
import { type ChannelsNode, createChannelsNode } from '@repo/channels';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { type VisualEditingConnectionIds } from '@repo/visual-editing-helpers';

import type {
  VisualEditingChannelReceives as Receives,
  VisualEditingChannelSends as Sends,
} from '../types';

export function injectChannel(): ChannelsNode<Sends, Receives> {
  return createChannelsNode<VisualEditingConnectionIds, Sends, Receives>({
    id: 'overlays',
    connectTo: 'presentation',
  });
}
