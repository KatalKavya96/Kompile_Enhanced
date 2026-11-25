// Test-only configuration. Values are dummies; nothing here reaches a real service.
process.env.NODE_ENV = "test";
process.env.ACCESS_TOKEN_SECRET ||= "test-access-secret";
process.env.ACCESS_TOKEN_EXPIRY ||= "1h";
process.env.REFRESH_TOKEN_SECRET ||= "test-refresh-secret";
process.env.REFRESH_TOKEN_EXPIRY ||= "1d";
process.env.GOOGLE_CLIENT_ID ||= "test-client-id";
process.env.GOOGLE_CLIENT_SECRET ||= "test-client-secret";
process.env.GOOGLE_CALLBACK_URL ||= "http://localhost/api/v1/auth/google/callback";
process.env.CLIENT_URL ||= "http://localhost:5173";
process.env.ALLOWED_EMAIL_DOMAINS = "nst.rishihood.edu.in";
// Most suites log in many times from one test IP; the dedicated rate-limit
// suite sets a low limit and checks that blocking works.
process.env.AUTH_RATE_LIMIT ||= "1000";
process.env.SYNC_RATE_LIMIT ||= "1000";
process.env.API_RATE_LIMIT ||= "100000";
