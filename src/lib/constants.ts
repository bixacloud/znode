// ============================================
// ZNODE VERSION (injected from package.json at build time)
// ============================================
declare const __APP_VERSION__: string;
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

// Application info
export const APP_NAME = "znode";
export const APP_AUTHOR = "Bixacloud";
