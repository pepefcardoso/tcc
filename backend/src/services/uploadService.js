import fs from 'fs';
import { createNdjsonReadStream } from './ndjsonReader.js';
import { ProcessingService } from './processingService.js';
import * as sessionRepository from '../repositories/sessionRepository.js';

export async function processUpload({ filePath, athleteId, sourceFilename }) {
  try {
    const session = await sessionRepository.create({
      athlete_id: athleteId,
      source_filename: sourceFilename,
    });

    const processor = new ProcessingService(session.id);

    const stream = createNdjsonReadStream(filePath);
    for await (const record of stream) {
      await processor.onRecord(record);
    }

    const { metrics } = await processor.drain();

    await sessionRepository.markProcessed(session.id);

    return {
      session_id: session.id,
      status: 'processed',
      metrics,
    };
  } catch (error) {
    throw error;
  } finally {
    fs.unlink(filePath, () => {});
  }
}
