import React, { useMemo } from 'react'
import Plot from '../plotly'

type Props = {
  azDeg: number[]
  elDeg: number[]
  responseDb: number[][] // [N_el][N_az]
  targetEl?: number // elevation slice to display, default 0 deg
  onReady?: (gd: any) => void
}

const PolarPlot = React.forwardRef<any, Props>(function PolarPlot({ azDeg, elDeg, responseDb, targetEl = 0, onReady }, ref) {
  const { theta, r /*, sliceEl*/ } = useMemo(() => {
    if (!azDeg?.length || !elDeg?.length || !responseDb?.length) {
      return { theta: [] as number[], r: [] as number[], sliceEl: targetEl }
    }
    const idx = elDeg.reduce((bestIdx, v, i) => (Math.abs(v - targetEl) < Math.abs(elDeg[bestIdx] - targetEl) ? i : bestIdx), 0)
    const row = responseDb[idx] || []
    return { theta: azDeg, r: row, sliceEl: elDeg[idx] }
  }, [azDeg, elDeg, responseDb, targetEl])

  return (
    <Plot
      ref={ref as any}
      data={[
        {
          type: 'scatterpolar',
          mode: 'lines',
          theta: theta,
          r: r,
          name: 'MVDR',
          line: { color: '#00d8ff', width: 2 },
          thetaunit: 'degrees',
          fill: 'toself',
          opacity: 0.8,
        } as any,
      ]}
      layout={{
        autosize: true,
        paper_bgcolor: '#0b0b0b',
        plot_bgcolor: '#0b0b0b',
        font: { color: '#e6e6e6' },
        margin: { l: 20, r: 20, t: 10, b: 10 },
        polar: {
          bgcolor: '#151515',
          radialaxis: {
            angle: 90,
            showgrid: true,
            gridcolor: '#333',
            tickfont: { color: '#aaa' },
            range: [-60, 0],
          },
          angularaxis: {
            linecolor: '#666',
            gridcolor: '#333',
            tickfont: { color: '#aaa' },
            direction: 'counterclockwise',
          },
        },
      }}
      config={{ displayModeBar: false, responsive: true }}
      className="plot-fill"
      onInitialized={(_f: any, gd: any) => { onReady?.(gd) }}
    />
  )
})

export default PolarPlot
