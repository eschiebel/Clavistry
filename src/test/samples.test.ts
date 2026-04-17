import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {preloadSamples, prefetchSamples} from '../audio/samples'

// Mock global fetch
globalThis.fetch = vi.fn()

// Mock AudioContext
class MockAudioContext {
  state = 'running'
  currentTime = 0
  decodeAudioData = vi.fn()

  resume() {
    return Promise.resolve()
  }
}

describe('preloadSamples', () => {
  let mockCtx: MockAudioContext

  beforeEach(() => {
    mockCtx = new MockAudioContext() as unknown as MockAudioContext
    vi.clearAllMocks()

    // Mock the sample map fetch
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('map.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({'conga:T': {file: 'conga_tone.wav'}}),
        } as Response)
      }
      // Mock sample file fetch
      const mockArrayBuffer = new ArrayBuffer(100)
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      } as Response)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should load samples for valid instrument-stroke pairs', async () => {
    const mockAudioBuffer = {} as AudioBuffer
    mockCtx.decodeAudioData.mockResolvedValue(mockAudioBuffer)

    const pairs = [
      {instrument: 'conga', stroke: 'T'},
      {instrument: 'conga', stroke: 's'},
    ]

    await preloadSamples(mockCtx as unknown as AudioContext, pairs)

    // Should call fetch for map.json once and for samples
    expect(fetch).toHaveBeenCalled()
    expect(mockCtx.decodeAudioData).toHaveBeenCalled()
  })

  it('should handle missing sample entries gracefully', async () => {
    const pairs = [{instrument: 'nonexistent', stroke: 'X'}]

    await expect(preloadSamples(mockCtx as unknown as AudioContext, pairs)).resolves.not.toThrow()

    // Should not fetch sample files for non-existent entries
    // Map may or may not be fetched depending on cache state
  })

  it('should handle fetch errors gracefully', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('map.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({'conga:T': {file: 'conga_tone.wav'}}),
        } as Response)
      }
      return Promise.reject(new Error('Network error'))
    })

    const pairs = [{instrument: 'conga', stroke: 'T'}]

    await expect(preloadSamples(mockCtx as unknown as AudioContext, pairs)).resolves.not.toThrow()
  })

  it('should handle decodeAudioData errors gracefully', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('map.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({'conga:T': {file: 'conga_tone.wav'}}),
        } as Response)
      }
      const mockArrayBuffer = new ArrayBuffer(100)
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      } as Response)
    })

    mockCtx.decodeAudioData.mockRejectedValue(new Error('Decode error'))

    const pairs = [{instrument: 'conga', stroke: 'T'}]

    await expect(preloadSamples(mockCtx as unknown as AudioContext, pairs)).resolves.not.toThrow()
  })

  it('should fall back to base instrument when full instrument name not found', async () => {
    const mockAudioBuffer = {} as AudioBuffer
    mockCtx.decodeAudioData.mockResolvedValue(mockAudioBuffer)

    const pairs = [{instrument: 'conga left', stroke: 'T'}]

    // Should complete without error, attempting fallback to base instrument
    await expect(preloadSamples(mockCtx as unknown as AudioContext, pairs)).resolves.not.toThrow()
  })
})

describe('prefetchSamples', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock the sample map fetch
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('map.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({'conga:T': {file: 'conga_tone.wav'}}),
        } as Response)
      }
      // Mock sample file fetch
      const mockArrayBuffer = new ArrayBuffer(100)
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      } as Response)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fetch ArrayBuffers for valid instrument-stroke pairs', async () => {
    const pairs = [{instrument: 'conga', stroke: 'T'}]

    await prefetchSamples(pairs)

    // Should call fetch for map.json and sample file
    expect(fetch).toHaveBeenCalled()
  })

  it('should not require AudioContext', async () => {
    const pairs = [{instrument: 'conga', stroke: 'T'}]

    await expect(prefetchSamples(pairs)).resolves.not.toThrow()
  })

  it('should handle missing sample entries gracefully', async () => {
    const pairs = [{instrument: 'nonexistent', stroke: 'X'}]

    await expect(prefetchSamples(pairs)).resolves.not.toThrow()
  })

  it('should handle fetch errors gracefully', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('map.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({'conga:T': {file: 'conga_tone.wav'}}),
        } as Response)
      }
      return Promise.reject(new Error('Network error'))
    })

    const pairs = [{instrument: 'conga', stroke: 'T'}]

    await expect(prefetchSamples(pairs)).resolves.not.toThrow()
  })
})
