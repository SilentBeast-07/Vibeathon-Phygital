import '@testing-library/jest-dom/vitest';

if (typeof window !== 'undefined' && typeof window.localStorage?.getItem !== 'function') {
  const mem = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => mem.set(k, String(v)),
      removeItem: (k: string) => mem.delete(k),
      clear: () => mem.clear(),
    },
    configurable: true,
  });
}
