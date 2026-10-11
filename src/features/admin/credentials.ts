/**
 * Link, username and password in one block, because it gets pasted into one
 * message. Same format as the web's PasswordRevealDialog.
 */
export function buildCredentialMessage(appUrl: string, username: string, password: string): string {
  return [appUrl && `Link: ${appUrl}`, `Username: ${username}`, `Password: ${password}`]
    .filter(Boolean)
    .join("\n");
}

/**
 * The web form's HTML constraints (`required`, `minLength={8}`), which a
 * native form does not get for free. The backend stays authoritative for
 * the username pattern.
 */
export function validateNewUser(username: string, ownPassword: boolean, password: string): string | null {
  if (!username.trim()) return "Enter a username.";
  if (ownPassword && password.length < 8) return "The password needs at least 8 characters.";
  return null;
}

export function formatAdded(raw: string): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
