import { PGlite } from '@electric-sql/pglite'
import { worker } from '@electric-sql/pglite/worker'
import { runMigrations } from './migrations.js'

worker({
  async init() {
    // Load PGlite’s WASM and data bundle from public/ so each tab shares the same DB files
    const [wasmBuf, dataBlob] = await Promise.all([
      fetch('/pglite.wasm').then(r => r.arrayBuffer()),
      fetch('/pglite.data').then(r => r.blob()),
    ])

    // Initialize a new PGlite instance backed by IndexedDB under "patient-db"
    // Using WebAssembly.compile ensures we have a working wasmModule before instantiating
    const pg = new PGlite('idb://patient-db', {
      wasmModule: await WebAssembly.compile(wasmBuf),
      fsBundle: dataBlob,
      debug: import.meta.env.DEV, // Enable verbose logging in development
    })

    // Run our SQL migrations exactly once per DB version, ensuring the schema is up-to-date
    await runMigrations(pg)

    // Return the shared PGlite instance so every tab can use the same connection
    return pg
  }
})

