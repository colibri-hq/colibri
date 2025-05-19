import { defineBuildConfig } from "unbuild";
import packageJson from "./package.json" with { type: "json" };

const { name } = packageJson;

export default defineBuildConfig({
  clean: true,
  declaration: true,
  entries: [
    {
      addRelativeDeclarationExtensions: true,
      builder: "mkdist",
      ext: "js",
      format: "esm",
      input: "./src",
      outDir: "./dist",
      srcDir: "src",
    },
  ],
  name,
  outDir: "dist",
  parallel: true,
  rollup: {
    replace: {
      delimiters: ["", ""],
      values: {
        ".ts": ".js",
      },
    },
  },
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
