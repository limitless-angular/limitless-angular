import type {
  ClientPerspective,
  ContentSourceMapDocuments,
} from '@sanity/client';
import type { HistoryRefresh, HistoryUpdate } from '@sanity/visual-editing';

export type { Path } from '@sanity/client/csm';

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
