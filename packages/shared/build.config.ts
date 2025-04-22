import { defineBuildConfig } from 'unbuild';
import { name } from './package.json' with { type: 'json' };

export default defineBuildConfig({
  name,
  entries: [
    {
      builder: 'mkdist',
      ext: 'js',
      format: 'esm',
      globOptions: { ignore: ['**/*.test.ts', '**/*.spec.ts'] },
      input: './src',
      outDir: './dist',
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
    esbuild: {
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
    },
  },
  externals: ['vitest'],
  outDir: 'dist',
  declaration: true,
  parallel: true,
  clean: true,
});
