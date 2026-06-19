const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

global.DOMMatrix = class DOMMatrix {};
global.ImageData = class ImageData {};
global.Path2D = class Path2D {};

const pdfjsLib = require('pdfjs-dist');
pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.mjs');

async function run() {
  const doc = await prisma.document.findFirst({
    where: { name: "BEE.pdf" }
  });

  if (!doc) {
    console.error("Could not find 'BEE.pdf' in the database!");
    return;
  }

  console.log(`Found document: ${doc.name} (Category: ${doc.category}, URL: ${doc.filePath})`);

  console.log("Fetching file from URL...");
  const res = await fetch(doc.filePath);
  if (!res.ok) {
    console.error("Failed to fetch file:", res.statusText);
    return;
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  console.log("Loading document with pdfjs-dist...");
  const loadingTask = pdfjsLib.getDocument({
    data: buffer,
    useSystemFonts: true,
    disableFontFace: true
  });
  const pdf = await loadingTask.promise;
  
  let ocrText = '';
  console.log(`Total Pages: ${pdf.numPages}`);
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    ocrText += pageText + '\n';
  }

  console.log("\n--- EXTRACTED TEXT START ---");
  console.log(ocrText);
  console.log("--- EXTRACTED TEXT END ---\n");
}

run().catch(console.error).finally(() => prisma.$disconnect());
