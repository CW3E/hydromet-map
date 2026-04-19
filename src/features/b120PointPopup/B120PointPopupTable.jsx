import { memo, useMemo } from 'react'
import createPlotlyComponentModule from 'react-plotly.js/factory'
import Plotly from 'plotly.js/dist/plotly'

const createPlotlyComponent = createPlotlyComponentModule.default ?? createPlotlyComponentModule
const Plot = createPlotlyComponent(Plotly)

const B120PointPopupTable = memo(function B120PointPopupTable({
  stationId,
  plotState,
}) {
  const layout = useMemo(
    () => ({
      ...(plotState.layout ?? {}),
      uirevision: `${stationId}-${plotState.plotId}-${plotState.traceFingerprint}`,
      margin: {
        ...(plotState.layout?.margin ?? {}),
        b: plotState.footerText ? Math.max(plotState.layout?.margin?.b ?? 0, 52) : (plotState.layout?.margin?.b ?? 0),
      },
      title: {
        text: plotState.titleText ?? `${stationId}`,
        x: 0.5,
        xanchor: 'center',
        y: 0.96,
        yanchor: 'top',
        font: {
          size: 15,
        },
      },
      annotations: plotState.footerText
        ? [
            {
              x: 0,
              y: 0,
              xref: 'paper',
              yref: 'paper',
              xanchor: 'left',
              yanchor: 'top',
              align: 'left',
              showarrow: false,
              text: plotState.footerText,
              font: {
                size: 11,
                color: '#355567',
              },
            },
          ]
        : undefined,
    }),
    [plotState.footerText, plotState.layout, plotState.plotId, plotState.titleText, plotState.traceFingerprint, stationId],
  )

  const config = useMemo(
    () => ({
      responsive: true,
      displayModeBar: 'hover',
      ...(plotState.plotlyConfig ?? {}),
    }),
    [plotState.plotlyConfig],
  )

  return (
    <Plot
      key={`${stationId}-${plotState.plotId}-${plotState.traceFingerprint}`}
      data={plotState.traces}
      layout={layout}
      config={config}
      style={{ width: '100%', height: '100%' }}
      useResizeHandler
    />
  )
})

export default B120PointPopupTable
