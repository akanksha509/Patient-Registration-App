import { PGliteWorker } from '@electric-sql/pglite/worker'

let dbPromise = null

export function getDb() {
  // Initialize PGlite in a Web Worker once, then reuse it
  if (!dbPromise) {
    const workerInstance = new Worker(
      new URL('./pglite.worker.js', import.meta.url),
      { type: 'module' }
    )
    dbPromise = PGliteWorker.create(workerInstance)
  }
  return dbPromise
}



