import { fileURLToPath } from 'node:url';
import { defineBuildConfig } from 'unbuild';
import { name } from './package.json' with { type: 'json' };

export default defineBuildConfig({
  alias: {
    '$cli': fileURLToPath(new URL('src', import.meta.url)),
  },
  clean: true,
  declaration: true,
  entries: [
    {
      addRelativeDeclarationExtensions: true,
      builder: 'mkdist',
      ext: 'js',
      format: 'esm',
      input: './src',
      outDir: './dist',
      srcDir: 'src',
    },
  ],
  name,
  outDir: 'dist',
  parallel: true,
  sourcemap: true,
  stubOptions: {
    jiti: {
      debug: true,
      interopDefault: true,
      transformOptions: {
        interopDefault: true,
        ts: true,
      },
    },
  },
});
