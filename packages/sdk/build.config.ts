import { defineBuildConfig } from 'unbuild';
import { name } from './package.json' with { type: 'json' };

export default defineBuildConfig({
  name,
  entries: [
    {
      input: './src/schema.d.ts',
      builder: 'copy',
      name: 'schema',
    },
    {
      input: './src',
      outDir: './dist',
      builder: 'copy',
    },
    {
      builder: 'mkdist',
      input: './src',
      outDir: './dist',
      format: 'esm',
      srcDir: 'src',
    },
  ],
  sourcemap: true,
  rollup: {
    dts: {
      compilerOptions: {
        sourceMap: true,
      },
    },
  },
  outDir: 'dist',
  declaration: true,
  externals: ['@simplewebauthn/server', '@simplewebauthn/server/helpers', 'kysely'],
  dependencies: ['@simplewebauthn/server', 'pg', 'kysely'],
  parallel: true,
  clean: true,
});
