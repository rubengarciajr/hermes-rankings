// Stub for `import "server-only"` in vitest. The real package throws at
// runtime when imported into a client bundle; Next.js' bundler swaps it out.
// We just need it to exist + be silent so server-side modules can be unit
// tested.
export {};
