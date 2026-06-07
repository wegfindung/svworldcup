// Post-build prerender for the static marketing routes (Option A from the SEO work — see
// architecture/SOP_system_overview.md "SEO & Discoverability"). Runs after `vite build`: it loads the
// SSR entry via Vite, renders each marketing page to a string, and bakes that body into the built
// index.html, writing dist/<route>/index.html. The server then serves those files to crawlers.
//
// Designed to degrade gracefully: any failure (entry won't load, a page throws) leaves the affected
// route as the normal client-rendered shell and the build still succeeds.
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const webRoot = resolve(here, '..')
const distDir = resolve(webRoot, 'dist')
const templatePath = resolve(distDir, 'index.html')
const ROOT_MARKER = '<div id="root"></div>'

async function main() {
  if (!existsSync(templatePath)) {
    console.warn('[prerender] dist/index.html not found — skipping (did vite build run?)')
    return
  }

  const template = await readFile(templatePath, 'utf8')
  if (!template.includes(ROOT_MARKER)) {
    console.warn('[prerender] root marker not found in index.html — skipping prerender')
    return
  }

  const { createServer } = await import('vite')
  const vite = await createServer({
    root: webRoot,
    logLevel: 'error',
    server: { middlewareMode: true },
    appType: 'custom',
  })

  let entry
  try {
    entry = await vite.ssrLoadModule('/src/entry-prerender.tsx')
  } catch (error) {
    console.warn('[prerender] could not load prerender entry — serving shell only:', error?.message ?? error)
    await vite.close()
    return
  }

  let prerendered = 0
  let skipped = 0
  for (const path of entry.prerenderPaths) {
    try {
      const appHtml = entry.renderRoute(path)
      const html = template.replace(ROOT_MARKER, `<div id="root">${appHtml}</div>`)
      const outPath = path === '/' ? templatePath : resolve(distDir, `.${path}`, 'index.html')
      await mkdir(dirname(outPath), { recursive: true })
      await writeFile(outPath, html, 'utf8')
      prerendered += 1
    } catch (error) {
      skipped += 1
      console.warn(`[prerender] ${path} failed — leaving client shell:`, error?.message ?? error)
    }
  }

  await vite.close()
  console.log(`[prerender] done: ${prerendered} prerendered, ${skipped} skipped`)
}

main().catch((error) => {
  console.warn('[prerender] unexpected error — build continues with shell only:', error?.message ?? error)
})
