import React, { useMemo, useRef } from 'react'
import Plot from '../plotly'
import { Plotly } from '../plotly'

type Props = {
  azDeg: number[]
  elDeg: number[]
  responseDb: number[][]
}

export default function Surface3DPlot({ azDeg, elDeg, responseDb }: Props) {
  const az = azDeg
  const el = elDeg
  const db = responseDb // shape [N_el][N_az]

  const gdRef = useRef<any>(null)

  const hasData = useMemo(() => (az?.length ?? 0) > 0 && (el?.length ?? 0) > 0 && (db?.length ?? 0) > 0, [az, el, db])

  // Build 3D polar surface coordinates
  const { X, Y, Z, C } = useMemo(() => {
    if (!hasData) return { X: [], Y: [], Z: [], C: [] as number[][] }

    const azRad = az.map((d) => (d * Math.PI) / 180)
    const elRad = el.map((d) => (d * Math.PI) / 180)

    // radius in linear amplitude, normalized to [0,1]
    const N_el = elRad.length
    const N_az = azRad.length
    const X: number[][] = Array.from({ length: N_el }, () => Array(N_az).fill(0))
    const Y: number[][] = Array.from({ length: N_el }, () => Array(N_az).fill(0))
    const Z: number[][] = Array.from({ length: N_el }, () => Array(N_az).fill(0))
    const C: number[][] = Array.from({ length: N_el }, () => Array(N_az).fill(0))

    for (let i = 0; i < N_el; i++) {
      const cei = Math.cos(elRad[i])
      const sei = Math.sin(elRad[i])
      for (let j = 0; j < N_az; j++) {
        const dbVal = db[i]?.[j] ?? -80
        // Convert dB to linear amplitude (reference 0 dB -> 1)
        const rLin = Math.max(0, Math.pow(10, dbVal / 20))
        // Map to Cartesian; Z-up, az from x-axis CCW in XY plane, el from XY plane
        const x = rLin * cei * Math.cos(azRad[j])
        const y = rLin * cei * Math.sin(azRad[j])
        const z = rLin * sei
        X[i][j] = x
        Y[i][j] = y
        Z[i][j] = z
        C[i][j] = dbVal
      }
    }

    return { X, Y, Z, C }
  }, [hasData, az, el, db])

  const resetView = () => {
    const gd = gdRef.current
    if (!gd) return
    Plotly.relayout(gd, {
      // Only reset camera orientation; do not change axis ranges
      'scene.camera': { eye: { x: 1.6, y: 1.2, z: 1.2 }, up: { x: 0, y: 0, z: 1 } },
    })
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>三维方向图</h3>
        <div className="panel-actions">
          <button onClick={resetView}>复位视角</button>
        </div>
      </div>
      <Plot
        data={hasData ? ([{
          type: 'surface',
          x: X,
          y: Y,
          z: Z,
          surfacecolor: C,
          colorscale: 'Viridis',
          cmin: -60,
          cmax: 0,
          showscale: true,
          colorbar: { title: 'dB', titleside: 'right' },
          contours: {
            z: { show: false },
          },
          opacity: 1.0,
        } as any]) : []}
        layout={{
          autosize: true,
          paper_bgcolor: '#0b0b0b',
          plot_bgcolor: '#0b0b0b',
          font: { color: '#e6e6e6' },
          margin: { l: 10, r: 10, t: 10, b: 10 },
          scene: {
            bgcolor: '#0b0b0b',
            xaxis: { title: 'x', gridcolor: '#333', zerolinecolor: '#444', range: [-1, 1] },
            yaxis: { title: 'y', gridcolor: '#333', zerolinecolor: '#444', range: [-1, 1] },
            zaxis: { title: 'z', gridcolor: '#333', zerolinecolor: '#444', range: [-1, 1] },
            aspectmode: 'cube',
            camera: { eye: { x: 1.6, y: 1.2, z: 1.2 }, up: { x: 0, y: 0, z: 1 } },
          },
        }}
        config={{ displayModeBar: false, responsive: true }}
        className="plot-fill"
        onInitialized={(_f: any, gd: any) => { gdRef.current = gd }}
      />
    </div>
  )
}
