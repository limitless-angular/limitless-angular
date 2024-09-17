import { defineEventHandler, sendRedirect } from 'h3';
import { setDraftMode } from '../../utils/draft-mode';

export default defineEventHandler(async (event) => {
  // Exit the current user from "Draft Mode".
  setDraftMode(event, false);
  return sendRedirect(event, '/', 307);
});
