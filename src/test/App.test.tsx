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
    prefetchSamples: vi.fn(() => Promise.resolve()),
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
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
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

  it('should prefetch samples on initial render', async () => {
    const {prefetchSamples} = await import('../audio/samples')
    vi.mocked(prefetchSamples).mockResolvedValue(undefined)

    render(<App />)

    await waitFor(
      () => {
        expect(prefetchSamples).toHaveBeenCalled()
      },
      {timeout: 2000},
    )
  })

  it('should show spinner while prefetching on initial render', async () => {
    const {prefetchSamples} = await import('../audio/samples')
    vi.mocked(prefetchSamples).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100)),
    )

    render(<App />)

    await waitFor(() => {
      const startButton = screen.getByRole('button', {name: /start/i})
      expect(startButton).toContainHTML('svg')
      expect(startButton).toBeDisabled()
    })
  })

  it('should enable Start button on initial render (no preloading)', async () => {
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

  it('should not call preloadSamples on initial render', async () => {
    const {preloadSamples} = await import('../audio/samples')
    vi.mocked(preloadSamples).mockResolvedValue(undefined)

    render(<App />)

    await waitFor(
      () => {
        expect(preloadSamples).not.toHaveBeenCalled()
      },
      {timeout: 2000},
    )
  })

  it('should decode samples when user clicks Start', async () => {
    const {preloadSamples} = await import('../audio/samples')
    vi.mocked(preloadSamples).mockResolvedValue(undefined)

    render(<App />)

    // Wait for initial render
    await waitFor(
      () => {
        const startButton = screen.getByRole('button', {name: /start/i})
        expect(startButton).not.toBeDisabled()
      },
      {timeout: 2000},
    )

    // Click start
    const startButton = screen.getByRole('button', {name: /start/i})
    await userEvent.click(startButton)

    await waitFor(
      () => {
        expect(preloadSamples).toHaveBeenCalled()
      },
      {timeout: 2000},
    )
  })

  it('should show spinner and disable button while decoding on Start click', async () => {
    const {preloadSamples} = await import('../audio/samples')
    vi.mocked(preloadSamples).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100)),
    )

    render(<App />)

    // Wait for initial render
    await waitFor(
      () => {
        const startButton = screen.getByRole('button', {name: /start/i})
        expect(startButton).not.toBeDisabled()
      },
      {timeout: 2000},
    )

    // Click start
    const startButton = screen.getByRole('button', {name: /start/i})
    await userEvent.click(startButton)

    // Should show spinner and be disabled while loading
    await waitFor(() => {
      expect(startButton).toContainHTML('svg')
      expect(startButton).toBeDisabled()
    })
  })

  it('should prefetch samples when user changes rhythm', async () => {
    const {prefetchSamples} = await import('../audio/samples')
    vi.mocked(prefetchSamples).mockResolvedValue(undefined)

    render(<App />)

    // Wait for initial render
    await waitFor(
      () => {
        const startButton = screen.getByRole('button', {name: /start/i})
        expect(startButton).not.toBeDisabled()
      },
      {timeout: 2000},
    )

    // Clear the initial call
    vi.clearAllMocks()

    // Select a different rhythm (user gesture)
    const rhythmSelect = screen.getByRole('combobox')
    await userEvent.selectOptions(rhythmSelect, 'guaguanco.json')

    await waitFor(
      () => {
        expect(prefetchSamples).toHaveBeenCalled()
      },
      {timeout: 2000},
    )
  })
})
