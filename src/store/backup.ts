import { today } from '../lib/dates'
import { getProgress, markBackedUp, serializeBackup } from './progress'

// Resolves false if the person cancels the share sheet, so "Last saved" stays truthful.
export async function exportProgress(): Promise<boolean> {
  const on = today()
  const text = serializeBackup({ ...getProgress(), lastBackupOn: on })
  const file = new File([text], `ember-progress-${on}.json`, { type: 'application/json' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
    } catch {
      return false
    }
  } else {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  markBackedUp(on)
  return true
}
