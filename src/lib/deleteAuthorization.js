const DEFAULT_DELETE_PASSWORDS = [
  'Pharma2026p',
  'Pharma2026f',
  'Maranatha0425',
  'edwin',
  '777'
];

const normalizePasswordList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export const getConfiguredPasswords = (source) => {
  if (source !== undefined && source !== null) {
    const normalized = normalizePasswordList(source);
    if (normalized.length > 0) {
      return [...new Set(normalized)];
    }
  }

  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  const envPasswords = env.VITE_DELETE_PASSWORDS;

  if (envPasswords) {
    const normalized = normalizePasswordList(envPasswords);
    if (normalized.length > 0) {
      return [...new Set(normalized)];
    }
  }

  return [...new Set(DEFAULT_DELETE_PASSWORDS)];
};

export const isAuthorizedDeletePassword = (password, source) => {
  const normalizedPassword = String(password ?? '').trim();
  if (!normalizedPassword) return false;

  return getConfiguredPasswords(source).includes(normalizedPassword);
};
