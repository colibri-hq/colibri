import * as pdfjs from "pdfjs-dist";
import { BROWSER } from "esm-env";

if (BROWSER) {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "worker.js",
    import.meta.url,
  ).toString();
}

export * from "pdfjs-dist";
