import GfsIvtParticlesLayer from '../features/gfsIvtParticles/GfsIvtParticlesLayer'

const gfsIvtParticlesLayer = {
  id: 'gfsIvtParticles',
  isVisible: ({ appState }) => Boolean(appState.layers.gfsIvtParticles),
  renderLayers: GfsIvtParticlesLayer,
}

export default gfsIvtParticlesLayer
