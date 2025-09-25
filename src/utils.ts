import type {RhythmJSON} from './rhythm/types'
import {parseRhythm} from './rhythm/parser'

// Utility helpers used across the app

/**
 * Normalize a rhythm name or filename to a lowercase base name without extension
 * Also strips a few known accents used in our rhythm names.
 */
export function toBaseName(name: string): string {
  const n = name.replace(/\.json$/i, '')
  return n.toLowerCase().replace(/é/g, 'e').replace(/ó/g, 'o')
}

// Initial state utilities

export type InstrumentSetting = {vol: number; mute: boolean}
export type InstrumentSettingInput = {vol?: number; mute?: boolean}

export function deriveInitialState(json: RhythmJSON): {
  tempo?: number
  mixer: Record<string, InstrumentSetting>
} {
  const mixerInput = json.initial_state?.mixer ?? {}
  const mixer: Record<string, InstrumentSetting> = {}
  for (const [inst, rawVal] of Object.entries(mixerInput as Record<string, unknown>)) {
    let vol = 1.0
    let mute = false
    if (rawVal && typeof rawVal === 'object') {
      const obj = rawVal as InstrumentSettingInput
      if (typeof obj.vol === 'number') vol = obj.vol
      if (typeof obj.mute === 'boolean') mute = obj.mute
    }
    mixer[inst] = {vol, mute}
  }
  const tempo =
    typeof json.initial_state?.tempo === 'number' ? json.initial_state?.tempo : undefined
  return {tempo, mixer}
}

// High-level loader that fetches, parses, and derives initial state in one step
export async function loadRhythm(file: string): Promise<{
  raw: RhythmJSON
  parsed: ReturnType<typeof parseRhythm>
  initial: ReturnType<typeof deriveInitialState>
}> {
  const res = await fetch(`/rhythms/${file}`)
  if (!res.ok) throw new Error(`Failed to load rhythm: ${res.status}`)
  const json = (await res.json()) as RhythmJSON
  const parsed = parseRhythm(json)
  const initial = deriveInitialState(json)
  return {raw: json, parsed, initial}
}
