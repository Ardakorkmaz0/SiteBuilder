import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import client from './client.js'
import {
  getPublicSite,
  getSite,
  sendPageLive,
  updateSite,
} from './sites.js'
import { restoreVersion } from './versions.js'

const origAdapter = client.defaults.adapter

function makeSite(revision = 5) {
  return {
    id: 20,
    title: 'Heavy Project',
    slug: 'heavy-project',
    revision,
    published: false,
    html: '<h1>Home</h1>',
    schema: {
      theme: { primaryColor: '#0071e3' },
      customCss: '',
      customJs: '',
      fontFaces: "@font-face { font-family: 'Custom'; src: url(data:font/woff2;base64," + 'F'.repeat(16000) + '); }',
      pages: [
        {
          id: 'p_home',
          name: 'Home',
          mode: 'html',
          html: '<h1>Home</h1>',
          htmlBackup: '',
          components: [],
        },
        {
          id: 'p_canvas',
          name: 'Canvas',
          mode: 'empty',
          html: '',
          htmlBackup: '<div>' + 'B'.repeat(12000) + '</div>',
          components: [
            { id: 'c_heavy', type: 'image', props: { src: 'data:image/png;base64,' + 'A'.repeat(12000) }, styles: {}, layout: { x: 0, y: 0, w: 400, h: 300 } },
            { id: 'c_text', type: 'text', props: { text: 'Original line' }, styles: {}, layout: { x: 0, y: 320, w: 400, h: 40 } },
          ],
        },
      ],
    },
  }
}

beforeEach(() => {
  client.defaults.adapter = origAdapter
})

afterEach(() => {
  client.defaults.adapter = origAdapter
})

describe('sites API delta saves and draft preview', () => {
  it('sends a compact schema_patch with X-Site-Omit-Content on /sites/<id>/ without query string', async () => {
    const requests = []
    const loaded = makeSite(5)
    client.defaults.adapter = async (config) => {
      requests.push({
        method: config.method,
        url: config.url,
        headers: config.headers,
        body: config.data ? JSON.parse(config.data) : null,
      })
      if (config.method === 'get') {
        return { data: loaded, status: 200, statusText: 'OK', headers: {}, config }
      }
      return {
        data: { id: 20, title: 'Heavy Project', slug: 'heavy-project', revision: 6, published: false },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
    }

    await getSite(20)
    const editedSchema = {
      ...loaded.schema,
      pages: [
        loaded.schema.pages[0],
        {
          ...loaded.schema.pages[1],
          components: [
            loaded.schema.pages[1].components[0],
            { ...loaded.schema.pages[1].components[1], props: { text: 'Edited line' } },
          ],
        },
      ],
    }

    const res = await updateSite(20, {
      title: 'Heavy Project',
      schema: editedSchema,
      html: '<h1>Home</h1>',
      published: false,
      base_revision: 5,
    })

    expect(res.revision).toBe(6)
    expect(requests).toHaveLength(2)
    const saveReq = requests[1]
    expect(saveReq.method).toBe('patch')
    expect(saveReq.url).toBe('/sites/20/')
    expect(saveReq.headers['X-Site-Omit-Content']).toBe('1')
    expect(saveReq.body.schema).toBeUndefined()
    expect(saveReq.body.html).toBeUndefined()
    expect(saveReq.body.schema_patch.fontFaces).toBeUndefined()
    expect(saveReq.body.schema_patch.pages[0]).toEqual({ op: 'keep', id: 'p_home' })
    expect(saveReq.body.schema_patch.pages[1].op).toBe('patch')
    expect(saveReq.body.schema_patch.pages[1].htmlBackup).toBeUndefined()
    expect(saveReq.body.schema_patch.pages[1].components[0]).toEqual({ keep: 'c_heavy' })
    expect(saveReq.body.schema_patch.pages[1].components[1].set.props.text).toBe('Edited line')
  })

  it('tracks revision bumps from live-page actions and version restores, and falls back to full PUT on forced or small saves', async () => {
    const requests = []
    const loaded = makeSite(10)
    client.defaults.adapter = async (config) => {
      const body = config.data ? JSON.parse(config.data) : null
      requests.push({ method: config.method, url: config.url, headers: config.headers, body })
      if (config.url === '/sites/20/' && config.method === 'get') {
        return { data: loaded, status: 200, statusText: 'OK', headers: {}, config }
      }
      if (config.url === '/sites/20/page-live/') {
        return { data: { id: 20, revision: 11, published: true }, status: 200, statusText: 'OK', headers: {}, config }
      }
      if (config.url.includes('/restore/')) {
        return { data: makeSite(15), status: 200, statusText: 'OK', headers: {}, config }
      }
      return { data: { id: 20, revision: (body?.base_revision ?? 20) + 1, published: true }, status: 200, statusText: 'OK', headers: {}, config }
    }

    await getSite(20)
    await sendPageLive(20, { pageId: 'p_home', path: '', title: 'Home', html: '<h1>Home</h1>' }, 10)

    await updateSite(20, {
      title: 'Heavy Project',
      schema: loaded.schema,
      html: '<h1>Home</h1>',
      published: true,
      base_revision: 11,
    })
    expect(requests[2].method).toBe('patch')
    expect(requests[2].body.schema_patch.pages).toEqual([
      { op: 'keep', id: 'p_home' },
      { op: 'keep', id: 'p_canvas' },
    ])

    // Forced conflict overwrite omits base_revision and sends full PUT on /sites/20/.
    await updateSite(20, {
      title: 'Heavy Project',
      schema: loaded.schema,
      html: '<h1>Home</h1>',
    })
    expect(requests[3].method).toBe('put')
    expect(requests[3].url).toBe('/sites/20/')
    expect(requests[3].headers['X-Site-Omit-Content']).toBe('1')
    expect(requests[3].body.schema).toBeDefined()

    // Version restore refreshes the synced revision and schema.
    const restored = await restoreVersion(20, 3)
    await updateSite(20, {
      title: 'Heavy Project',
      schema: restored.schema,
      html: restored.html,
      published: false,
      base_revision: 15,
    })
    expect(requests[5].method).toBe('patch')
  })

  it('requests draft=1 on getPublicSite only when draft preview is requested', async () => {
    const urls = []
    client.defaults.adapter = async (config) => {
      urls.push(config.url)
      return { data: { slug: 'demo' }, status: 200, statusText: 'OK', headers: {}, config }
    }
    await getPublicSite('demo')
    await getPublicSite('demo', { draft: true })
    expect(urls).toEqual(['/public/sites/demo/', '/public/sites/demo/?draft=1'])
  })
})
