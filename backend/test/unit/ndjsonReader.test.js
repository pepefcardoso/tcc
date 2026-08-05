import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { parseNdjsonStream, createNdjsonReadStream } from '../../src/services/ndjsonReader.js';

let consoleWarnSpy;

beforeAll(() => {
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  consoleWarnSpy.mockRestore();
});

afterEach(() => {
  consoleWarnSpy.mockClear();
});

function makeReadable(content) {
  return Readable.from([content]);
}

describe('ndjsonReader Utility', () => {
  describe('parseNdjsonStream', () => {
    it('Happy path — yields all valid GPS and IMU records', async () => {
      const content = `{"type":"gps","time":1}\n{"type":"imu","time":2}\n{"type":"gps","time":3}`;
      const stream = makeReadable(content);
      
      const records = [];
      for await (const record of parseNdjsonStream(stream)) {
        records.push(record);
      }
      
      expect(records).toHaveLength(3);
      expect(records[0]).toEqual({ type: 'gps', time: 1 });
      expect(records[1]).toEqual({ type: 'imu', time: 2 });
      expect(records[2]).toEqual({ type: 'gps', time: 3 });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('Truncated last line — yields prior valid records, skips malformed, no throw', async () => {
      const content = `{"type":"gps","time":1}\n{"type":"imu","time":2}\n{"type":"gps","tim`;
      const stream = makeReadable(content);
      
      const records = [];
      for await (const record of parseNdjsonStream(stream)) {
        records.push(record);
      }
      
      expect(records).toHaveLength(2);
      expect(records[0].type).toBe('gps');
      expect(records[1].type).toBe('imu');
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[ndjsonReader] Skipping malformed line:',
        expect.stringContaining('{"type":"gps","tim')
      );
    });

    it('Skips blank lines gracefully', async () => {
      const content = `\n\n{"type":"gps","time":1}\n\n{"type":"imu","time":2}\n`;
      const stream = makeReadable(content);
      
      const records = [];
      for await (const record of parseNdjsonStream(stream)) {
        records.push(record);
      }
      
      expect(records).toHaveLength(2);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('Unknown type field — skips record and yields others', async () => {
      const content = `{"type":"gps","time":1}\n{"type":"unknown","time":2}\n{"type":"imu","time":3}`;
      const stream = makeReadable(content);
      
      const records = [];
      for await (const record of parseNdjsonStream(stream)) {
        records.push(record);
      }
      
      expect(records).toHaveLength(2);
      expect(records[0].time).toBe(1);
      expect(records[1].time).toBe(3);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[ndjsonReader] Unknown record type, skipping:',
        'unknown'
      );
    });
    
    it('Empty stream yields 0 records', async () => {
      const stream = makeReadable('');
      const records = [];
      for await (const record of parseNdjsonStream(stream)) {
        records.push(record);
      }
      expect(records).toHaveLength(0);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('All lines malformed yields 0 records', async () => {
      const content = `bad json\nmore bad json`;
      const stream = makeReadable(content);
      const records = [];
      for await (const record of parseNdjsonStream(stream)) {
        records.push(record);
      }
      expect(records).toHaveLength(0);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
    });
    
    it('Type field missing yields warning and skips', async () => {
       const content = `{"time":1}`;
       const stream = makeReadable(content);
       const records = [];
       for await (const record of parseNdjsonStream(stream)) {
         records.push(record);
       }
       expect(records).toHaveLength(0);
       expect(consoleWarnSpy).toHaveBeenCalledWith(
         '[ndjsonReader] Unknown record type, skipping:',
         undefined
       );
    });
  });

  describe('createNdjsonReadStream (with physical files)', () => {
    it('Successfully reads truncated_session.ndjson and stops cleanly', async () => {
      const fixturePath = path.join(process.cwd(), 'test', 'fixtures', 'truncated_session.ndjson');
      const reader = createNdjsonReadStream(fixturePath);
      
      const records = [];
      for await (const record of reader) {
        records.push(record);
      }
      
      expect(records).toHaveLength(4);
      expect(records[0].type).toBe('gps');
      expect(records[3].type).toBe('imu');
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('Successfully reads valid_session.ndjson completely', async () => {
      const fixturePath = path.join(process.cwd(), 'test', 'fixtures', 'valid_session.ndjson');
      const reader = createNdjsonReadStream(fixturePath);
      
      const records = [];
      for await (const record of reader) {
        records.push(record);
      }
      
      expect(records).toHaveLength(6);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});
