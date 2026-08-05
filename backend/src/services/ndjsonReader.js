import fs from 'fs';
import readline from 'readline';

/**
 * Creates a stream reader for NDJSON files.
 * Yields parsed records of type 'gps' or 'imu'.
 * Tolerates malformed lines (e.g., at the end of a file due to power loss)
 * by logging a warning and skipping them without throwing.
 *
 * @param {import('stream').Readable} readableStream - The input readable stream.
 * @returns {AsyncGenerator<Object, void, unknown>} An async generator yielding typed records.
 */
export async function* parseNdjsonStream(readableStream) {
  const rl = readline.createInterface({
    input: readableStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let record;
    try {
      record = JSON.parse(trimmed);
    } catch {
      console.warn('[ndjsonReader] Skipping malformed line:', trimmed.slice(0, 80));
      continue;
    }

    if (record.type !== 'gps' && record.type !== 'imu') {
      console.warn('[ndjsonReader] Unknown record type, skipping:', record.type);
      continue;
    }

    yield record;
  }
}

/**
 * Convenience wrapper to create a readable stream from a file and parse it.
 *
 * @param {string} filePath - Absolute path to the NDJSON file.
 * @returns {AsyncGenerator<Object, void, unknown>}
 */
export function createNdjsonReadStream(filePath) {
  return parseNdjsonStream(fs.createReadStream(filePath, { encoding: 'utf8' }));
}
