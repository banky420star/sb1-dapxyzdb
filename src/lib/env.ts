export type RuntimeEnv = Record<string, string | boolean | number | undefined>;

const ENV_KEYS = ['VITE_API_BASE', 'VITE_WS_URL', 'API_BASE', 'WS_URL'] as const;
type KnownEnvKey = typeof ENV_KEYS[number];

function readGlobalEnv(): RuntimeEnv {
  if (typeof globalThis !== 'undefined') {
    const candidates = [
      (globalThis as Record<string, unknown>).__APP_ENV__,
      (globalThis as Record<string, unknown>).__ENV__,
      (globalThis as Record<string, unknown>).__CONFIG__,
    ];

    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'object') {
        return candidate as RuntimeEnv;
      }
    }
  }

  return {};
}

function readProcessEnv(): RuntimeEnv {
  if (typeof process !== 'undefined' && process.env) {
    return process.env as unknown as RuntimeEnv;
  }
  return {};
}

const cachedEnv: RuntimeEnv = {
  ...readProcessEnv(),
  ...readGlobalEnv(),
};

export function getEnvVar(key: KnownEnvKey | string, fallback?: string): string | undefined {
  const value = cachedEnv[key];
  if (value === undefined || value === null) {
    return fallback;
  }
  return String(value);
}

export function getApiBase(): string {
  return (
    getEnvVar('VITE_API_BASE') ||
    getEnvVar('API_BASE') ||
    'https://normal-sofa-production-9d2b.up.railway.app'
  );
}

export function getWsBase(): string {
  const httpBase = getApiBase();
  const explicit = getEnvVar('VITE_WS_URL') || getEnvVar('WS_URL');
  if (explicit) {
    return explicit;
  }

  if (httpBase.startsWith('https://')) {
    return `wss://${httpBase.slice('https://'.length)}`;
  }
  if (httpBase.startsWith('http://')) {
    return `ws://${httpBase.slice('http://'.length)}`;
  }
  return httpBase;
}

export function resolveEndpoint(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${getApiBase()}${path}`;
}
