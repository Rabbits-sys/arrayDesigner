import React, { useEffect, useMemo, useState } from 'react'
import MicEditor from './components/MicEditor'
import Array3DView from './components/Array3DView'
import PolarPlot from './components/PolarPlot'
import Surface3DPlot from './components/Surface3DPlot'
import { fetchBeampattern } from './api'
import type { Position, BeampatternResponse } from './types'

const defaultArray = (): Position[] => {
  const M = 4
  const d = 0.1 // 10 cm spacing along y
  const start = -((M - 1) * d) / 2
  return Array.from({ length: M }, (_, i) => ({ x: 0, y: start + i * d, z: 0 }))
}

export default function App() {
  const [mics, setMics] = useState<Position[]>(defaultArray)
  const [freqHz, setFreqHz] = useState<number>(2000)
  const [lookAz, setLookAz] = useState<number>(0)
  const [lookEl, setLookEl] = useState<number>(0)
  const [azStep, setAzStep] = useState<number>(2)
  const [elStep, setElStep] = useState<number>(2)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resp, setResp] = useState<BeampatternResponse | null>(null)
  const [polarEl, setPolarEl] = useState<number>(0)

  const canCompute = useMemo(() => mics.length > 0 && freqHz > 0 && Number.isFinite(freqHz), [mics, freqHz])

  const compute = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchBeampattern({
        positions: mics,
        freq_hz: freqHz,
        look_az_deg: lookAz,
        look_el_deg: lookEl,
        az_start: 0,
        az_end: 360,
        az_step: Math.max(0.5, azStep),
        el_start: -90,
        el_end: 90,
        el_step: Math.max(0.5, elStep),
        diag_loading: 1e-3,
      })
      setResp(data)
      if (data.el_deg?.length) {
        const idx = data.el_deg.reduce((best, v, i) => (Math.abs(v - polarEl) < Math.abs(data.el_deg[best] - polarEl) ? i : best), 0)
        setPolarEl(data.el_deg[idx])
      }
    } catch (e: any) {
      setError(e?.message || '计算失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    compute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="page">
      <header className="header">
        <h1>麦克风阵列构型设计</h1>
        <div className="subtitle">React + Three.js + FastAPI (MVDR)</div>
      </header>

      <main className="content">
        <section className="left">
          <MicEditor mics={mics} onChange={setMics} />

          <div className="panel">
            <div className="panel-header"><h3>参数设置</h3></div>
            <div className="form-grid">
              <label>
                频率(Hz)
                <input type="number" value={freqHz} step={50} min={1} onChange={(e) => setFreqHz(parseFloat(e.target.value))} />
              </label>
              <label>
                指向角Az(°)
                <input type="number" value={lookAz} step={1} onChange={(e) => setLookAz(parseFloat(e.target.value))} />
              </label>
              <label>
                指向角El(°)
                <input type="number" value={lookEl} step={1} min={-90} max={90} onChange={(e) => setLookEl(parseFloat(e.target.value))} />
              </label>
              <label>
                Az步长(°)
                <input type="number" value={azStep} step={0.5} min={0.5} onChange={(e) => setAzStep(parseFloat(e.target.value))} />
              </label>
              <label>
                El步长(°)
                <input type="number" value={elStep} step={0.5} min={0.5} onChange={(e) => setElStep(parseFloat(e.target.value))} />
              </label>
            </div>
            <div className="actions">
              <button onClick={compute} disabled={!canCompute || loading}>
                {loading ? '计算中…' : '计算方向图'}
              </button>
              {error && <div className="error">{error}</div>}
            </div>
          </div>
        </section>

        <section className="right">
          <div className="right-top">
            <Array3DView mics={mics} onChange={setMics} />
          </div>

          <div className="right-bottom">
            <div className="panel">
              <div className="panel-header">
                <h3>二维方向图</h3>
                <div className="panel-actions">
                  <label>
                    选择El(°)
                    <input
                      type="range"
                      min={-90}
                      max={90}
                      step={1}
                      value={polarEl}
                      onChange={(e) => setPolarEl(parseFloat(e.target.value))}
                      style={{ width: 180 }}
                    />
                    <span className="pill">{polarEl.toFixed(0)}</span>
                  </label>
                  {/* Removed 2D 下载png button */}
                </div>
              </div>
              <PolarPlot azDeg={resp?.az_deg || []} elDeg={resp?.el_deg || []} responseDb={resp?.response_db || []} targetEl={polarEl} />
            </div>

            <Surface3DPlot azDeg={resp?.az_deg || []} elDeg={resp?.el_deg || []} responseDb={resp?.response_db || []} />
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>Powered by 浮力工业</span>
      </footer>
    </div>
  )
}
