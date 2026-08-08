/**
 * Staff sign in with a short username; Supabase authenticates by email, so a
 * name without "@" is resolved against the centre's domain. Kept out of the
 * server-action file because those may only export async functions, and out
 * of any server-only module because the login form needs it in the browser.
 */
export const STAFF_DOMAIN = "hangeulglobal.com";

export function usernameToEmail(username: string) {
  const value = username.trim().toLowerCase();
  return value.includes("@") ? value : `${value}@${STAFF_DOMAIN}`;
}

/** Shows the username back without the internal domain. */
export function emailToUsername(email: string) {
  return email.endsWith(`@${STAFF_DOMAIN}`) ? email.split("@")[0] : email;
}
