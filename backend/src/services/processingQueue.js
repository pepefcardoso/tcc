/**
 * Sequential processing queue (FIFO).
 *
 * Implements a simple, zero-dependency async mutex to guarantee that only
 * one task runs at a time (concurrency = 1). This satisfies the requirement
 * for sequential processing of NDJSON uploads on a single VPS instance without
 * requiring external dependencies like p-queue.
 */

let _tail = Promise.resolve();

/**
 * Enqueues an async task to run sequentially.
 *
 * @param {Function} taskFn - An async function representing the task.
 * @returns {Promise<any>} A promise that resolves/rejects with the task's result.
 */
export function enqueue(taskFn) {
  const result = _tail.then(() => taskFn());
  
  _tail = result.catch(() => {});
  
  return result;
}

/**
 * Resets the queue state.
 *
 * **FOR TESTING PURPOSES ONLY.** Do not use in production code.
 */
export function resetQueue() {
  _tail = Promise.resolve();
}
