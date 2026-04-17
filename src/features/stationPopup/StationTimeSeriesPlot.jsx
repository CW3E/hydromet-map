import { memo, useMemo } from 'react'
import createPlotlyComponentModule from 'react-plotly.js/factory'
import Plotly from 'plotly.js/dist/plotly'

const createPlotlyComponent = createPlotlyComponentModule.default ?? createPlotlyComponentModule
const Plot = createPlotlyComponent(Plotly)

const StationTimeSeriesPlot = memo(function StationTimeSeriesPlot({
  stationName,
  stationId,
  plotState,
}) {
  const layout = useMemo(
    () => ({
      ...(plotState.layout ?? {}),
      uirevision: `${stationId}-${plotState.plotId}-${plotState.traceFingerprint}`,
      title: {
        text: plotState.titleText ?? `${stationName} (${stationId})`,
        x: 0.5,
        xanchor: 'center',
        y: 0.98,
        yanchor: 'top',
        font: {
          size: 15,
        },
      },
      hovermode: plotState.hovermode ?? 'closest',
      xaxis: {
        title: plotState.xField ?? undefined,
        automargin: true,
        ...(plotState.xAxisLayout ?? {}),
      },
      ...plotState.yAxesLayout,
    }),
    [
      plotState.hovermode,
      plotState.layout,
      plotState.leftAxisCount,
      plotState.rightAxisCount,
      plotState.xAxisLayout,
      plotState.xField,
      plotState.yAxesLayout,
      stationId,
      stationName,
    ],
  )

  const config = useMemo(
    () => ({
      responsive: true,
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

export default StationTimeSeriesPlot
