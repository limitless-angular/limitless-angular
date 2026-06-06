import { PageServerLoad } from '@analogjs/router';

import { dataset, projectId, studioUrl } from '../../sanity/lib/api';
import { getClient } from '../../sanity/lib/client';
import { readToken } from '../../sanity/lib/token';

export type PresentationSmokeDocument = {
  _id: string;
  _type: 'post';
  title: string;
};

export type PresentationSmokeLoadResult = {
  mode: 'fake-client' | 'real-client';
  dataset: string;
  document: PresentationSmokeDocument;
  projectId: string;
  studioUrl: string;
  token: string;
};

const presentationSmokeDocumentId = 'presentation-smoke-post';
const presentationSmokeQuery = /* groq */ `
  *[_id == $id][0] {
    _id,
    _type,
    "title": coalesce(title, "Untitled")
  }
`;

export const load = async (
  loadContext: PageServerLoad,
): Promise<PresentationSmokeLoadResult> => {
  void loadContext;

  if (process.env['SANITY_PRESENTATION_E2E_REAL_CLIENT'] !== '1') {
    return {
      mode: 'fake-client',
      dataset,
      document: {
        _id: presentationSmokeDocumentId,
        _type: 'post',
        title: 'Live presentation smoke title',
      },
      projectId,
      studioUrl,
      token: 'presentation-smoke-token',
    };
  }

  const client = getClient({ token: readToken });
  const document = await client.fetch<PresentationSmokeDocument | null>(
    presentationSmokeQuery,
    { id: presentationSmokeDocumentId },
  );

  if (!document?._id) {
    throw new Error(
      'Real Presentation smoke needs a Sanity post document with _id "presentation-smoke-post". Run `node apps/sanity-presentation-e2e/scripts/sanity-seed-post.mjs`.',
    );
  }

  return {
    mode: 'real-client',
    dataset,
    document,
    projectId,
    studioUrl,
    token: readToken,
  };
};
