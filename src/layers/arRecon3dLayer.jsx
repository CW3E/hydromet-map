import ArRecon3dLayer from '../features/arRecon3d/ArRecon3dLayer'

const arRecon3dLayer = {
  id: 'arRecon3d',
  isVisible: ({ appState }) => Boolean(appState.layers.arRecon3d),
  restorePopupFromBookmark({ bookmarkPopup, setSelectedStation }) {
    setSelectedStation({
      id: bookmarkPopup.featureId,
      layerId: 'arRecon3d',
      popupOwnerId: 'arRecon3d',
      popupType: 'ar-recon-sonde',
      longitude: bookmarkPopup.longitude,
      latitude: bookmarkPopup.latitude,
      popup: {
        activeTabId: bookmarkPopup.tabId || 'temperature',
      },
    })
    return true
  },
  renderLayers: ArRecon3dLayer,
}

export default arRecon3dLayer
