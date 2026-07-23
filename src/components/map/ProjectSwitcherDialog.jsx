import { useEffect, useState } from 'react'
import { PROJECT_OPTIONS } from '../../config/mapConfig'
import MapToolDialog from './MapToolDialog'

const PROJECT_SWITCH_PASSCODE = 'lajolla'

export default function ProjectSwitcherDialog({
  activeProjectId,
  onChangeProject,
  onClose,
  open,
}) {
  const [passcode, setPasscode] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setPasscode('')
      setIsUnlocked(false)
      setError('')
    }
  }, [open])

  function handleSubmit(event) {
    event.preventDefault()

    if (passcode.trim() === PROJECT_SWITCH_PASSCODE) {
      setIsUnlocked(true)
      setError('')
      return
    }

    setError('Passcode not recognized.')
  }

  return (
    <MapToolDialog
      actions={[
        {
          id: 'close-project-switcher',
          label: 'Close',
          onClick: onClose,
          variant: 'secondary',
        },
      ]}
      className="map-tool-dialog--project-switcher"
      eyebrow="Project"
      onClose={onClose}
      open={open}
      title="Switch Project"
    >
      {!isUnlocked ? (
        <form className="project-switcher" onSubmit={handleSubmit}>
          <label className="project-switcher__field">
            <span>Passcode</span>
            <input
              autoComplete="off"
              autoFocus
              type="password"
              value={passcode}
              onChange={(event) => {
                setPasscode(event.target.value)
                setError('')
              }}
            />
          </label>

          {error ? <p className="project-switcher__error">{error}</p> : null}

          <button className="map-tool-dialog__button project-switcher__submit" type="submit">
            Unlock
          </button>
        </form>
      ) : (
        <label className="project-switcher__field">
          <span>Project</span>
          <select
            autoFocus
            value={activeProjectId}
            onChange={(event) => {
              onChangeProject(event.target.value)
              onClose()
            }}
          >
            {PROJECT_OPTIONS.map((project) => (
              <option key={project.id} value={project.id}>
                {project.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </MapToolDialog>
  )
}
