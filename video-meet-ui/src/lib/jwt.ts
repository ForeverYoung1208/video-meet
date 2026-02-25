/**
 * Decodes JWT token payload without verification
 * Note: This only decodes the token, it does NOT verify the signature
 */
export const decodeJWT = (token: string): Record<string, unknown> | null => {
  try {
    // JWT has 3 parts separated by dots: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];

    // Base64URL decode
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
};

/**
 * Extracts user ID from JWT token
 */
export const getUserIdFromToken = (token: string): string | null => {
  const payload = decodeJWT(token);
  if (!payload) {
    return null;
  }

  // Common JWT claim names for user ID
  return (payload.sub as string) || (payload.userId as string) || (payload.id as string) || null;
};
