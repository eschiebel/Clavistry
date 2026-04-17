import {describe, it, expect, vi, beforeEach} from 'vitest'
import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

// Mock the rhythm loading
vi.mock('../utils', async () => {
  const actual = await vi.importActual<typeof import('../utils')>('../utils')
  return {
    ...actual,
    loadRhythm: vi.fn(() =>
      Promise.resolve({
        parsed: {
          name: 'Test Rhythm',
          timeSignature: {numerator: 4, denominator: 4},
          pulsesPerMeasure: 4,
          parts: [
            {
              instrument: 'conga',
              baseInstrument: 'conga',
              variantIndex: 0,
              raw: 'T...',
              tokens: ['T', '.', '.', '.'],
            },
          ],
        },
        initial: null,
        raw: {name: 'Test Rhythm', time_signature: '4/4', parts: {}},
      }),
    ),
  }
})

// Mock the samples module
vi.mock('../audio/samples', async () => {
  const actual = await vi.importActual<typeof import('../audio/samples')>('../audio/samples')
  return {
    ...actual,
    preloadSamples: vi.fn(() => Promise.resolve()),
  }
})

// Mock AudioContext
class MockAudioContext {
  state = 'running'
  currentTime = 0

  resume() {
    return Promise.resolve()
  }

  createGain() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: {value: 1},
    }
  }

  createDynamicsCompressor() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      threshold: {value: -18},
      knee: {value: 24},
      ratio: {value: 4},
      attack: {value: 0.01},
      release: {value: 0.2},
    }
  }

  createOscillator() {
    return {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: {value: 440},
      type: 'sine',
    }
  }

  close() {
    return Promise.resolve()
  }
}

globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext

describe('App component - samplesLoaded behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should disable Start button when samples are loading', async () => {
    const {preloadSamples} = await import('../audio/samples')
    vi.mocked(preloadSamples).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100)),
    )

    render(<App />)

    const startButton = screen.getByRole('button', {name: /start/i})
    await waitFor(() => {
      expect(startButton).toBeDisabled()
    })
  })

  it('should enable Start button after samples are loaded', async () => {
    const {preloadSamples} = await import('../audio/samples')
    vi.mocked(preloadSamples).mockResolvedValue(undefined)

    render(<App />)

    await waitFor(
      () => {
        const startButton = screen.getByRole('button', {name: /start/i})
        expect(startButton).not.toBeDisabled()
      },
      {timeout: 2000},
    )
  })

  it('should show spinner in Start button while loading', async () => {
    const {preloadSamples} = await import('../audio/samples')
    vi.mocked(preloadSamples).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100)),
    )

    render(<App />)

    await waitFor(() => {
      const startButton = screen.getByRole('button', {name: /start/i})
      expect(startButton).toContainHTML('svg')
    })
  })

  it('should hide spinner after samples are loaded', async () => {
    const {preloadSamples} = await import('../audio/samples')
    vi.mocked(preloadSamples).mockResolvedValue(undefined)

    render(<App />)

    await waitFor(
      () => {
        const startButton = screen.getByRole('button', {name: /start/i})
        expect(startButton).not.toContainHTML('svg')
      },
      {timeout: 2000},
    )
  })

  it('should call preloadSamples with correct instrument-stroke pairs', async () => {
    const {preloadSamples} = await import('../audio/samples')
    vi.mocked(preloadSamples).mockResolvedValue(undefined)

    render(<App />)

    await waitFor(
      () => {
        expect(preloadSamples).toHaveBeenCalled()
        const call = vi.mocked(preloadSamples).mock.calls[0]
        expect(call[1]).toEqual(
          expect.arrayContaining([expect.objectContaining({instrument: 'conga', stroke: 'T'})]),
        )
      },
      {timeout: 2000},
    )
  })

  it('should show spinner when user changes rhythm selection', async () => {
    const {preloadSamples} = await import('../audio/samples')
    vi.mocked(preloadSamples).mockResolvedValue(undefined)

    render(<App />)

    // Wait for initial load to complete
    await waitFor(
      () => {
        const startButton = screen.getByRole('button', {name: /start/i})
        expect(startButton).not.toBeDisabled()
      },
      {timeout: 2000},
    )

    // Mock a slower preload for rhythm change
    vi.mocked(preloadSamples).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100)),
    )

    // Select a different rhythm
    const rhythmSelect = screen.getByRole('combobox')
    await userEvent.selectOptions(rhythmSelect, 'guaguanco.json')

    // Spinner should appear while loading
    await waitFor(() => {
      const startButton = screen.getByRole('button', {name: /start/i})
      expect(startButton).toContainHTML('svg')
    })
  })
})
