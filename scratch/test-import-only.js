console.log("Starting test...");
import('pdfjs-dist/legacy/build/pdf.mjs').then(() => {
  console.log("Import worked!");
}).catch(err => {
  console.error("Import failed:", err);
});
