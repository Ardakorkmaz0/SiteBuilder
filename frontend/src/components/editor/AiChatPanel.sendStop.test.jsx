// The chat's Send button sends (it used to hand the click event to send(),
// which then failed on it, so only the Enter key worked), a running request
// can be stopped without anything landing, and a prompt the editor wrote
// itself reaches the model marked as such, for the language rule.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('../../utils/aiAssistant.js', async (importOriginal) => {
  const real = await importOriginal()
  return {
    ...real,
    runAiPrompt: vi.fn((prompt, { signal } = {}) => new Promise((resolve, reject) => {
      signal?.addEventListener('abort', () => reject(Object.assign(new Error('Stopped.'), { name: 'AbortError' })))
    })),
  }
})

import AiChatPanel from './AiChatPanel.jsx'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import { runAiPrompt } from '../../utils/aiAssistant.js'
import { OPEN_POLICY, setAiPolicy, useAiPolicyStore } from '../../utils/aiPolicy.js'
import { useEditorStore } from '../../store/editorStore.js'

function openPanel() {
  render(
    <UiThemeProvider>
      <LanguageProvider>
        <AiChatPanel open onClose={() => {}} />
      </LanguageProvider>
    </UiThemeProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_ai_provider', 'groq')
  localStorage.setItem('pwb_groq_key', 'test-key')
  useAiPolicyStore.setState({ policy: OPEN_POLICY })
  runAiPrompt.mockClear()
  useEditorStore.getState().loadSchema({ theme: {}, pages: [{ id: 'p1', name: 'Home', components: [] }] })
})

describe('sending and stopping', () => {
  it('sends with the button, and stops with nothing applied', async () => {
    openPanel()
    fireEvent.change(document.querySelector('textarea'), { target: { value: 'add a heading' } })

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Send' })) })

    expect(runAiPrompt).toHaveBeenCalledTimes(1)
    expect(runAiPrompt.mock.calls[0][0]).toBe('add a heading')
    const { signal } = runAiPrompt.mock.calls[0][1]

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Stop' })) })

    expect(signal.aborted).toBe(true)
    await waitFor(() => expect(screen.getByText('Stopped. Nothing from this request was applied.')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Send' })).toBeTruthy()
    expect(useEditorStore.getState().schema.pages[0].components).toHaveLength(0)
  })

  it('marks a suggestion as the editor\'s own words for the model, not in the chat', async () => {
    openPanel()
    const card = screen.getByText('Suggested for this page').parentElement.querySelector('button')
    expect(card).toBeTruthy()

    await act(async () => { fireEvent.click(card) })

    const sent = runAiPrompt.mock.calls[0][0]
    expect(sent.startsWith('[editor action] ')).toBe(true)
    expect(screen.queryByText(/\[editor action\]/)).toBeNull()
  })
})

describe('the server\'s notice', () => {
  it('is shown at the top of the panel', () => {
    setAiPolicy({ enabled: true, providers: ['groq'], notice: 'Gemini bugün yavaş.' })
    openPanel()
    expect(screen.getByRole('status').textContent).toBe('Gemini bugün yavaş.')
    useAiPolicyStore.setState({ policy: OPEN_POLICY })
  })
})
