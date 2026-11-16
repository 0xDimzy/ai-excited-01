import { mkdir, copyFile, stat, open } from 'node:fs/promises';
import { join } from 'node:path';

const source = join(process.cwd(), 'entry.png');
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const destination = join(outputDir, 'entry.png');

try {
  const sourceInfo = await stat(source);
  if (sourceInfo.size > 1024 * 1024) {
    throw new Error(`Source image is ${sourceInfo.size} bytes; the 1 MiB limit is 1048576 bytes`);
  }

  await mkdir(outputDir, { recursive: true });
  await copyFile(source, destination);

  const outputInfo = await stat(destination);
  if (outputInfo.size !== sourceInfo.size) {
    throw new Error(`Output size ${outputInfo.size} does not match source size ${sourceInfo.size}`);
  }

  const handle = await open(destination, 'r');
  try {
    const magic = Buffer.alloc(3);
    const { bytesRead } = await handle.read(magic, 0, 3, 0);
    if (bytesRead !== 3 || magic[0] !== 0xff || magic[1] !== 0xd8 || magic[2] !== 0xff) {
      throw new Error('Output does not begin with JPEG magic bytes FF D8 FF');
    }
  } finally {
    await handle.close();
  }
  console.log(`Wrote ${outputInfo.size} bytes to ${destination}`);
} catch (error) {
  console.error(`Failed to write image: ${error.message}`);
  process.exitCode = 1;
}
