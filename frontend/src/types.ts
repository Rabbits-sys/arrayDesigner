export type Position = { x: number; y: number; z: number }

export type BeampatternResponse = {
  az_deg: number[]
  el_deg: number[]
  response_db: number[][] // shape [N_el][N_az]
}

export type BeampatternRequest = {
  positions: Position[]
  freq_hz: number
  look_az_deg: number
  look_el_deg: number
  az_start?: number
  az_end?: number
  az_step?: number
  el_start?: number
  el_end?: number
  el_step?: number
  c?: number
  diag_loading?: number
}

