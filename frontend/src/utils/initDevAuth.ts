import { supabase } from "./supabase";

const DEV_EMAIL = "issacroy05@gmail.com";

/**
 * Auto-sign in with dev credentials when running locally.
 * Add VITE_DEV_PASSWORD to your .env (or .env.local) to enable.
 */
export async function initDevAuth(): Promise<void> {
  if (!import.meta.env.DEV) return;

  const password = import.meta.env.VITE_DEV_PASSWORD;
  if (!password) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (session) return;

  await supabase.auth.signInWithPassword({ email: DEV_EMAIL, password });
}
