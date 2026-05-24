import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { buildNoCacheUrl } from '../../lib/network'
import MapToolDialog from './MapToolDialog'

function resolveMarkdownUrl(markdownUrl) {
  if (!markdownUrl) {
    return ''
  }

  if (/^(https?:)?\/\//.test(markdownUrl) || markdownUrl.startsWith('/')) {
    return markdownUrl
  }

  return `${import.meta.env.BASE_URL}${markdownUrl}`.replace(/\/{2,}/g, '/')
}

export default function ProjectAboutDialog({
  about,
  onClose,
  open,
  projectLabel,
}) {
  const [state, setState] = useState({ status: 'idle', markdown: '', error: '' })
  const markdownUrl = about?.markdownUrl ?? ''

  useEffect(() => {
    if (!open || !markdownUrl) {
      return undefined
    }

    const abortController = new AbortController()

    async function loadAboutPage() {
      setState({ status: 'loading', markdown: '', error: '' })

      try {
        const response = await fetch(buildNoCacheUrl(resolveMarkdownUrl(markdownUrl)), {
          cache: 'no-store',
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error(`Failed to load about page (${response.status}).`)
        }

        const markdown = await response.text()

        if (!abortController.signal.aborted) {
          setState({ status: 'ready', markdown, error: '' })
        }
      } catch (error) {
        if (error?.name === 'AbortError') {
          return
        }

        setState({
          status: 'error',
          markdown: '',
          error: error?.message ?? 'Unable to load the about page.',
        })
      }
    }

    loadAboutPage()

    return () => {
      abortController.abort()
    }
  }, [open, markdownUrl])

  if (!open || !about) {
    return null
  }

  return (
    <MapToolDialog
      actions={[
        {
          id: 'close-project-about',
          label: 'Close',
          onClick: onClose,
        },
      ]}
      className="map-tool-dialog--about"
      eyebrow="About"
      onClose={onClose}
      open={open}
      title={about.title ?? `About ${projectLabel ?? 'This Project'}`}
    >
      {state.status === 'loading' ? (
        <div className="project-about__message">
          <p>Loading about page...</p>
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="project-about__message project-about__message--error">
          <p>Unable to load the about page.</p>
          <p>{state.error}</p>
        </div>
      ) : null}

      {state.status === 'ready' ? (
        <div className="project-about">
          <ReactMarkdown
            components={{
              a: ({ children, href, ...props }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                  {children}
                </a>
              ),
            }}
          >
            {state.markdown}
          </ReactMarkdown>
        </div>
      ) : null}
    </MapToolDialog>
  )
}
