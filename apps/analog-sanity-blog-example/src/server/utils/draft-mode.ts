import { H3Event, deleteCookie, getCookie, setCookie } from 'h3';

const PRERENDER_BYPASS_COOKIE_NAME = '__prerender_bypass';
const COOKIE_MAX_AGE = 60 * 60; // 1 hour

const BYPASS_TOKEN = import.meta.env.BYPASS_TOKEN;

if (!BYPASS_TOKEN) {
  console.warn('BYPASS_TOKEN is not set. Draft Mode will not work correctly.');
}

export function setDraftMode(event: H3Event, enable = true): void {
  if (enable && BYPASS_TOKEN) {
    setCookie(event, PRERENDER_BYPASS_COOKIE_NAME, BYPASS_TOKEN, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  } else {
    deleteCookie(event, PRERENDER_BYPASS_COOKIE_NAME);
  }
}

export function isDraftMode(event: H3Event): boolean {
  const prerenderBypassCookie = getCookie(event, PRERENDER_BYPASS_COOKIE_NAME);
  return !!prerenderBypassCookie && prerenderBypassCookie === BYPASS_TOKEN;
}
