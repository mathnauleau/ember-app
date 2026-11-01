import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const OUTPUT = 'dist'

// Writes sw.js from the finished build, so offline always lists exactly what was shipped.
function emberServiceWorker(): Plugin {
  return {
    name: 'ember-service-worker',
    apply: 'build',
    closeBundle() {
      const files = readdirSync(OUTPUT, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => relative(OUTPUT, join(entry.parentPath, entry.name)))
        .sort()
      const hash = createHash('sha256')
      for (const file of files) hash.update(file).update(readFileSync(join(OUTPUT, file)))
      const worker = readFileSync('sw/service-worker.js', 'utf8')
        .replace('__VERSION__', hash.digest('hex').slice(0, 12))
        .replace('__FILES__', JSON.stringify(files))
      writeFileSync(join(OUTPUT, 'sw.js'), worker)
    },
  }
}

export default defineConfig({
  plugins: [react(), emberServiceWorker()],
})
