import { resolveAuthSessionId } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';

interface AuthSessionData {
  sessionId: string;
}

export const load = async function load({ cookies }) {
  const sessionId = resolveAuthSessionId(cookies);

  return { sessionId };
} satisfies LayoutServerLoad<AuthSessionData>;
