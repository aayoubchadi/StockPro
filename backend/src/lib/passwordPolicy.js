const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/;

export function validatePasswordPolicy(password, email = '') {
  const errors = [];
  const value = String(password || '');
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const emailLocalPart = normalizedEmail.includes('@')
    ? normalizedEmail.split('@')[0]
    : normalizedEmail;

  if (value.length < 12) {
    errors.push('minimum length is 12');
  }

  if (value.length > 72) {
    errors.push('maximum length is 72');
  }

  if (!/[A-Z]/.test(value)) {
    errors.push('must include at least one uppercase letter');
  }

  if (!/[a-z]/.test(value)) {
    errors.push('must include at least one lowercase letter');
  }

  if (!/[0-9]/.test(value)) {
    errors.push('must include at least one digit');
  }

  if (!SPECIAL_CHAR_REGEX.test(value)) {
    errors.push('must include at least one special character');
  }

  if (/\s/.test(value)) {
    errors.push('must not include spaces');
  }

  if (emailLocalPart && value.toLowerCase().includes(emailLocalPart)) {
    errors.push('must not contain the local part of email');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
