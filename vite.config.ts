import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Serves the Vercel functions in api/ during `npm run dev`, so the app works locally
// without the Vercel CLI. In production, Vercel runs them directly.
function localApi(): Plugin {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        try {
          const route = (req.url ?? '/').split('?')[0].replace(/^\/+/, '')
          if (!/^[a-z0-9-]+$/i.test(route) || !existsSync(join(server.config.root, 'api', `${route}.ts`))) {
            res.statusCode = 404
            res.end()
            return
          }
          const mod = await server.ssrLoadModule(`/api/${route}.ts`)
          const method = req.method ?? 'GET'
          const handler = mod[method] as ((request: Request) => Promise<Response>) | undefined
          if (!handler) {
            res.statusCode = 405
            res.end()
            return
          }
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(key, value)
          }
          const response = await handler(
            new Request(`http://${req.headers.host}${req.originalUrl ?? req.url}`, {
              method,
              headers,
              body: method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks)
            })
          )
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          server.config.logger.error(`api error: ${String(error)}`)
          res.statusCode = 500
          res.end()
        }
      })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Server-only secrets (like GEMINI_API_KEY in .env.local) for the local api/ functions.
  // They go into process.env for the dev server only and are never bundled into the browser.
  const env = loadEnv(mode, process.cwd(), '')
  if (env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY
  return {
    plugins: [react(), localApi()]
  }
})
