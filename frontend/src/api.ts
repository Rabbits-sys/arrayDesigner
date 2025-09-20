import axios from 'axios'
import type { BeampatternRequest, BeampatternResponse } from './types'

export const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || 'http://127.0.0.1:8000'

export async function fetchBeampattern(payload: BeampatternRequest): Promise<BeampatternResponse> {
  const { data } = await axios.post<BeampatternResponse>(`${BASE_URL}/api/mvdr/beampattern`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  })
  return data
}

export async function fetchHealth(): Promise<'ok' | 'error'> {
  try {
    const { data } = await axios.get<{ status: string }>(`${BASE_URL}/api/health`, { timeout: 5000 })
    return data?.status === 'ok' ? 'ok' : 'error'
  } catch {
    return 'error'
  }
}
