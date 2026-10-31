import { useEffect, useState } from 'react'
import { Fire } from '../../components/Fire'

export function StepDone({ title, summary, nextStep, onAdvance }: {
  title: string
  summary: string
  nextStep: string
  onAdvance: () => void
}) {
  const [left, setLeft] = useState(3)
  const [staying, setStaying] = useState(false)

  useEffect(() => {
    if (staying) return
    if (left === 0) {
      onAdvance()
      return
    }
    const id = setTimeout(() => setLeft(left - 1), 1000)
    return () => clearTimeout(id)
  }, [left, staying, onAdvance])

  return (
    <div className="stage stage-done">
      <div className="fire-slot">
        <Fire />
      </div>
      <h2 className="title-done">{title}</h2>
      <p className="lede lede-lg">{summary}</p>
      <div className="timeup-next">
        {!staying && <span className="timeup-count tnum">{nextStep} starts in {left}</span>}
        {!staying && <button className="btn btn-pill" onClick={() => setStaying(true)}>Stay a moment</button>}
      </div>
    </div>
  )
}
