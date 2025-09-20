import React from 'react'
import type { Position } from '../types'

type Props = {
  mics: Position[]
  onChange: (mics: Position[]) => void
}

export default function MicEditor({ mics, onChange }: Props) {
  const updateMic = (idx: number, key: keyof Position, value: number) => {
    const next = mics.map((m, i) => (i === idx ? { ...m, [key]: value } : m))
    onChange(next)
  }

  const addMic = () => {
    onChange([...mics, { x: 0, y: 0, z: 0 }])
  }

  const removeMic = (idx: number) => {
    const next = mics.filter((_, i) => i !== idx)
    onChange(next)
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>麦克风列表</h3>
        <button onClick={addMic}>添加麦克风</button>
      </div>
      <div className="mic-list">
        {mics.length === 0 && <div className="hint">请添加至少一个麦克风</div>}
        {mics.map((m, idx) => (
          <div key={idx} className="mic-row">
            <span className="mic-label">#{idx + 1}</span>
            <label>
              x(m)
              <input
                type="number"
                step="0.001"
                value={m.x}
                onChange={(e) => updateMic(idx, 'x', parseFloat(e.target.value))}
              />
            </label>
            <label>
              y(m)
              <input
                type="number"
                step="0.001"
                value={m.y}
                onChange={(e) => updateMic(idx, 'y', parseFloat(e.target.value))}
              />
            </label>
            <label>
              z(m)
              <input
                type="number"
                step="0.001"
                value={m.z}
                onChange={(e) => updateMic(idx, 'z', parseFloat(e.target.value))}
              />
            </label>
            <button className="danger" onClick={() => removeMic(idx)}>
              删除
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

