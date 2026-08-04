/** Which integrations are wired up. Used to fail soft instead of crashing. */

export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const serviceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export const sslcommerzConfigured = Boolean(
  process.env.SSLCZ_STORE_ID && process.env.SSLCZ_STORE_PASSWORD,
);
