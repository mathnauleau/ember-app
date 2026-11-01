import { ChordDiagram } from '../components/ChordDiagram'
import { List, Lock } from '../components/icons'
import { Transport } from '../components/Transport'
import { Segmented } from '../components/ui'
import type { Song as SongData } from '../engine/curriculum'
import type { DrillChord } from './ChordDrill'
import { plural } from '../lib/words'

export function Song(props: {
  song: SongData
  library: Record<string, DrillChord>
  run: number
  bar: number
  beat: number
  active: boolean
  finished: boolean
  clean: number[]
  listening: boolean
  bpm: number
  paused: boolean
  slow: boolean
  onSlow: (slow: boolean) => void
  onBpmStep: (delta: number) => void
  onTogglePause: () => void
  onAgain: () => void
  onSongs: () => void
}) {
  const { song, library, run, bar, beat, active, finished, clean, listening, bpm, paused, slow } = props
  const changes = song.bars.length - 1
  const landed = clean.filter((b) => b > 0).length
  const late = song.bars.filter((_, i) => i > 0 && !clean.includes(i))
  const worst = [...new Set(late)].sort((a, b) => late.filter((c) => c === b).length - late.filter((c) => c === a).length)[0]
  const next = song.bars[(bar + 1) % song.bars.length]
  const change = next === song.bars[bar] ? 'same chord' : `in ${4 - beat} ${plural(4 - beat, 'beat', 'beats')}`

  return (
    <div className="song">
      <div className="song-head">
        <div className="song-title">
          <span className="kicker">Verse · run {run} of 3</span>
          <span className="song-name">{song.title}</span>
        </div>
        <button className="btn btn-pill" onClick={props.onSongs}>
          <List size={20} />
          Songs
        </button>
      </div>

      <div className="song-body">
        <div className={finished ? 'song-chart settled' : 'song-chart'}>
          {song.bars.map((chord, i) => {
            const on = !finished && i === bar
            const marked = finished && listening && i > 0
            return (
              <div key={i} className={on ? 'bar on' : 'bar'}>
                <div className="bar-top">
                  <span className="bar-chord">{chord}</span>
                  {marked
                    ? <span className={clean.includes(i) ? 'bar-mark clean' : 'bar-mark'} title={clean.includes(i) ? 'Landed with the beat' : 'Came in a little late'} />
                    : <span className="bar-number tnum">{i + 1}</span>}
                </div>
                <div className="bar-beats">
                  {[0, 1, 2, 3].map((b) => (
                    <span key={b} className={`bar-beat ${on && active && b === beat ? 'now' : on && b < beat ? 'past' : ''}`} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {finished ? (
          <div className="song-card">
            <span className="debug-label">Run {run} finished</span>
            {listening ? (
              <>
                <span className="song-card-title tnum">Clean changes: {landed} of {changes}</span>
                <span className="song-card-body">
                  {worst ? `The changes into ${worst} came in a little late. One more run?` : 'Every change landed. One more run?'}
                </span>
                <div className="song-key">
                  <span><i className="bar-mark clean" />landed with the beat</span>
                  <span><i className="bar-mark" />came in a little late</span>
                </div>
              </>
            ) : (
              <>
                <span className="song-card-title">That’s a run.</span>
                <span className="song-card-body">Your ears are the judge tonight. One more?</span>
              </>
            )}
            <button className="btn btn-secondary" onClick={props.onAgain}>Play it again</button>
          </div>
        ) : (
          <div className="song-next">
            <span className="debug-label song-next-label">Next chord</span>
            <ChordDiagram frets={library[next].frets} fingers={library[next].fingers} scale={0.6} />
            <div className="song-next-name">
              <span className="song-next-chord">{next}</span>
              <span className="muted tnum">{change}</span>
            </div>
          </div>
        )}
      </div>

      <div className="song-foot">
        <Transport bpm={bpm} paused={paused} onStep={props.onBpmStep} onToggle={props.onTogglePause} />
        <Segmented
          label="Speed"
          value={slow ? 'slow' : 'normal'}
          options={[{ value: 'slow', label: 'Slow' }, { value: 'normal', label: 'Normal' }]}
          onChange={(value) => props.onSlow(value === 'slow')}
        />
        <span className="home-date">Slow plays at three quarters of the tempo.</span>
      </div>
    </div>
  )
}

export function SongList({ songs, learned, current, onPick }: {
  songs: { song: SongData; missing: string[] }[]
  learned: string[]
  current: string
  onPick: (id: string) => void
}) {
  return (
    <div className="song">
      <div className="song-head">
        <div className="song-title">
          <span className="kicker">Songs</span>
          <span className="song-name">Pick tonight’s song</span>
        </div>
        <span className="home-date">Your chords: {learned.join(' · ')}</span>
      </div>
      <div className="song-list">
        {songs.map(({ song, missing }) => {
          const meta = `${[...new Set(song.bars)].join(' · ')}  ·  ${song.origin}`
          if (missing.length) {
            return (
              <div key={song.id} className="song-row locked" aria-disabled="true">
                <Lock size={22} color="var(--cream-500)" />
                <div className="song-row-text">
                  <span className="song-row-title">{song.title}</span>
                  <span className="song-row-meta">{meta}</span>
                </div>
                <span className="chip chip-needs">Needs: {missing.join(', ')}</span>
              </div>
            )
          }
          return (
            <button key={song.id} className={song.id === current ? 'song-row current' : 'song-row'} onClick={() => onPick(song.id)}>
              <div className="song-row-text">
                <span className="song-row-title">{song.title}</span>
                <span className="song-row-meta">{meta}</span>
              </div>
              {song.id === current && <span className="song-row-status">Tonight</span>}
            </button>
          )
        })}
      </div>
      <span className="home-date">Locked songs open on their own once their chords come up in Chord drill.</span>
    </div>
  )
}
