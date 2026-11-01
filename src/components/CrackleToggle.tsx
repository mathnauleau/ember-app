import { useMicListening } from '../audio/useCrackle'
import { updateSettings, useProgress } from '../store/progress'
import { Volume, VolumeOff } from './icons'

export function CrackleToggle() {
  const { sound } = useProgress().settings
  const listening = useMicListening()
  return (
    <button
      className="btn btn-pill"
      aria-label="Toggle crackle sound"
      aria-pressed={sound}
      onClick={() => updateSettings({ sound: !sound })}
    >
      {!sound ? <VolumeOff color="var(--cream-500)" /> : <Volume color={listening ? 'var(--cream-500)' : 'var(--ember-500)'} />}
      Crackle {!sound ? 'off' : listening ? 'paused' : 'on'}
    </button>
  )
}
