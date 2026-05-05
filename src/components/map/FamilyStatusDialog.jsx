import { useEffect, useState } from 'react'
import { fetchJsonNoCache } from '../../lib/network'
import MapToolDialog from './MapToolDialog'

function resolvePath(data, path) {
  if (!path) {
    return undefined
  }

  return path.split('.').reduce((current, key) => {
    if (current == null) {
      return undefined
    }

    return current[key]
  }, data)
}

function formatValue(value) {
  if (value == null || value === '') {
    return 'Unavailable'
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  return String(value)
}

function GenericSectionsStatus({ data, sections = [] }) {
  return (
    <div className="family-status family-status--generic">
      {sections.map((section) => (
        <section key={section.title ?? 'status-section'} className="family-status__section">
          {section.title ? <strong className="family-status__section-title">{section.title}</strong> : null}
          <div className="family-status__rows">
            {(section.rows ?? []).map((row) => {
              const value = row.path ? resolvePath(data, row.path) : row.getValue?.(data)

              return (
                <div key={row.label} className="family-status__row">
                  <span className="family-status__label">{row.label}</span>
                  <span className="family-status__value">{formatValue(value)}</span>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function GradesDescriptorStatus({ data }) {
  const hydrographies = Object.entries(data ?? {}).filter(([, value]) =>
    value
    && typeof value === 'object'
    && Object.hasOwn(value, 'start')
    && Object.hasOwn(value, 'end')
    && Object.hasOwn(value, 'ndays'),
  )

  return (
    <div className="family-status family-status--grades">
      <table className="family-status__table">
        <thead>
          <tr>
            <th>Hydrography</th>
            <th>Start</th>
            <th>End</th>
            <th>Days</th>
          </tr>
        </thead>
        <tbody>
          {hydrographies.map(([name, metadata]) => (
            <tr key={name}>
              <td>{name}</td>
              <td>{formatValue(metadata.start)}</td>
              <td>{formatValue(metadata.end)}</td>
              <td>{formatValue(metadata.ndays)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CnrfcJobStatus({ data }) {
  const rows = [
    { key: 'nrt', label: 'NRT', color: 'darkturquoise' },
    { key: 'gfs', label: 'GFS', color: 'blue' },
    { key: 'wwrf_gfs', label: 'WWRF/GFS', color: 'blue' },
    { key: 'wwrf_ecmwf', label: 'WWRF/ECMWF', color: 'blue' },
  ]

  return (
    <div className="family-status family-status--cnrfc">
      <div className="family-status__summary">
        <strong>
          UTC Date of Operation: <span style={{ color: 'magenta' }}>{formatValue(data?.fcst_date)}</span>
          {'  '}
          Local Time of Status Update: <span style={{ color: 'magenta' }}>{formatValue(data?.update_time)}</span>
        </strong>
      </div>

      <table className="family-status__table family-status__table--cnrfc">
        <thead>
          <tr>
            <th>Fcst/NRT Chain</th>
            <th>Range (up to)</th>
            <th>Pre-processing start</th>
            <th>Model simulation start</th>
            <th>Post-processing start</th>
            <th>Push to Globus finish (on-time?)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const product = data?.[row.key] ?? {}

            return (
              <tr key={row.key}>
                <td>
                  <strong style={{ color: row.color }}>{row.label}</strong>
                </td>
                <td style={{ color: product['newest-color'] ?? undefined }}>
                  {formatValue(product.t2)} ({formatValue(product.newest)})
                </td>
                <td>{formatValue(product['pre-processing']?.start)}</td>
                <td>{formatValue(product.simulation?.start)}</td>
                <td>{formatValue(product['post-processing']?.start)}</td>
                <td style={{ color: product['delay-color'] ?? undefined }}>
                  {formatValue(product.rsync?.end)} ({formatValue(product.delay)})
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function StatusContent({ data, statusPanel }) {
  switch (statusPanel?.renderer) {
    case 'cnrfcJobTable':
      return <CnrfcJobStatus data={data} />
    case 'gradesDescriptor':
      return <GradesDescriptorStatus data={data} />
    case 'genericSections':
    default:
      return <GenericSectionsStatus data={data} sections={statusPanel?.sections} />
  }
}

export default function FamilyStatusDialog({
  layerFamily,
  onClose,
  open,
}) {
  const statusPanel = layerFamily?.statusPanel ?? null
  const [state, setState] = useState({ status: 'idle', data: null, error: '' })

  useEffect(() => {
    if (!open || !statusPanel?.url) {
      return undefined
    }

    const abortController = new AbortController()

    async function loadStatus() {
      setState({ status: 'loading', data: null, error: '' })

      try {
        const response = await fetchJsonNoCache(statusPanel.url, {
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error(`Failed to load status (${response.status}).`)
        }

        const data = await response.json()

        if (!abortController.signal.aborted) {
          setState({ status: 'ready', data, error: '' })
        }
      } catch (error) {
        if (error?.name === 'AbortError') {
          return
        }

        setState({
          status: 'error',
          data: null,
          error: error?.message ?? 'Unable to load status information.',
        })
      }
    }

    loadStatus()

    return () => {
      abortController.abort()
    }
  }, [open, statusPanel?.url])

  if (!open || !statusPanel) {
    return null
  }

  return (
    <MapToolDialog
      actions={[
        {
          id: 'close-family-status',
          label: 'Close',
          onClick: onClose,
        },
      ]}
      className={statusPanel.renderer === 'cnrfcJobTable' ? 'map-tool-dialog--wide' : ''}
      eyebrow="Status"
      hideTitle={statusPanel.hideTitle}
      onClose={onClose}
      open={open}
      title={statusPanel.title ?? `${layerFamily?.label ?? 'Project'} Status`}
    >
      {state.status === 'loading' ? (
        <div className="family-status__message">
          <p>Loading status information...</p>
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="family-status__message family-status__message--error">
          <p>Unable to load status information.</p>
          <p>{state.error}</p>
        </div>
      ) : null}

      {state.status === 'ready' ? (
        <StatusContent data={state.data} statusPanel={statusPanel} />
      ) : null}
    </MapToolDialog>
  )
}
