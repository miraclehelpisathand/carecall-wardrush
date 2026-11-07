#!/usr/bin/env node
/**
 * Creates a GitHub-ready source package for CareCall Ward Rush.
 *
 * Output:
 *   public/downloads/carecall-ward-rush-github.zip
 *   public/downloads/SHA256SUMS.txt
 *   public/downloads/package-manifest.json
 *
 * The archive intentionally excludes node_modules, dist, caches, local env
 * files, and the generated download artifacts themselves.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "downloads");
const zipName = "carecall-ward-rush-github.zip";
const zipPath = path.join(outDir, zipName);

const excludedDirs = new Set([
  "node_modules",
  ".git",
  "dist",
  "dist-ssr",
  ".cache",
  ".temp",
  ".turbo",
  "public/downloads",
]);

const excludedFiles = new Set([
  ".env",
  ".env.local",
  ".env.development.local",
  ".env.production.local",
  "public/download.html",
  ".DS_Store",
  "Thumbs.db",
]);

function isExcluded(rel) {
  const normalized = rel.split(path.sep).join("/");
  if (excludedFiles.has(normalized)) return true;
  if (normalized.endsWith(".zip")) return true;
  if (normalized.endsWith(".tsbuildinfo")) return true;
  for (const dir of excludedDirs) {
    if (normalized === dir || normalized.startsWith(`${dir}/`)) return true;
  }
  return false;
}

async function collectFiles(dir, rel = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const childRel = rel ? path.join(rel, entry.name) : entry.name;
    if (isExcluded(childRel)) continue;
    const childPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(childPath, childRel)));
    } else if (entry.isFile()) {
      files.push(childRel);
    }
  }
  return files;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((Math.floor(date.getSeconds() / 2)) & 0x1f);
  const day =
    (((year - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);
  return { time, day };
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value >>> 0, 0);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

async function buildZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  let uncompressedBytes = 0;

  for (const rel of files) {
    const absolute = path.join(root, rel);
    const data = await readFile(absolute);
    const info = await stat(absolute);
    const name = Buffer.from(rel.split(path.sep).join("/"), "utf8");
    const compressed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const { time, day } = dosDateTime(info.mtime);
    const flags = 0x0800; // UTF-8 filenames
    const method = 8; // deflate
    const externalAttrs = (0o100644 << 16) >>> 0;

    const localHeader = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(flags),
      u16(method),
      u16(time),
      u16(day),
      u32(crc),
      u32(compressed.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
    ]);

    localParts.push(localHeader, compressed);

    centralParts.push(
      Buffer.concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(flags),
        u16(method),
        u16(time),
        u16(day),
        u32(crc),
        u32(compressed.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(externalAttrs),
        u32(offset),
        name,
      ])
    );

    offset += localHeader.length + compressed.length;
    uncompressedBytes += data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDirectory.length),
    u32(offset),
    u16(0),
  ]);

  return {
    buffer: Buffer.concat([...localParts, centralDirectory, endRecord]),
    uncompressedBytes,
  };
}

const files = (await collectFiles(root)).sort();
if (!files.includes("package.json") || !files.includes(".github/workflows/deploy.yml")) {
  throw new Error("Release package is missing required project files.");
}

await mkdir(outDir, { recursive: true });
const { buffer, uncompressedBytes } = await buildZip(files);
await writeFile(zipPath, buffer);

const sha256 = createHash("sha256").update(buffer).digest("hex");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const manifest = {
  name: packageJson.name,
  version: packageJson.version,
  fileName: zipName,
  downloadPath: `downloads/${zipName}`,
  createdAt: new Date().toISOString(),
  fileCount: files.length,
  uncompressedBytes,
  zipBytes: buffer.length,
  sha256,
  instructions: "UPLOAD-TO-GITHUB.md",
};

await writeFile(path.join(outDir, "SHA256SUMS.txt"), `${sha256}  ${zipName}\n`, "utf8");
await writeFile(path.join(outDir, "package-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`Created ${path.relative(root, zipPath)}`);
console.log(`Files: ${files.length}`);
console.log(`ZIP size: ${(buffer.length / 1024).toFixed(1)} KB`);
console.log(`SHA-256: ${sha256}`);
