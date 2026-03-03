import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const TENANT_ID = process.env.AZURE_AD_TENANT_ID || process.env.FABRIC_TENANT_ID || '';
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID || '';
const REQUIRED_GROUP_ID = process.env.AZURE_AD_GROUP_ID || 'bd3a6f77-0a07-4ade-a2e5-d26cd8310297';

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 86400000,
});

function getSigningKey(header: jwt.JwtHeader, callback: (err: Error | null, key?: string) => void) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key?.getPublicKey());
  });
}

export interface AuthUser {
  oid: string;
  name: string;
  email: string;
  groups: string[];
  isAdmin: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

/**
 * Validates Azure AD JWT token and extracts user info.
 * Does NOT block the request — just attaches user info if token is valid.
 */
export async function extractUser(request: FastifyRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  if (!TENANT_ID || !CLIENT_ID) {
    console.warn('[auth] AZURE_AD_TENANT_ID or AZURE_AD_CLIENT_ID not configured');
    return null;
  }

  return new Promise((resolve) => {
    jwt.verify(
      token,
      getSigningKey,
      {
        audience: CLIENT_ID,
        issuer: [
          `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
          `https://sts.windows.net/${TENANT_ID}/`,
        ],
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          console.warn('[auth] Token validation failed:', err.message);
          return resolve(null);
        }

        const payload = decoded as Record<string, any>;
        const groups: string[] = payload.groups || [];
        const user: AuthUser = {
          oid: payload.oid || '',
          name: payload.name || '',
          email: payload.preferred_username || payload.upn || payload.email || '',
          groups,
          isAdmin: groups.includes(REQUIRED_GROUP_ID),
        };
        resolve(user);
      },
    );
  });
}

/**
 * Fastify preHandler: attaches user to request (non-blocking).
 * Used on all routes so we know who's calling.
 */
export async function attachUser(request: FastifyRequest, _reply: FastifyReply) {
  request.user = (await extractUser(request)) ?? undefined;
}

/**
 * Fastify preHandler: requires authenticated admin (member of GR_CHEFS_ATELIERS).
 * Returns 401/403 if not authenticated or not in the group.
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  // If auth is not configured, allow all (dev mode)
  if (!TENANT_ID || !CLIENT_ID) return;

  const user = request.user ?? (await extractUser(request));
  request.user = user ?? undefined;

  if (!user) {
    return reply.code(401).send({ message: 'Authentification requise' });
  }

  if (!user.isAdmin) {
    return reply.code(403).send({ message: 'Accès réservé aux chefs d\'ateliers (GR_CHEFS_ATELIERS)' });
  }
}
