import { defineBuildConfig } from "unbuild";
import { name } from "./package.json" with { type: "json" };

export default defineBuildConfig({
  name,
  entries: [
    {
      builder: "mkdist",
      input: "./src",
      globOptions: { ignore: ["**/*.test.ts", "**/*.spec.ts"] },
      outDir: "./dist",
      format: "esm",
      srcDir: "src",
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
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
    },
  },
  externals: ["vitest"],
  outDir: "dist",
  declaration: true,
  parallel: true,
  clean: true,
});
