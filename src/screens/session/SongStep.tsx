import { useMemo, useState } from 'react'
import { useSong } from '../../audio/useSong'
import { useStepTimer } from '../../audio/useStepTimer'
import chords from '../../data/chords.json'
import songs from '../../data/songs.json'
import { currentSong, learnedChords, missingChords, songChords } from '../../engine/curriculum'
import { setCurrentSong, useProgress } from '../../store/progress'
import type { DrillChord } from '../ChordDrill'
import { SessionShell } from '../SessionShell'
import { Song, SongList } from '../Song'
import { finishedLogs, type StepContext } from './context'
import { MicPermission } from './MicPermission'
import { TimeUp } from './TimeUp'

const library = chords as Record<string, DrillChord>
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function SongStep({ context, songId }: { context: StepContext; songId?: string }) {
  const progress = useProgress()
  const learned = learnedChords(progress.learnedCount)
  const song = currentSong(songId ?? progress.currentSong, songId ? Object.keys(library) : learned)
  const shapes = useMemo(
    () => Object.fromEntries([...new Set([...songChords(song), ...learned])].map((n) => [n, library[n]])),
    [song, learned.length], // eslint-disable-line
  )
  const [paused, setPaused] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const player = useSong({ song, chords: shapes, active: !timedOut, held: paused || choosing, noMic: context.noMic })
  const { left, extend } = useStepTimer(context.minutes * 60, player.micReady && !paused && !timedOut)
  if (left === 0 && !timedOut) setTimedOut(true)

  return (
    <SessionShell
      step="Song"
      stepNumber={context.stepNumber}
      totalSteps={context.totalSteps}
      phase={timedOut ? 'Complete' : choosing ? 'Choose a song' : player.finished ? 'Run finished' : 'Play'}
      time={clock(left)}
      timeMuted={timedOut}
      logs={finishedLogs(context, timedOut)}
      nextLabel={timedOut ? context.nextName : 'Next'}
      background="centered"
      onPauseChange={setPaused}
      onLeave={context.onLeave}
      onSkip={context.onSkip}
      onNext={context.onDone}
    >
      {timedOut ? (
        <TimeUp
          title="That's the song for tonight."
          summary={`A few runs of ${song.title}. The log is on the fire.`}
          nextStep={context.nextName}
          onAdvance={context.onDone}
          onExtend={() => {
            extend(60)
            setTimedOut(false)
          }}
        />
      ) : !player.micReady ? (
        <MicPermission
          kicker="Before we play"
          error={player.mic.error}
          starting={player.mic.reading.status === 'starting'}
          onAllow={player.mic.start}
          onWithout={() => context.onNoMic(true)}
        />
      ) : choosing ? (
        <SongList
          songs={songs.map((s) => ({ song: s, missing: missingChords(s, learned) }))}
          learned={learned}
          current={song.id}
          onPick={(id) => {
            setCurrentSong(id)
            setChoosing(false)
            player.again()
          }}
        />
      ) : (
        <Song
          song={song}
          library={library}
          run={player.run}
          bar={player.bar}
          beat={player.beat}
          active={player.running}
          finished={player.finished}
          clean={player.clean}
          listening={!context.noMic}
          bpm={player.bpm}
          paused={player.paused || player.finished}
          slow={player.slow}
          onSlow={player.setSlow}
          onBpmStep={player.stepBpm}
          onTogglePause={player.finished ? player.again : player.togglePause}
          onAgain={player.again}
          onSongs={() => setChoosing(true)}
        />
      )}
    </SessionShell>
  )
}
