import { Buffer } from 'buffer';

export function applyNodeGlobalPolyfills() {
  if (typeof globalThis === 'undefined' && typeof window !== 'undefined') {
    // eslint-disable-next-line no-global-assign
    globalThis = window;
  }

  if (typeof globalThis.global === 'undefined') {
    globalThis.global = globalThis;
  }

  if (typeof globalThis.process === 'undefined') {
    globalThis.process = { env: {} };
  } else if (!globalThis.process.env) {
    globalThis.process.env = {};
  }

  if (typeof globalThis.Buffer === 'undefined') {
    globalThis.Buffer = Buffer;
  }
}

applyNodeGlobalPolyfills();
