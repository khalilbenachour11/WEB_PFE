/**
 * Middleware générique de validation.
 * Reçoit une fonction validateur(body) → { valid, error }
 */
function validate(validatorFn) {
  return (req, res, next) => {
    const result = validatorFn(req.body);
    if (!result.valid)
      return res.json({ success: false, message: result.error });
    next();
  };
}

module.exports = { validate };
