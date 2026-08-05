import { jest } from '@jest/globals';
import { enqueue, resetQueue } from '../../src/services/processingQueue.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('processingQueue', () => {
  beforeEach(() => {
    resetQueue();
  });

  it('1. Single task executes and resolves', async () => {
    const result = await enqueue(async () => {
      await delay(10);
      return 'success';
    });
    expect(result).toBe('success');
  });

  it('2. Two concurrent tasks execute sequentially', async () => {
    const log = [];
    
    const p1 = enqueue(async () => {
      await delay(50);
      log.push(1);
      return 'a';
    });
    
    const p2 = enqueue(async () => {
      await delay(10);
      log.push(2);
      return 'b';
    });
    
    await Promise.all([p1, p2]);
    
    expect(log).toEqual([1, 2]);
  });

  it('3. Failing task does not block subsequent tasks', async () => {
    const log = [];
    
    const p1 = enqueue(async () => {
      log.push(1);
      return 'a';
    });
    
    const p2 = enqueue(async () => {
      log.push(2);
      throw new Error('Task 2 failed');
    });
    
    const p3 = enqueue(async () => {
      log.push(3);
      return 'c';
    });
    
    await expect(p1).resolves.toBe('a');
    await expect(p2).rejects.toThrow('Task 2 failed');
    await expect(p3).resolves.toBe('c');
    
    expect(log).toEqual([1, 2, 3]);
  });

  it('4. Task order is FIFO across 3 concurrent enqueues', async () => {
    const log = [];
    
    const p1 = enqueue(async () => { await delay(20); log.push(1); });
    const p2 = enqueue(async () => { await delay(10); log.push(2); });
    const p3 = enqueue(async () => { await delay(5); log.push(3); });
    
    await Promise.all([p1, p2, p3]);
    
    expect(log).toEqual([1, 2, 3]);
  });

  it('5. resetQueue() restores clean state for test isolation', async () => {
    enqueue(async () => {
      await delay(100);
    });
    
    resetQueue();
    
    const start = Date.now();
    await enqueue(async () => {
      return 'fast';
    });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(50);
  });
});
