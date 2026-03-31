export const config = {
  // Protect all routes except for static assets
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

export default function middleware(request: Request) {
  const authorization = request.headers.get("authorization");

  // Get credentials from environment variables
  const USER = process.env.BASIC_AUTH_USER;
  const PASS = process.env.BASIC_AUTH_PASSWORD;

  // If environment variables aren't set, allow access (failsafe)
  if (!USER || !PASS) {
    return new Response(null, {
      headers: { "x-middleware-next": "1" },
    });
  }

  if (authorization) {
    try {
      const authValue = authorization.split(" ")[1];
      const decoded = atob(authValue).split(":");
      const user = decoded[0];
      const pwd = decoded[1];

      if (user === USER && pwd === PASS) {
        // Correct credentials, continue to the app
        return new Response(null, {
          headers: { "x-middleware-next": "1" },
        });
      }
    } catch (e) {
      console.error("Auth header parsing failed", e);
    }
  }

  // If no auth or wrong auth, return 401 to trigger browser prompt
  return new Response("Authentication Required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Secure Area"',
    },
  });
}
