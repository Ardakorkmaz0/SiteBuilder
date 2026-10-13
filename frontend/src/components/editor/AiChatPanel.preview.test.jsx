// An AI run in Components mode draws its changes on the canvas while it works,
// then takes them off again and asks: accept or reject. Until the answer, what
// the canvas shows is a proposal, and the editor has to know that — it used to
// look like any other unsaved edit, and the automatic save wrote it to the
// server (and to the live site of a published one) before anyone had agreed.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

const run = vi.hoisted(() => ({ during: null, finish: null }))

vi.mock('../../utils/aiAssistant.js', async (importOriginal) => {
  const real = await importOriginal()
  return {
    ...real,
    runAiPrompt: vi.fn(() => new Promise((resolve, reject) => {
      run.during?.()
      run.finish = { resolve, reject }
    })),
  }
})

import AiChatPanel from './AiChatPanel.jsx'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import { useEditorStore } from '../../store/editorStore.js'

const s = () => useEditorStore.getState()
const headingText = (schema = s().schema) => schema.pages[0].components[0].props.text

function openPanel() {
  render(
    <UiThemeProvider>
      <LanguageProvider>
        <AiChatPanel open onClose={() => {}} />
      </LanguageProvider>
    </UiThemeProvider>,
  )
}

async function ask(prompt) {
  const box = document.querySelector('textarea')
  fireEvent.change(box, { target: { value: prompt } })
  await act(async () => { fireEvent.keyDown(box, { key: 'Enter' }) })
}

beforeEach(() => {
  localStorage.clear()
  run.during = null
  run.finish = null
  s().loadSchema({
    theme: {},
    pages: [{
      id: 'p1',
      name: 'Home',
      components: [{ id: 'h1', type: 'heading', props: { text: 'My own heading' }, styles: {}, layout: { x: 20, y: 20, w: 400, h: 60 } }],
    }],
  })
  // One real edit, so there is an undo step whose stamp can go missing.
  s().updateProps('h1', { text: 'My edited heading' })
})

describe('an AI proposal drawn on the canvas', () => {
  it('is marked as a preview while the run lasts, and the design comes back untouched', async () => {
    let seen = null
    run.during = () => {
      // The model's tool calls land on the live store, as they really do.
      s().updateProps('h1', { text: 'Written by the model' })
      seen = { live: headingText(), base: s().previewBase && headingText(s().previewBase) }
    }
    openPanel()
    await ask('Rewrite the heading')
    await waitFor(() => expect(run.finish).not.toBeNull())

    expect(seen).toEqual({ live: 'Written by the model', base: 'My edited heading' })
    expect(s().previewBase).not.toBeNull()

    await act(async () => {
      run.finish.resolve({ text: 'Done.', toolCallCount: 1, calls: [{ name: 'updateProps', args: {}, result: { ok: true } }], say: [] })
    })

    expect(headingText()).toBe('My edited heading')
    expect(s().previewBase).toBeNull()
    // Every undo step still has its stamp, and only its own.
    expect(s().pastAt).toHaveLength(s().past.length)
    expect(screen.getByText('Accept')).toBeTruthy()
  })

  const finishWith = (text) => act(async () => {
    run.finish.resolve({ text: 'Done.', toolCallCount: 1, calls: [{ name: 'updateProps', args: {}, result: { ok: true } }], say: [] })
    void text
  })

  it('is applied when it is accepted as it was offered', async () => {
    run.during = () => s().updateProps('h1', { text: 'Written by the model' })
    openPanel()
    await ask('Rewrite the heading')
    await waitFor(() => expect(run.finish).not.toBeNull())
    await finishWith()

    await act(async () => { fireEvent.click(screen.getByText('Accept')) })

    expect(headingText()).toBe('Written by the model')
  })

  // The proposal holds the whole design as it was when the run began. Accepted
  // over a page edited in the meantime, it took those edits back without a word.
  it('is not applied over edits made while it was waiting', async () => {
    run.during = () => s().updateProps('h1', { text: 'Written by the model' })
    openPanel()
    await ask('Rewrite the heading')
    await waitFor(() => expect(run.finish).not.toBeNull())
    await finishWith()
    act(() => { s().updateProps('h1', { text: 'Edited by hand meanwhile' }) })

    await act(async () => { fireEvent.click(screen.getByText('Accept')) })

    expect(headingText()).toBe('Edited by hand meanwhile')
    expect(screen.getByText(/The page has changed since this proposal was prepared/)).toBeTruthy()
  })

  it('is taken off the canvas when the request fails, too', async () => {
    run.during = () => s().updateProps('h1', { text: 'Half a change' })
    openPanel()
    await ask('Rewrite the heading')
    await waitFor(() => expect(run.finish).not.toBeNull())

    await act(async () => { run.finish.reject(new Error('The provider is down')) })

    expect(headingText()).toBe('My edited heading')
    expect(s().previewBase).toBeNull()
    expect(s().pastAt).toHaveLength(s().past.length)
  })
})
