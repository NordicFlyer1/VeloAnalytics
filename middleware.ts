/**
 * Vercel Middleware for Basic Authentication
 * Uses native Web APIs supported by Vercel Edge Runtime
 */

export const config = {
  // Apply middleware to all routes except assets and API
  matcher: '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
};

export default function middleware(req: Request) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;

  // If no auth variables are defined, allow the request (e.g. preview/local)
  if (!user || !pass) {
    return new Response(null, {
      headers: {
        'x-middleware-next': '1',
      },
    });
  }

  const authorization = req.headers.get('authorization');

  if (authorization) {
    try {
      const authValue = authorization.split(' ')[1];
      const decoded = atob(authValue);
      const [u, p] = decoded.split(':');

      if (u === user && p === pass) {
        // Authenticated - continue to next middleware/function
        return new Response(null, {
          headers: {
            'x-middleware-next': '1',
          },
        });
      }
    } catch (e) {
      console.error('Basic Auth Decode Error:', e);
    }
  }

  // Not authenticated - Return 401 with WWW-Authenticate header
  return new Response('Authentication Required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
      'Content-Type': 'text/plain',
    },
  });
}
