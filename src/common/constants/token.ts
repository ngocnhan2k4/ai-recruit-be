export const REFRESH_TOKEN = "refreshToken";

/**
 * Grace window (seconds) kept for a rotated refresh token. During rotation the
 * old token is not revoked immediately but shortened to live this long, so
 * concurrent refreshes (multiple tabs, retries) racing on the same old token
 * all still succeed instead of one of them getting a spurious 401 -> logout.
 * Override with env REFRESH_ROTATION_GRACE_SECONDS.
 */
export const REFRESH_ROTATION_GRACE_SECONDS = 30;
