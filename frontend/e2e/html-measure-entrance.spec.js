import { test, expect } from '@playwright/test'
import { convertFidelityPage } from './convertFidelityPage.js'

test.use({ storageState: { cookies: [], origins: [] } })

test('conversion carries matching two-width entrances for a shown box and its staggered children', async ({ page }) => {
  const source = `<!doctype html><html lang="en"><title>Rock samples</title>
<style>
.record { animation: lift .35s ease both }
@keyframes lift { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
.delayed { animation-delay: .4s; animation-fill-mode: forwards }
.long-delay { animation-delay: 2.1s }
.veil { visibility: hidden }
.veil.open { visibility: visible }
.step.on { animation: lift .35s both }
.spins { animation-name: spin }
@keyframes spin { from { opacity: 0; transform: rotate(30deg) } to { opacity: 1; transform: none } }
@media (max-width:600px) { .responsive { animation-duration: 2s } }
.tray { background: #eed; padding: 8px }
.tray.open .layers > p { animation: settle .34s ease-out both; animation-delay:calc(var(--slot, 0)*120ms) }
@keyframes settle { from { opacity: .4; transform: translateY(7px) } to { opacity: 1; transform: translateY(0px) } }
</style>
<button>Inspect stones</button>
<p hidden class="record">Basalt</p><p hidden class="record delayed">Slate</p>
<p hidden class="record spins">Flint</p><p hidden class="record responsive">Quartz</p>
<p class="record">Granite</p><p hidden>Marble</p><p hidden class="record long-delay">Shale</p>
<p class="record veil">Jade</p><p class="step" hidden>Pyrite</p>
<section hidden class="tray"><div class="layers"><p>Topsoil</p><p style="--slot:1">Subsoil</p></div></section>
<div class="old-tray"><p class="record">Chalk</p></div>
<script>document.querySelector('button').onclick=()=>{
  document.querySelectorAll('[hidden]:not(.old-tray)').forEach(el=>{ el.hidden=false })
  document.querySelector('.veil').classList.add('open')
  document.querySelector('.tray').classList.add('open')
  document.querySelector('.old-tray').hidden=true
}</script></html>`
  const { schema } = await convertFidelityPage(page, source)
  const flatten = blocks => blocks.flatMap(block => [block, ...flatten(block.children || [])])
  const blocks = flatten(schema.pages[0].components)
  const find = text => blocks.find(block => block.props.text === text)
  const basalt = find('Basalt')
  expect(basalt.props.showEntrance).toEqual({ fromOpacity: 0, fromY: 8, durationMs: 350, easing: 'ease' })
  expect(basalt.props.shownBy).toHaveLength(1)
  const line = { fromOpacity: 0.4, fromY: 7, durationMs: 340, easing: 'ease-out' }
  expect(find('Topsoil').props.showEntrance).toEqual(line)
  expect(find('Subsoil').props.showEntrance).toEqual({ ...line, delayMs: 120 })
  expect(blocks.filter(block => block.props.showEntrance)).toHaveLength(3)
  for (const name of ['Slate', 'Flint', 'Quartz', 'Granite', 'Marble', 'Shale', 'Jade', 'Chalk', 'Pyrite']) {
    expect(find(name).props, name).not.toHaveProperty('showEntrance')
  }
})
