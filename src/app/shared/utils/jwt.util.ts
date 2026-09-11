

interface JwtPayload {
  exp?: number; // timestamp Unix (secondes)
  [key: string]: any;
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64Payload = token.split('.')[1];
    const payload = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload);
  } catch {
    return null; // token malformé
  }
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;

  const payload = decodeJwt(token);
  if (!payload?.exp) return true; // pas de date d'expiration lisible -> considéré invalide

  const maintenant = Math.floor(Date.now() / 1000);
  return payload.exp < maintenant;
}
