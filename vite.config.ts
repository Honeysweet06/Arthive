import { randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { defineConfig, type Connect, type Plugin } from 'vite'

const imageFolders = new Set([
  'artworks',
  'literature',
  'essays',
  'sculptures',
  'artists',
  'authors',
  'sellers',
  'marketplace',
  'founder',
  'exhibitions',
  'banners',
])
const imageTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
])
const maximumImageSize = 15 * 1024 * 1024
const assetPrefix = '/assets/images'

type ManagedAsset = { category: string; name: string; createdAt: string }

function isLoopbackRequest(request: Connect.IncomingMessage) {
  const address = request.socket.remoteAddress ?? ''
  const host = request.headers.host ?? ''
  const origin = request.headers.origin
  const loopbackAddress = address === '::1' || address === '127.0.0.1' || address.startsWith('::ffff:127.')
  const loopbackHost = /^(localhost|127\.0\.0\.1|\[::1\]):\d+$/i.test(host)
  let loopbackOrigin = false
  if (origin) {
    try {
      const parsed = new URL(origin)
      loopbackOrigin = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
        && (parsed.protocol === 'http:' || parsed.protocol === 'https:')
    } catch {
      loopbackOrigin = false
    }
  }
  return loopbackAddress && loopbackHost && (!origin || loopbackOrigin)
}

function imageSignatureMatches(type: string, bytes: Buffer) {
  if (type === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (type === 'image/png') {
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return false
    let offset = 8
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset)
      const chunkType = bytes.subarray(offset + 4, offset + 8).toString('ascii')
      if (chunkType === 'acTL') return false
      if (chunkType === 'IEND') return true
      offset += length + 12
      if (offset > bytes.length) return false
    }
  }
  return false
}

async function loadManifest(manifestPath: string): Promise<ManagedAsset[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(manifestPath, 'utf8'))
    if (!Array.isArray(parsed)) throw new Error('Local image asset manifest must contain an array.')
    return parsed.filter((asset): asset is ManagedAsset =>
      typeof asset?.category === 'string'
      && imageFolders.has(asset.category)
      && typeof asset?.name === 'string'
      && /^[a-f0-9-]{36}-[a-zA-Z0-9._-]+\.(jpg|png)$/.test(asset.name)
      && typeof asset?.createdAt === 'string',
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

async function readUpload(request: Connect.IncomingMessage) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > maximumImageSize) {
      request.resume()
      throw Object.assign(new Error('Images must be no larger than 15 MB.'), { statusCode: 413 })
    }
    chunks.push(buffer)
  }
  return Buffer.concat(chunks, size)
}

function sendJson(response: Connect.ServerResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(body))
}

function localAssetManager(): Plugin {
  const projectRoot = process.cwd()
  const imagesRoot = path.resolve(projectRoot, 'public', 'assets', 'images')
  const manifestPath = path.resolve(projectRoot, '.arthive-managed-assets.json')

  return {
    name: 'arthive-local-asset-manager',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestUrl = new URL(request.url ?? '/', 'http://localhost')
        if (requestUrl.pathname !== '/__arthive/local-assets') {
          next()
          return
        }
        if (!isLoopbackRequest(request)) {
          sendJson(response, 403, { error: 'Local asset management is available only from this development machine.' })
          return
        }
        if (!['GET', 'POST', 'DELETE'].includes(request.method ?? '')) {
          sendJson(response, 405, { error: 'Unsupported local asset operation.' })
          return
        }

        void (async () => {
          if (request.method === 'GET') {
            const managedAssets = await loadManifest(manifestPath)
            const managedKeys = new Set(managedAssets.map((asset) => `${asset.category}/${asset.name}`))
            const assets: Array<ManagedAsset & { path: string; managed: boolean }> = []
            for (const category of imageFolders) {
              const directory = path.resolve(imagesRoot, category)
              let names: string[]
              try {
                names = await readdir(directory)
              } catch (error) {
                if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue
                throw error
              }
              for (const name of names) {
                if (!/\.(jpg|jpeg|png)$/i.test(name)) continue
                const fileStat = await stat(path.resolve(directory, name))
                if (!fileStat.isFile()) continue
                assets.push({
                  category,
                  name,
                  createdAt: fileStat.mtime.toISOString(),
                  path: `${assetPrefix}/${category}/${name}`,
                  managed: managedKeys.has(`${category}/${name}`),
                })
              }
            }
            sendJson(response, 200, { assets })
            return
          }

          const category = requestUrl.searchParams.get('category') ?? ''
          if (!imageFolders.has(category)) {
            sendJson(response, 400, { error: 'Choose a valid local image category.' })
            return
          }

          if (request.method === 'POST') {
            const contentType = (request.headers['content-type'] ?? '').split(';', 1)[0].trim().toLowerCase()
            const extension = imageTypes.get(contentType)
            if (!extension) {
              sendJson(response, 415, { error: 'Choose a JPEG or static PNG image.' })
              return
            }
            const bytes = await readUpload(request)
            if (!bytes.length || !imageSignatureMatches(contentType, bytes)) {
              sendJson(response, 400, { error: 'The file contents do not match a supported image format.' })
              return
            }
            const rawName = path.basename(requestUrl.searchParams.get('name') ?? 'image')
            const safeBase = rawName.replace(/\.[^.]+$/, '').normalize('NFKD')
              .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'image'
            const name = `${randomUUID()}-${safeBase}.${extension}`
            const directory = path.resolve(imagesRoot, category)
            await mkdir(directory, { recursive: true })
            const target = path.resolve(directory, name)
            if (!target.startsWith(`${directory}${path.sep}`)) {
              sendJson(response, 400, { error: 'The image path is invalid.' })
              return
            }
            await writeFile(target, bytes, { flag: 'wx' })
            try {
              const manifest = await loadManifest(manifestPath)
              manifest.push({ category, name, createdAt: new Date().toISOString() })
              const temporaryPath = `${manifestPath}.${randomUUID()}.tmp`
              await writeFile(temporaryPath, JSON.stringify(manifest, null, 2), { flag: 'wx' })
              await rename(temporaryPath, manifestPath)
            } catch (error) {
              await rm(target, { force: true })
              throw error
            }
            sendJson(response, 201, { path: `${assetPrefix}/${category}/${name}`, name, category })
            return
          }

          const name = requestUrl.searchParams.get('name') ?? ''
          if (!/^[a-f0-9-]{36}-[a-zA-Z0-9._-]+\.(jpg|png)$/i.test(name)) {
            sendJson(response, 400, { error: 'Only images added through this local asset manager can be deleted.' })
            return
          }
          const manifest = await loadManifest(manifestPath)
          if (!manifest.some((asset) => asset.category === category && asset.name === name)) {
            sendJson(response, 403, { error: 'Original bundled images are protected from deletion by this tool.' })
            return
          }
          const target = path.resolve(imagesRoot, category, name)
          await rm(target)
          const nextManifest = manifest.filter((asset) => asset.category !== category || asset.name !== name)
          const temporaryPath = `${manifestPath}.${randomUUID()}.tmp`
          await writeFile(temporaryPath, JSON.stringify(nextManifest, null, 2), { flag: 'wx' })
          await rename(temporaryPath, manifestPath)
          sendJson(response, 200, { ok: true })
        })().catch((error: unknown) => {
          const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
            ? Number(error.statusCode)
            : 500
          sendJson(response, statusCode, {
            error: error instanceof Error ? error.message : 'Local image operation failed.',
          })
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [localAssetManager()],
})
