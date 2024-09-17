export const readToken = import.meta.env.SANITY_API_READ_TOKEN;

if (!readToken) {
  throw new Error('Missing SANITY_API_READ_TOKEN');
}
