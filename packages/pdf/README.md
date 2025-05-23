Colibri PDF
===========
Colibri PDF is a wrapper for [Mozilla's PDF.js](https://mozilla.github.io/pdf.js/) library, a popular JavaScript library
for parsing and rendering PDF documents. This package augments PDF.js with proper conditional exports, allowing it to be
used both in the browser and in Node.js environments using the correct module automatically.

Available Exports
-----------------

- `@colibri-hq/pdf`: The main entry point for the package, which exports the PDF.js library with conditional exports for
  both browser and Node.js environments.
    - **In Node.js**: The package re-exports the `pdfjs-dist/legacy/build/pdf.mjs` module from PDF.js, which provides
      the core functionality for parsing and rendering PDF documents without a browser environment.
    - **In the browser**: The package re-exports the `pdfjs-dist/build/pdf.mjs` module from PDF.js.
    - **In a worker**: The package re-exports the `pdfjs-dist/build/pdf.worker.min.mjs` module from PDF.js, which is
      used for offloading PDF processing to a web worker. This can be used to import the web worker source from the
      client as a blob URL.
- `@colibri-hq/pdf/viewer`: The PDF.js viewer component, which provides a user interface for viewing PDF documents. This
  is a separate export to avoid including the viewer in environments where it is not required.
    - **In Node.js**: The package re-exports the `pdfjs-dist/web/pdf_viewer.mjs` module from PDF.js, which provides the
      legacy viewer component. This is probably not useful in Node.js, but is included for compatibility.
    - **In the browser**: The package re-exports the `pdfjs-dist/web/pdf_viewer.mjs` module from PDF.js, which provides
      the viewer component for rendering PDF documents in a web browser.
- `@colibri-hq/pdf/sandbox`: The PDF.js sandbox component, which provides a secure environment for rendering PDF
  documents. This is a separate export to avoid including the sandbox in environments where it is not required.
    - **In Node.js**: The package re-exports the `pdfjs-dist/web/pdf_sandbox.mjs` module from PDF.js, which provides the
      legacy sandbox component.
    - **In the browser**: The package re-exports the `pdfjs-dist/web/pdf_sandbox.mjs` module from PDF.js, which provides
      the sandbox component for rendering PDF documents in a secure environment.
