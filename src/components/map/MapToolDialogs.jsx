import { formatCoordinateLabel } from '../../lib/appState'
import MapToolDialog from './MapToolDialog'

export default function MapToolDialogs({ mapTools }) {
  const {
    closeCombinedToolsDialog,
    closeFlowpathDialog,
    closeUpstreamRiversDialog,
    closeWatershedDialog,
    combinedToolsDialogState,
    downloadGeoJsonFile,
    flowpathDialogState,
    identifiedFlowpath,
    identifiedUpstreamRivers,
    identifiedWatershed,
    setIdentifiedFlowpath,
    setIdentifiedUpstreamRivers,
    setIdentifiedWatershed,
    upstreamRiversDialogState,
    watershedDialogState,
  } = mapTools

  return (
    <>
      <MapToolDialog
        actions={
          combinedToolsDialogState?.status === 'ready' || combinedToolsDialogState?.status === 'partial'
            ? [
                ...(combinedToolsDialogState.downloads ?? []).map((download) => ({
                  id: `download-${download.id}`,
                  label: `Download ${download.label}`,
                  variant: 'secondary',
                  onClick: async () => {
                    await downloadGeoJsonFile(download)
                  },
                })),
                {
                  id: 'add-all-three',
                  label: 'Add all to map',
                  onClick: () => {
                    if (combinedToolsDialogState.payloads?.watershed) {
                      setIdentifiedWatershed(combinedToolsDialogState.payloads.watershed)
                    }
                    if (combinedToolsDialogState.payloads?.upstreamRivers) {
                      setIdentifiedUpstreamRivers(combinedToolsDialogState.payloads.upstreamRivers)
                    }
                    if (combinedToolsDialogState.payloads?.flowpath) {
                      setIdentifiedFlowpath(combinedToolsDialogState.payloads.flowpath)
                    }
                    closeCombinedToolsDialog()
                  },
                },
              ]
            : [
                {
                  id: 'close-combined-tools-dialog',
                  label: combinedToolsDialogState?.status === 'loading' ? 'Working...' : 'Close',
                  disabled: combinedToolsDialogState?.status === 'loading',
                  onClick: closeCombinedToolsDialog,
                },
              ]
        }
        eyebrow="Map Tool"
        onClose={combinedToolsDialogState?.status === 'loading' ? () => {} : closeCombinedToolsDialog}
        open={Boolean(combinedToolsDialogState)}
        title="Identify All Three"
      >
        {combinedToolsDialogState?.status === 'loading' ? (
          <div className="map-tool-dialog__message">
            <p>Retrieving watershed, upstream rivers, and downstream flowpath GeoJSON from the same location...</p>
            <p>
              {formatCoordinateLabel(combinedToolsDialogState.latitude, 'N', 'S')}
              <br />
              {formatCoordinateLabel(combinedToolsDialogState.longitude, 'E', 'W')}
            </p>
          </div>
        ) : null}

        {combinedToolsDialogState?.status === 'error' ? (
          <div className="map-tool-dialog__message">
            <p>Unable to retrieve any of the three map-tool layers for this location.</p>
            <p>{combinedToolsDialogState.message}</p>
            {(combinedToolsDialogState.errors ?? []).map((errorText) => (
              <p key={errorText}>{errorText}</p>
            ))}
          </div>
        ) : null}

        {combinedToolsDialogState?.status === 'ready' || combinedToolsDialogState?.status === 'partial' ? (
          <div className="map-tool-dialog__message">
            <p>
              Retrieved {combinedToolsDialogState.downloads?.length ?? 0} of 3 layers from the same clicked location.
            </p>
            <p>
              You can download each GeoJSON separately, then add all successful layers to the map together.
            </p>
            <p>
              {formatCoordinateLabel(combinedToolsDialogState.latitude, 'N', 'S')}
              <br />
              {formatCoordinateLabel(combinedToolsDialogState.longitude, 'E', 'W')}
            </p>
            {(combinedToolsDialogState.errors ?? []).map((errorText) => (
              <p key={errorText}>{errorText}</p>
            ))}
          </div>
        ) : null}
      </MapToolDialog>

      <MapToolDialog
        actions={
          watershedDialogState?.status === 'ready'
            ? [
                {
                  id: 'download-watershed',
                  label: 'Download GeoJSON',
                  variant: 'secondary',
                  onClick: async () => {
                    await downloadGeoJsonFile(watershedDialogState)
                  },
                },
                {
                  id: 'add-watershed',
                  label: identifiedWatershed ? 'Replace on map' : 'Add to map',
                  onClick: () => {
                    setIdentifiedWatershed(watershedDialogState)
                    closeWatershedDialog()
                  },
                },
              ]
            : [
                {
                  id: 'close-watershed-dialog',
                  label: watershedDialogState?.status === 'loading' ? 'Working...' : 'Close',
                  disabled: watershedDialogState?.status === 'loading',
                  onClick: closeWatershedDialog,
                },
              ]
        }
        eyebrow="Map Tool"
        onClose={watershedDialogState?.status === 'loading' ? () => {} : closeWatershedDialog}
        open={Boolean(watershedDialogState)}
        title="Identify Watershed"
      >
        {watershedDialogState?.status === 'loading' ? (
          <div className="map-tool-dialog__message">
            <p>Retrieving watershed GeoJSON for the selected location...</p>
            <p>
              {formatCoordinateLabel(watershedDialogState.latitude, 'N', 'S')}
              <br />
              {formatCoordinateLabel(watershedDialogState.longitude, 'E', 'W')}
            </p>
          </div>
        ) : null}

        {watershedDialogState?.status === 'error' ? (
          <div className="map-tool-dialog__message">
            <p>Unable to identify the watershed for this location.</p>
            <p>{watershedDialogState.message}</p>
          </div>
        ) : null}

        {watershedDialogState?.status === 'ready' ? (
          <div className="map-tool-dialog__message">
            <p>The watershed polygon was retrieved successfully.</p>
            <p>
              You can download the GeoJSON file, then add it as a temporary layer on the map.
            </p>
            <p>
              {formatCoordinateLabel(watershedDialogState.latitude, 'N', 'S')}
              <br />
              {formatCoordinateLabel(watershedDialogState.longitude, 'E', 'W')}
            </p>
          </div>
        ) : null}
      </MapToolDialog>

      <MapToolDialog
        actions={
          flowpathDialogState?.status === 'ready'
            ? [
                {
                  id: 'download-flowpath',
                  label: 'Download GeoJSON',
                  variant: 'secondary',
                  onClick: async () => {
                    await downloadGeoJsonFile({
                      ...flowpathDialogState,
                      fileNameRoot: 'flowpath',
                    })
                  },
                },
                {
                  id: 'add-flowpath',
                  label: identifiedFlowpath ? 'Replace on map' : 'Add to map',
                  onClick: () => {
                    setIdentifiedFlowpath(flowpathDialogState)
                    closeFlowpathDialog()
                  },
                },
              ]
            : [
                {
                  id: 'close-flowpath-dialog',
                  label: flowpathDialogState?.status === 'loading' ? 'Working...' : 'Close',
                  disabled: flowpathDialogState?.status === 'loading',
                  onClick: closeFlowpathDialog,
                },
              ]
        }
        eyebrow="Map Tool"
        onClose={flowpathDialogState?.status === 'loading' ? () => {} : closeFlowpathDialog}
        open={Boolean(flowpathDialogState)}
        title="Identify Downstream Flowpath"
      >
        {flowpathDialogState?.status === 'loading' ? (
          <div className="map-tool-dialog__message">
            <p>Retrieving downstream flowpath GeoJSON for the selected location...</p>
            <p>
              {formatCoordinateLabel(flowpathDialogState.latitude, 'N', 'S')}
              <br />
              {formatCoordinateLabel(flowpathDialogState.longitude, 'E', 'W')}
            </p>
          </div>
        ) : null}

        {flowpathDialogState?.status === 'error' ? (
          <div className="map-tool-dialog__message">
            <p>Unable to identify downstream flowpath for this location.</p>
            <p>{flowpathDialogState.message}</p>
          </div>
        ) : null}

        {flowpathDialogState?.status === 'ready' ? (
          <div className="map-tool-dialog__message">
            <p>The downstream flowpath was retrieved successfully.</p>
            <p>
              You can download the GeoJSON file, then add it as a temporary layer on the map.
            </p>
            <p>
              {formatCoordinateLabel(flowpathDialogState.latitude, 'N', 'S')}
              <br />
              {formatCoordinateLabel(flowpathDialogState.longitude, 'E', 'W')}
            </p>
          </div>
        ) : null}
      </MapToolDialog>

      <MapToolDialog
        actions={
          upstreamRiversDialogState?.status === 'ready'
            ? [
                {
                  id: 'download-upstream-rivers',
                  label: 'Download GeoJSON',
                  variant: 'secondary',
                  onClick: async () => {
                    await downloadGeoJsonFile({
                      ...upstreamRiversDialogState,
                      fileNameRoot: 'upstream_rivers',
                    })
                  },
                },
                {
                  id: 'add-upstream-rivers',
                  label: identifiedUpstreamRivers ? 'Replace on map' : 'Add to map',
                  onClick: () => {
                    setIdentifiedUpstreamRivers(upstreamRiversDialogState)
                    closeUpstreamRiversDialog()
                  },
                },
              ]
            : [
                {
                  id: 'close-upstream-rivers-dialog',
                  label: upstreamRiversDialogState?.status === 'loading' ? 'Working...' : 'Close',
                  disabled: upstreamRiversDialogState?.status === 'loading',
                  onClick: closeUpstreamRiversDialog,
                },
              ]
        }
        eyebrow="Map Tool"
        onClose={upstreamRiversDialogState?.status === 'loading' ? () => {} : closeUpstreamRiversDialog}
        open={Boolean(upstreamRiversDialogState)}
        title="Identify Upstream Rivers"
      >
        {upstreamRiversDialogState?.status === 'loading' ? (
          <div className="map-tool-dialog__message">
            <p>Retrieving upstream river GeoJSON for the selected location...</p>
            <p>
              {formatCoordinateLabel(upstreamRiversDialogState.latitude, 'N', 'S')}
              <br />
              {formatCoordinateLabel(upstreamRiversDialogState.longitude, 'E', 'W')}
            </p>
          </div>
        ) : null}

        {upstreamRiversDialogState?.status === 'error' ? (
          <div className="map-tool-dialog__message">
            <p>Unable to identify upstream rivers for this location.</p>
            <p>{upstreamRiversDialogState.message}</p>
          </div>
        ) : null}

        {upstreamRiversDialogState?.status === 'ready' ? (
          <div className="map-tool-dialog__message">
            <p>The upstream river lines were retrieved successfully.</p>
            <p>
              You can download the GeoJSON file, then add it as a temporary layer on the map.
            </p>
            <p>
              {formatCoordinateLabel(upstreamRiversDialogState.latitude, 'N', 'S')}
              <br />
              {formatCoordinateLabel(upstreamRiversDialogState.longitude, 'E', 'W')}
            </p>
          </div>
        ) : null}
      </MapToolDialog>
    </>
  )
}
