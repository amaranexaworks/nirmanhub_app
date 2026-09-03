/**
 * dflower.utils — the response + context envelope used by every controller.
 * Mirrors the WMS `utils/dflower.utils`: `getModuleMetaData`, `formatSucessRes`,
 * `formatErrorRes`. All API responses share one shape so the client can rely on it:
 *
 *   { status, success, message, data, meta }
 */
export {};
const path = require('path');

/** Derive `{ module, file }` context for logs from a model/controller's __dirname/__filename. */
exports.getModuleMetaData = function (dirname: string, filename: string) {
  return {
    module: path.basename(path.dirname(dirname)) + '/' + path.basename(dirname),
    file: path.basename(filename),
  };
};

/**
 * Success envelope.
 * @param opts { success_status?, success_msg?, meta? }
 */
exports.formatSucessRes = function (
  req: any,
  res: any,
  data: any,
  cntxtDtls: any,
  fnm: string,
  opts: any = {}
) {
  const status = opts.success_status || 200;
  return res.status(status).json({
    status,
    success: true,
    message: opts.success_msg || 'Success',
    data: data === undefined ? null : data,
    meta: opts.meta || undefined,
  });
};

/**
 * Error envelope.
 * @param opts { error_status?, err_message?, errors? }
 */
exports.formatErrorRes = function (
  res: any,
  errors: any,
  cntxtDtls: any,
  fnm: string,
  opts: any = {}
) {
  const status = opts.error_status || 500;
  if (cntxtDtls && errors) {
    console.error(`[${cntxtDtls.module}/${cntxtDtls.file}:${fnm}]`, opts.err_message || '', errors);
  }
  // SECURITY: never leak internal failure detail (raw Postgres/driver errors, stack
  // text) to clients in production. Server errors (5xx) are almost always built from
  // a caught `e.message`; in prod we replace that with a generic string and drop the
  // `errors` array. Client-facing 4xx messages (validation, "already exists", etc.)
  // are intentional and pass through unchanged. Full detail is still logged above.
  const isProd = process.env.NODE_ENV === 'production';
  const maskServerError = isProd && status >= 500;
  return res.status(status).json({
    status,
    success: false,
    message: maskServerError ? 'Internal server error' : (opts.err_message || 'Internal server error'),
    data: null,
    errors: maskServerError ? undefined : (Array.isArray(errors) ? errors : errors ? [errors] : undefined),
  });
};
