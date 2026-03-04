import { env } from "../utils/env.js";
import { HttpError } from "../utils/errors.js";

export function requireApiKey(req, _res, next) {
  const key = req.headers["x-api-key"];
  if (!key || key !== env.API_KEY) {
    return next(new HttpError(401, "Unauthorized", "UNAUTHORIZED"));
  }
  req.tenantId = env.TENANT_ID;
  next();
}

export function requireAdminKey(req, _res, next) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== env.ADMIN_KEY) {
    return next(new HttpError(401, "Unauthorized (admin)", "UNAUTHORIZED_ADMIN"));
  }
  req.tenantId = env.TENANT_ID;
  next();
}
