import { next } from '@vercel/edge';

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};

export default function middleware(req: Request) {
  const authorization = req.headers.get('authorization');
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;

  // If no auth variables are defined, allow the request (local dev / preview)
  if (!user || !pass) {
    return next();
  }

  if (authorization) {
    const authValue = authorization.split(' ')[1];
    const [u, p] = atob(authValue).split(':');

    if (u === user && p === pass) {
      return next();
    }
  }

  return new Response('Authentication Required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}
