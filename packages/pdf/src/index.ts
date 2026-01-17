import { BROWSER } from "esm-env";
import * as pdfjs from "pdfjs-dist";

if (BROWSER) {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("worker.js", import.meta.url).toString();
}

export * from "pdfjs-dist";
