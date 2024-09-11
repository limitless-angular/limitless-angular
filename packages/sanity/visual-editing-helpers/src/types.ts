import type {
  ClientPerspective,
  ContentSourceMapDocuments,
} from '@sanity/client';
import type {
  HistoryRefresh,
  HistoryUpdate,
  SanityNode,
  SanityStegaNode,
} from '@sanity/visual-editing';

export type { Path } from '@sanity/client/csm';

/**
 * @internal
 * client.fetch(query, params) => `${query}-${JSON.stringify(params)}`
 */
export type QueryCacheKey = `${string}-${string}`;

/**
 * Messages emitted by the presentation package
 * @public
 */
export type PresentationMsg =
  | {
      type: 'presentation/focus';
      data: { id: string; path: string };
    }
  | {
      type: 'presentation/blur';
      data: undefined;
    }
  | {
      type: 'presentation/navigate';
      data: HistoryUpdate;
    }
  | {
      type: 'presentation/toggleOverlay';
      data: undefined;
    }
  | {
      type: 'presentation/refresh';
      data: HistoryRefresh;
    }
  | {
      type: 'presentation/perspective';
      data: {
        perspective: ClientPerspective;
      };
    };

/**@public */
export interface VisualEditingPayloads {
  documents: {
    projectId?: string;
    dataset?: string;
    perspective: ClientPerspective;
    documents: ContentSourceMapDocuments;
  };
  focus: SanityNode | SanityStegaNode;
  meta: {
    title: string;
  };
  navigate: HistoryUpdate;
  toggle: {
    enabled: boolean;
  };
  refresh: HistoryRefresh;
}

/**
 * Messages emitted by the overlays package
 * @deprecated use VisualEditingMsg instead
 */
export type OverlayMsg =
  | {
      type: 'overlay/focus';
      data: VisualEditingPayloads['focus'];
    }
  | {
      type: 'overlay/navigate';
      data: VisualEditingPayloads['navigate'];
    }
  | {
      type: 'overlay/toggle';
      data: VisualEditingPayloads['toggle'];
    };

/**
 * Messages emitted by the visual-editing package
 * @public
 */
export type VisualEditingMsg =
  | {
      type: 'visual-editing/focus';
      data: VisualEditingPayloads['focus'];
    }
  | {
      type: 'visual-editing/navigate';
      data: VisualEditingPayloads['navigate'];
    }
  | {
      type: 'visual-editing/toggle';
      data: VisualEditingPayloads['toggle'];
    }
  | {
      type: 'visual-editing/meta';
      data: VisualEditingPayloads['meta'];
    }
  | {
      type: 'visual-editing/documents';
      data: VisualEditingPayloads['documents'];
    }
  | {
      type: 'visual-editing/refreshing';
      data: VisualEditingPayloads['refresh'];
    }
  | {
      type: 'visual-editing/refreshed';
      data: VisualEditingPayloads['refresh'];
    };

/**
 * Messages emitted by the preview-kit-compat package
 * @public
 */
export type PreviewKitMsg = {
  /**
   * Sends over the CSM reported documents in use on the page. If there are multiple queries and thus
   * multiple CSM's, they're all deduped and concatenated into a single list.
   */
  type: 'preview-kit/documents';
  data: {
    projectId: string;
    dataset: string;
    perspective: ClientPerspective;
    documents: ContentSourceMapDocuments;
  };
};

/**
 * Known Channel connection IDs
 * @public
 */
export type VisualEditingConnectionIds =
  | 'presentation'
  | 'loaders'
  | 'overlays'
  | 'preview-kit';
