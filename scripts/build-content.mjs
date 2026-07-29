import { build } from 'esbuild';

// Content scripts must be self-contained IIFE bundles: MV3 does not support
// ES module content scripts, and Vite/Rollup can't emit multi-entry IIFE.
await build({
  entryPoints: ['src/content/linkedin.ts', 'src/content/ats.ts'],
  bundle: true,
  format: 'iife',
  outdir: 'dist/content',
  target: 'chrome120',
  logLevel: 'info',
});
