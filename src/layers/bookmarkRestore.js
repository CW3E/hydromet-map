export function findBookmarkFeatureAtPoint({
  bookmarkPopup,
  getFeatureId,
  layerIds,
  mapInstance,
  searchRadius = 10,
}) {
  if (!mapInstance || !bookmarkPopup || !Array.isArray(layerIds) || layerIds.length === 0) {
    return null
  }

  const point = mapInstance.project([bookmarkPopup.longitude, bookmarkPopup.latitude])
  let features = []

  try {
    features = mapInstance.queryRenderedFeatures(
      [
        [point.x - searchRadius, point.y - searchRadius],
        [point.x + searchRadius, point.y + searchRadius],
      ],
      { layers: layerIds },
    )
  } catch {
    return null
  }

  return features.find((feature) => String(getFeatureId(feature)) === String(bookmarkPopup.featureId)) ?? null
}

export function applyBookmarkedPopupTab(station, bookmarkPopup) {
  if (!station || !bookmarkPopup?.tabId) {
    return station
  }

  return {
    ...station,
    popup: {
      ...station.popup,
      activeTabId: bookmarkPopup.tabId,
    },
  }
}
