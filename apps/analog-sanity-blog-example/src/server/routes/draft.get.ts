import { createError, defineEventHandler, getQuery, sendRedirect } from 'h3';
import { validatePreviewUrl } from '@sanity/preview-url-secret';
import { client } from '../../sanity/lib/client';
import { readToken } from '../../sanity/lib/token';
import { setDraftMode } from '../utils/draft-mode';

const clientWithToken = client.withConfig({ token: readToken });
const enablePresentationSmokeBypass =
  import.meta.env.SANITY_PRESENTATION_E2E_BYPASS_DRAFT === '1';

export default defineEventHandler(async (event) => {
  const { url } = event.node.req;
  if (!url) {
    throw createError({ statusCode: 400, statusMessage: 'Missing url' });
  }

  if (enablePresentationSmokeBypass) {
    const { redirect } = getQuery(event);
    const redirectTo =
      typeof redirect === 'string' && redirect.startsWith('/')
        ? redirect
        : '/presentation-smoke';

    setDraftMode(event);
    return sendRedirect(event, redirectTo, 307);
  }

  const { isValid, redirectTo = '/' } = await validatePreviewUrl(
    clientWithToken,
    url,
  );
  if (!isValid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid secret' });
  }

  // Enable Draft Mode by setting the cookies
  setDraftMode(event);
  return sendRedirect(event, redirectTo, 307);
});
