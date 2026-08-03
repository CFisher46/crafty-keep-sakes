const TEST_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-jwt-secret";
}
