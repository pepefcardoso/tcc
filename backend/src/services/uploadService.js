import fs from 'fs';
import { createNdjsonReadStream } from './ndjsonReader.js';
import { ProcessingService } from './processingService.js';
import * as sessionRepository from '../repositories/sessionRepository.js';
import { AppError } from '../middleware/errorHandler.js';

export async function processUpload({ filePath, athleteId, sourceFilename }) {
  try {
    const stat = await fs.promises.stat(filePath);
    if (stat.size === 0) {
      throw new AppError(422, 'validation_error', 'Uploaded file is empty');
    }
  } catch (err) {
    if (err instanceof AppError) {
      fs.unlink(filePath, () => {});
      throw err;
    }
    }

  let client;
  try {
    client = await sessionRepository.beginUploadTransaction();

    const session = await sessionRepository.create({
      athlete_id: athleteId,
      source_filename: sourceFilename,
    }, client);

    const processor = new ProcessingService(session.id, client);

    const stream = createNdjsonReadStream(filePath);
    for await (const record of stream) {
      await processor.onRecord(record);
    }

    const { totalGps, totalImu, metrics } = await processor.drain();

    if (totalGps + totalImu === 0) {
      throw new AppError(415, 'unsupported_media_type', 'File contains no valid NDJSON records');
    }

    await sessionRepository.insertMetrics(session.id, metrics, client);
    await sessionRepository.markProcessed(session.id, client);

    await client.query('COMMIT');
    client.release();

    return {
      session_id: session.id,
      status: 'processed',
      metrics,
    };
  } catch (error) {
    await sessionRepository.rollbackAndRelease(client);
    throw error;
  } finally {
    fs.unlink(filePath, () => {});
  }
}
