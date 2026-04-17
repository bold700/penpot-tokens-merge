#!/usr/bin/env node
/**
 * penpot-tokens-merge
 * Merges multiple Penpot token JSON exports into one file.
 * Later files override existing token values; new sets and tokens are added.
 *
 * Usage:
 *   node merge.js base.json override.json [...more.json] -o merged.json
 *   node merge.js base.json override.json > merged.json
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node merge.js file1.json file2.json [...] [-o output.json]');
  process.exit(0);
}

// Parse -o flag
let outputFile = null;
const inputFiles = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '-o' && args[i + 1]) {
    outputFile = args[++i];
  } else {
    inputFiles.push(args[i]);
  }
}

if (inputFiles.length < 2) {
  console.error('Error: provide at least 2 input files to merge.');
  process.exit(1);
}

// Deep merge: objects are merged recursively, primitives are overwritten
function deepMerge(target, source) {
  const result = Object.assign({}, target);
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      result[key] !== null &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

let merged = {};
let fileCount = 0;

for (const file of inputFiles) {
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: file not found: ${filePath}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error(`Error: invalid JSON in ${file}: ${e.message}`);
    process.exit(1);
  }
  merged = deepMerge(merged, data);
  fileCount++;
}

const output = JSON.stringify(merged, null, 2);

if (outputFile) {
  fs.writeFileSync(path.resolve(outputFile), output, 'utf8');
  console.error(`Merged ${fileCount} files → ${outputFile}`);
} else {
  process.stdout.write(output + '\n');
}
