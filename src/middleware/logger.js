/**
 * Request Logger Middleware
 * Logs all incoming requests with full endpoint information
 */

const requestLogger = (req, res, next) => {
  // Get the full URL including protocol, host, and path
  const protocol = req.protocol || "http";
  const host = req.get("host") || req.hostname || "unknown";
  const path = req.originalUrl || req.url;
  const fullUrl = `${protocol}://${host}${path}`;

  // Get method
  const method = req.method;

  // Get IP address
  const ip =
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    (req.headers["x-forwarded-for"]
      ? req.headers["x-forwarded-for"].split(",")[0].trim()
      : null) ||
    "unknown";

  // Log the request with full endpoint
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ${method} ${fullUrl} - IP: ${ip}`);
  console.log(`─────────────────────────────────────────────────────────────`);

  // Log query parameters if present
  if (Object.keys(req.query).length > 0) {
    console.log(`Query Params:`, JSON.stringify(req.query, null, 2));
  }

  // Log route params if present
  if (req.params && Object.keys(req.params).length > 0) {
    console.log(`Route Params:`, JSON.stringify(req.params, null, 2));
  }

  // Log request body for POST/PUT/PATCH requests (be careful with sensitive data)
  if (
    ["POST", "PUT", "PATCH"].includes(method) &&
    req.body &&
    Object.keys(req.body).length > 0
  ) {
    // Create a safe copy without sensitive fields
    const safeBody = { ...req.body };

    // Remove sensitive fields from logging
    const sensitiveFields = [
      "password",
      "security_code",
      "otp",
      "token",
      "access_token",
      "refresh_token",
    ];
    sensitiveFields.forEach((field) => {
      if (safeBody[field]) {
        safeBody[field] = "***REDACTED***";
      }
    });

    console.log(`Request Body:`, JSON.stringify(safeBody, null, 2));
  }

  console.log(
    `─────────────────────────────────────────────────────────────\n`
  );

  // Continue to next middleware
  next();
};

module.exports = {
  requestLogger,
};
