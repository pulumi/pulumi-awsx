#!/usr/bin/env node

const fs = require("fs");

const file = process.argv[2];
if (!file) {
  console.error("usage: strip-pe-certificate.js <windows-executable>");
  process.exit(2);
}

const executable = fs.readFileSync(file);
const peHeaderOffset = executable.readUInt32LE(0x3c);
if (executable.toString("ascii", peHeaderOffset, peHeaderOffset + 4) !== "PE\0\0") {
  throw new Error(`${file} is not a PE executable`);
}

const optionalHeaderOffset = peHeaderOffset + 24;
const optionalHeaderMagic = executable.readUInt16LE(optionalHeaderOffset);
let dataDirectoriesOffset;
if (optionalHeaderMagic === 0x10b) {
  dataDirectoriesOffset = optionalHeaderOffset + 96;
} else if (optionalHeaderMagic === 0x20b) {
  dataDirectoriesOffset = optionalHeaderOffset + 112;
} else {
  throw new Error(`unsupported PE optional-header magic: 0x${optionalHeaderMagic.toString(16)}`);
}

// The certificate table is data-directory entry 4. Unlike other PE data
// directories, its address is a file offset. SEA injection invalidates the
// downloaded Node executable's Authenticode signature and can leave this entry
// pointing at certificate data that is no longer at the end of the file. Clear
// the entry so the release signer can append a new certificate table.
const certificateDirectoryOffset = dataDirectoriesOffset + 4 * 8;
const certificateOffset = executable.readUInt32LE(certificateDirectoryOffset);
const certificateSize = executable.readUInt32LE(certificateDirectoryOffset + 4);
executable.fill(0, certificateDirectoryOffset, certificateDirectoryOffset + 8);
fs.writeFileSync(file, executable);

console.log(`cleared PE certificate table offset=${certificateOffset} size=${certificateSize}`);
