import { useEffect, useState } from 'react'
import { Hourglass } from '../../components/icons'

const COUNTDOWN_S = 3

export function TimeUp({ title, summary, nextStep, onAdvance, onExtend }: {
  title: string
  summary: string
  nextStep: string
  onAdvance: () => void
  onExtend: () => void
}) {
  const [left, setLeft] = useState(COUNTDOWN_S)

  useEffect(() => {
    if (left === 0) {
      onAdvance()
      return
    }
    const id = setTimeout(() => setLeft(left - 1), 1000)
    return () => clearTimeout(id)
  }, [left, onAdvance])

  return (
    <div className="stage stage-tight">
      <div className="timeup-badge">
        <Hourglass size={52} color="var(--ember-500)" weight={1.4} />
      </div>
      <span className="kicker">Time for this step</span>
      <h1 className="title-display">{title}</h1>
      <p className="lede lede-lg">{summary}</p>
      <div className="timeup-next">
        <span className="timeup-count tnum">{nextStep} starts in {left}</span>
        <button className="btn btn-pill" onClick={onExtend}>One more minute</button>
      </div>
    </div>
  )
}
