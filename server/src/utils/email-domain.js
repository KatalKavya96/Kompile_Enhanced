// Kompile is for university students only. Sign-up (email and Google) is
// limited to these domains. Override with ALLOWED_EMAIL_DOMAINS (comma-separated).
const DEFAULT_DOMAINS = "nst.rishihood.edu.in";

export const allowedEmailDomains = () =>
  (process.env.ALLOWED_EMAIL_DOMAINS || DEFAULT_DOMAINS)
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

export const isAllowedEmail = (email) => {
  if (typeof email !== "string") return false;
  const at = email.lastIndexOf("@");
  if (at < 1) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return allowedEmailDomains().includes(domain);
};
