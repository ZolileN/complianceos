console.log("Setting up polyfills...");
global.DOMMatrix = class DOMMatrix {};
global.ImageData = class ImageData {};
global.Path2D = class Path2D {};

console.log("Before requiring standard pdfjs-dist...");
try {
  const pdfjsLib = require('pdfjs-dist');
  console.log("After requiring standard pdfjs-dist!", typeof pdfjsLib.getDocument);
} catch (e) {
  console.error("Failed to require:", e.stack || e.message);
}
