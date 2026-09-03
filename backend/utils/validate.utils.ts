/**
 * validate.utils — lightweight input validation used by controllers before they
 * hit a model. Mirrors the WMS `validate.validate_input_params(data, rules, cb)`
 * contract so controllers read the same way across both codebases.
 *
 * Rule: { field, type: 'int'|'number'|'phone'|'email'|'others', required, name }
 */
export {};

function isEmpty(v: any) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

exports.validate_input_params = function (
  data: any,
  rules: Array<{ field: string; type?: string; required?: boolean; name?: string }>,
  cb: (err: any, result: { status: number; error_msg?: string; msg?: string }) => void
) {
  data = data || {};
  for (const rule of rules) {
    const val = data[rule.field];
    const label = rule.name || rule.field;

    if (rule.required && isEmpty(val)) {
      return cb(null, { status: 0, error_msg: `${label} is required`, msg: 'Validation failed' });
    }
    if (isEmpty(val)) continue; // optional + absent → skip type checks

    switch (rule.type) {
      case 'int':
        if (!/^-?\d+$/.test(String(val))) {
          return cb(null, { status: 0, error_msg: `${label} must be an integer`, msg: 'Validation failed' });
        }
        break;
      case 'number':
        if (isNaN(Number(val))) {
          return cb(null, { status: 0, error_msg: `${label} must be a number`, msg: 'Validation failed' });
        }
        break;
      case 'phone':
        if (!/^[+]?[\d\s-]{7,15}$/.test(String(val))) {
          return cb(null, { status: 0, error_msg: `${label} must be a valid phone number`, msg: 'Validation failed' });
        }
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))) {
          return cb(null, { status: 0, error_msg: `${label} must be a valid email`, msg: 'Validation failed' });
        }
        break;
      default:
        break;
    }
  }
  return cb(null, { status: 1 });
};

/** Normalize a phone to digits-only with a leading country code assumption. */
exports.normalizePhone = function (phone: string): string {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  return digits;
};
