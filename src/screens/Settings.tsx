import { useRef, useState, type ChangeEvent } from 'react'
import { Download, Upload } from '../components/icons'
import { BackBar, Dialog, Segmented, Switch } from '../components/ui'
import { formatDay } from '../lib/dates'
import { exportProgress } from '../store/backup'
import { parseBackup, replaceProgress, updateSettings, useProgress, type Progress } from '../store/progress'

function offsetLabel(ms: number | null, setOn: string | null) {
  if (ms === null) return 'Not calibrated yet'
  if (!setOn) return `${ms} ms`
  const day = formatDay(setOn)
  return `${ms} ms · ${day === 'today' ? 'set today' : `set on ${day}`}`
}

export function Settings({ go }: { go: (route: string) => void }) {
  const { settings, lastBackupOn } = useProgress()
  const fileInput = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState<Progress | null>(null)

  const onExport = async () => {
    setNotice(null)
    await exportProgress()
  }

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const backup = parseBackup(await file.text())
    if (backup) setPending(backup)
    setNotice(backup ? null : "That file isn't an Ember backup. Nothing changed.")
  }

  const confirmImport = () => {
    if (pending) replaceProgress(pending)
    setPending(null)
    setNotice('Your progress is back.')
  }

  return (
    <main className="screen">
      <BackBar label="Back to Home" title="Settings" onBack={() => go('/')} />
      <div className="settings">
        <section className="settings-col">
          <h2 className="kicker settings-kicker">Session</h2>
          <div className="row">
            <RowLabel title="Default length" sub="What Home selects each night" />
            <Segmented
              label="Default length"
              value={settings.defaultMinutes}
              options={[
                { value: 15, label: '15 min' },
                { value: 10, label: '10 min' },
              ]}
              onChange={(defaultMinutes) => updateSettings({ defaultMinutes })}
            />
          </div>
          <div className="row">
            <RowLabel title="Crackle sound" sub="The soft fire in the background" />
            <Switch label="Crackle sound" checked={settings.sound} onChange={(sound) => updateSettings({ sound })} />
          </div>
          <div className="row">
            <RowLabel title="Keep screen awake" sub="During a session, where Safari allows it" />
            <Switch
              label="Keep screen awake"
              checked={settings.keepAwake}
              onChange={(keepAwake) => updateSettings({ keepAwake })}
            />
          </div>
          <div className="row">
            <RowLabel title="Click volume" sub="Keep it low so the mic hears you, not the click" />
            <div className="row-range">
              <input
                type="range"
                min={0}
                max={100}
                value={settings.clickVolume}
                aria-label="Click volume"
                onChange={(e) => updateSettings({ clickVolume: +e.target.value })}
              />
              <span className="tnum">{settings.clickVolume}%</span>
            </div>
          </div>
        </section>

        <section className="settings-col">
          <h2 className="kicker settings-kicker">Timing</h2>
          <div className="row row-tall">
            <RowLabel title="Strum timing offset" sub={offsetLabel(settings.latencyOffsetMs, settings.latencyOffsetSetOn)} tabular />
            <button className="btn btn-secondary" onClick={() => go('/calibration')}>Calibrate</button>
          </div>

          <h2 className="kicker settings-kicker settings-kicker-gap">Progress</h2>
          <div className="backup">
            <p>Your fire lives on this iPad. Save a copy now and then, so nothing is lost if Safari clears its storage.</p>
            <div className="backup-actions">
              <button className="btn btn-secondary" onClick={onExport}>
                <Download size={20} color="var(--ember-500)" />
                Export progress
              </button>
              <button className="btn btn-secondary" onClick={() => fileInput.current?.click()}>
                <Upload size={20} />
                Import
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={onPickFile}
              />
            </div>
            <span className="muted" role="status">
              {notice ?? (lastBackupOn ? `Last saved ${formatDay(lastBackupOn)}` : 'Not saved yet')}
            </span>
          </div>

          <div className="row row-end">
            <span className="muted">Ember 0.1 · Debug tools</span>
            <button className="btn btn-pill" onClick={() => go('/debug')}>Open Debug</button>
          </div>
        </section>
      </div>

      {pending && (
        <Dialog label="Replace what's on this iPad?">
          <span className="kicker">Import</span>
          <h2 className="dialog-title">Replace what's on this iPad?</h2>
          <p className="dialog-body">
            {pending.lastBackupOn
              ? `This brings back the copy saved ${formatDay(pending.lastBackupOn)}.`
              : 'This brings back the copy in that file.'}
          </p>
          <div className="dialog-actions">
            <button className="btn btn-primary medium" onClick={confirmImport}>Replace</button>
            <button className="btn btn-secondary" onClick={() => setPending(null)}>Keep what's here</button>
          </div>
        </Dialog>
      )}
    </main>
  )
}

function RowLabel({ title, sub, tabular }: { title: string; sub: string; tabular?: boolean }) {
  return (
    <div className="row-label">
      <span>{title}</span>
      <span className={tabular ? 'muted tnum' : 'muted'}>{sub}</span>
    </div>
  )
}
