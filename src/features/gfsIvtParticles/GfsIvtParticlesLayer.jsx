import { useEffect, useRef } from 'react'

const CUSTOM_LAYER_ID = 'gfs-ivt-particle-custom-layer'
const PARTICLE_COUNT = 6400
const MAX_AGE = 280
const HISTORY_LENGTH = 64

function resolveUrl(relativeUrl, baseUrl) {
  return new URL(relativeUrl, baseUrl).toString()
}

function readUint32(bytes, offset) {
  return (
    (bytes[offset] * 0x1000000)
    + (bytes[offset + 1] << 16)
    + (bytes[offset + 2] << 8)
    + bytes[offset + 3]
  ) >>> 0
}

function paethPredictor(left, above, upperLeft) {
  const estimate = left + above - upperLeft
  const leftDistance = Math.abs(estimate - left)
  const aboveDistance = Math.abs(estimate - above)
  const upperLeftDistance = Math.abs(estimate - upperLeft)
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left
  return aboveDistance <= upperLeftDistance ? above : upperLeft
}

async function decodeRgbaPng(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`IVT texture request failed (${response.status})`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (!signature.every((value, index) => bytes[index] === value)) {
    throw new Error('IVT texture is not a PNG')
  }

  let width = 0
  let height = 0
  const compressedChunks = []
  for (let offset = 8; offset < bytes.length;) {
    const length = readUint32(bytes, offset)
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8))
    const data = bytes.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = readUint32(data, 0)
      height = readUint32(data, 4)
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) {
        throw new Error('IVT texture must be a non-interlaced RGBA8 PNG')
      }
    } else if (type === 'IDAT') {
      compressedChunks.push(data)
    } else if (type === 'IEND') {
      break
    }
    offset += length + 12
  }

  const compressedLength = compressedChunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const compressed = new Uint8Array(compressedLength)
  let compressedOffset = 0
  compressedChunks.forEach((chunk) => {
    compressed.set(chunk, compressedOffset)
    compressedOffset += chunk.length
  })
  const decompressed = new Uint8Array(await new Response(
    new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate')),
  ).arrayBuffer())
  const stride = width * 4
  const pixels = new Uint8Array(width * height * 4)
  let inputOffset = 0
  for (let row = 0; row < height; row += 1) {
    const filter = decompressed[inputOffset]
    inputOffset += 1
    for (let columnByte = 0; columnByte < stride; columnByte += 1) {
      const outputOffset = (row * stride) + columnByte
      const raw = decompressed[inputOffset]
      inputOffset += 1
      const left = columnByte >= 4 ? pixels[outputOffset - 4] : 0
      const above = row > 0 ? pixels[outputOffset - stride] : 0
      const upperLeft = row > 0 && columnByte >= 4 ? pixels[outputOffset - stride - 4] : 0
      let value = raw
      if (filter === 1) value += left
      else if (filter === 2) value += above
      else if (filter === 3) value += Math.floor((left + above) / 2)
      else if (filter === 4) value += paethPredictor(left, above, upperLeft)
      else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`)
      pixels[outputOffset] = value & 255
    }
  }
  return { width, height, pixels }
}

function decodeField(texture, manifest) {
  const { componentLimit } = manifest.encoding
  const scale = (2 * componentLimit) / 65535
  const size = texture.width * texture.height
  const u = new Float32Array(size)
  const v = new Float32Array(size)
  for (let index = 0; index < size; index += 1) {
    const pixelIndex = index * 4
    u[index] = (((texture.pixels[pixelIndex] * 256) + texture.pixels[pixelIndex + 1]) * scale) - componentLimit
    v[index] = (((texture.pixels[pixelIndex + 2] * 256) + texture.pixels[pixelIndex + 3]) * scale) - componentLimit
  }
  const periodicLongitude = Math.abs((texture.width * manifest.grid.dx) - 360) <= manifest.grid.dx * 1.5
  return {
    u,
    v,
    width: texture.width,
    height: texture.height,
    grid: manifest.grid,
    periodicLongitude,
  }
}

function sampleField(field, longitude, latitude) {
  const { grid, width, height, u, v } = field
  const rawX = (longitude - grid.west) / grid.dx
  const x = field.periodicLongitude
    ? ((rawX % width) + width) % width
    : rawX
  const y = (grid.north - latitude) / grid.dy
  if (
    y < 0
    || y > height - 1
    || (!field.periodicLongitude && (x < 0 || x > width - 1))
  ) return null
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = field.periodicLongitude ? (x0 + 1) % width : Math.min(x0 + 1, width - 1)
  const y1 = Math.min(y0 + 1, height - 1)
  const tx = x - x0
  const ty = y - y0
  const topLeft = (y0 * width) + x0
  const topRight = (y0 * width) + x1
  const bottomLeft = (y1 * width) + x0
  const bottomRight = (y1 * width) + x1
  const interpolate = (values) => {
    const top = values[topLeft] + (tx * (values[topRight] - values[topLeft]))
    const bottom = values[bottomLeft] + (tx * (values[bottomRight] - values[bottomLeft]))
    return top + (ty * (bottom - top))
  }
  return { u: interpolate(u), v: interpolate(v) }
}

function longitudeToMercatorX(longitude) {
  return (longitude + 180) / 360
}

function latitudeToMercatorY(latitude) {
  const radians = latitude * Math.PI / 180
  return (1 - (Math.log(Math.tan(Math.PI / 4 + radians / 2)) / Math.PI)) / 2
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`IVT shader compilation failed: ${message}`)
  }
  return shader
}

function hexToGlslColor(color) {
  const value = color.replace('#', '')
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255)
  return `vec3(${channels.map((channel) => channel.toFixed(6)).join(', ')})`
}

function buildPaletteFunction(palette) {
  const stops = palette.thresholds.map((threshold, index) => ({
    threshold: Number.parseFloat(threshold),
    color: hexToGlslColor(palette.colors[index]),
  }))
  const lines = [`if (value <= ${stops[0].threshold.toFixed(1)}) return ${stops[0].color};`]
  for (let index = 1; index < stops.length; index += 1) {
    const previous = stops[index - 1]
    const current = stops[index]
    lines.push(
      `if (value <= ${current.threshold.toFixed(1)}) return mix(${previous.color}, ${current.color}, smoothstep(${previous.threshold.toFixed(1)}, ${current.threshold.toFixed(1)}, value));`,
    )
  }
  lines.push(`return ${stops.at(-1).color};`)
  return `vec3 paletteColor(float value) { ${lines.join(' ')} }`
}

function createProgram(gl, palette) {
  const paletteFunction = buildPaletteFunction(palette)
  const paletteMaximum = Number.parseFloat(palette.thresholds.at(-1)).toFixed(1)
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, `#version 300 es
    in vec2 a_position;
    in float a_intensity;
    in float a_opacity;
    uniform mat4 u_matrix;
    uniform float u_worldOffset;
    out float v_intensity;
    out float v_opacity;
    void main() {
      gl_Position = u_matrix * vec4(a_position + vec2(u_worldOffset, 0.0), 0.0, 1.0);
      v_intensity = a_intensity;
      v_opacity = a_opacity;
    }
  `)
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, `#version 300 es
    precision mediump float;
    in float v_intensity;
    in float v_opacity;
    out vec4 fragmentColor;
    ${paletteFunction}
    void main() {
      float magnitude = max(v_intensity, 0.0);
      float strength = clamp(magnitude / ${paletteMaximum}, 0.0, 1.0);
      fragmentColor = vec4(
        paletteColor(magnitude),
        v_opacity * (0.32 + 0.58 * strength)
      );
    }
  `)
  const program = gl.createProgram()
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(`IVT shader linking failed: ${message}`)
  }
  return program
}

function createParticleLayer(map, field, palette) {
  const particleLongitude = new Float32Array(PARTICLE_COUNT)
  const particleLatitude = new Float32Array(PARTICLE_COUNT)
  const particleAge = new Uint16Array(PARTICLE_COUNT)
  const historyLongitude = Array.from({ length: HISTORY_LENGTH }, () => new Float32Array(PARTICLE_COUNT))
  const historyLatitude = Array.from({ length: HISTORY_LENGTH }, () => new Float32Array(PARTICLE_COUNT))
  const segmentsPerParticle = HISTORY_LENGTH - 1
  const vertexCount = PARTICLE_COUNT * segmentsPerParticle * 2
  const positions = new Float32Array(vertexCount * 2)
  const intensities = new Float32Array(vertexCount)
  const opacities = new Float32Array(vertexCount)
  let program = null
  let positionBuffer = null
  let intensityBuffer = null
  let opacityBuffer = null
  let lastFrameTime = performance.now()

  function resetParticle(index) {
    const longitude = field.grid.west + (Math.random() * (field.grid.east - field.grid.west))
    const latitude = field.grid.south + (Math.random() * (field.grid.north - field.grid.south))
    particleLongitude[index] = longitude
    particleLatitude[index] = latitude
    particleAge[index] = Math.floor(Math.random() * MAX_AGE)
    for (let history = 0; history < HISTORY_LENGTH; history += 1) {
      historyLongitude[history][index] = longitude
      historyLatitude[history][index] = latitude
    }
  }

  for (let index = 0; index < PARTICLE_COUNT; index += 1) resetParticle(index)

  return {
    id: CUSTOM_LAYER_ID,
    type: 'custom',
    renderingMode: '2d',
    onAdd(_map, gl) {
      program = createProgram(gl, palette)
      positionBuffer = gl.createBuffer()
      intensityBuffer = gl.createBuffer()
      opacityBuffer = gl.createBuffer()
    },
    render(gl, options) {
      if (!program) return
      const now = performance.now()
      const deltaSeconds = Math.min((now - lastFrameTime) / 1000, 0.05)
      lastFrameTime = now
      let vertex = 0
      for (let index = 0; index < PARTICLE_COUNT; index += 1) {
        const longitude = particleLongitude[index]
        const latitude = particleLatitude[index]
        const vector = sampleField(field, longitude, latitude)
        const magnitude = vector ? Math.hypot(vector.u, vector.v) : 0
        particleAge[index] += 1
        if (!vector || magnitude < 1 || particleAge[index] >= MAX_AGE) {
          resetParticle(index)
        } else {
          for (let history = 0; history < HISTORY_LENGTH - 1; history += 1) {
            historyLongitude[history][index] = historyLongitude[history + 1][index]
            historyLatitude[history][index] = historyLatitude[history + 1][index]
          }
          const visualDegreesPerSecond = 0.7 + Math.min(magnitude / 350, 4.3)
          const latitudeScale = Math.max(Math.cos(latitude * Math.PI / 180), 0.25)
          particleLongitude[index] += (vector.u / magnitude) * visualDegreesPerSecond * deltaSeconds / latitudeScale
          particleLatitude[index] += (vector.v / magnitude) * visualDegreesPerSecond * deltaSeconds
          if (field.periodicLongitude) {
            let worldShift = 0
            if (particleLongitude[index] > field.grid.east + 360) worldShift = -360
            else if (particleLongitude[index] < field.grid.west - 360) worldShift = 360
            if (worldShift) {
              particleLongitude[index] += worldShift
              for (let history = 0; history < HISTORY_LENGTH; history += 1) {
                historyLongitude[history][index] += worldShift
              }
            }
          }
          if (
            particleLatitude[index] < field.grid.south
            || particleLatitude[index] > field.grid.north
            || (
              !field.periodicLongitude
              && (
                particleLongitude[index] < field.grid.west
                || particleLongitude[index] > field.grid.east
              )
            )
          ) {
            // Latitude boundaries and non-periodic regional edges still
            // reseed; global longitude continues through wrapped worlds.
            resetParticle(index)
          } else {
            historyLongitude[HISTORY_LENGTH - 1][index] = particleLongitude[index]
            historyLatitude[HISTORY_LENGTH - 1][index] = particleLatitude[index]
          }
        }

        for (let history = 0; history < segmentsPerParticle; history += 1) {
          const trailFraction = (history + 1) / segmentsPerParticle
          const opacity = trailFraction ** 1.35
          for (const endpoint of [history, history + 1]) {
            const output = vertex * 2
            positions[output] = longitudeToMercatorX(historyLongitude[endpoint][index])
            positions[output + 1] = latitudeToMercatorY(historyLatitude[endpoint][index])
            intensities[vertex] = magnitude
            opacities[vertex] = opacity
            vertex += 1
          }
        }
      }

      gl.useProgram(program)
      gl.uniformMatrix4fv(
        gl.getUniformLocation(program, 'u_matrix'),
        false,
        options.defaultProjectionData.mainMatrix,
      )
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW)
      const positionLocation = gl.getAttribLocation(program, 'a_position')
      gl.enableVertexAttribArray(positionLocation)
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, intensityBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, intensities, gl.DYNAMIC_DRAW)
      const intensityLocation = gl.getAttribLocation(program, 'a_intensity')
      gl.enableVertexAttribArray(intensityLocation)
      gl.vertexAttribPointer(intensityLocation, 1, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, opacityBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, opacities, gl.DYNAMIC_DRAW)
      const opacityLocation = gl.getAttribLocation(program, 'a_opacity')
      gl.enableVertexAttribArray(opacityLocation)
      gl.vertexAttribPointer(opacityLocation, 1, gl.FLOAT, false, 0, 0)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.disable(gl.DEPTH_TEST)
      const worldOffsetLocation = gl.getUniformLocation(program, 'u_worldOffset')
      for (const worldOffset of [-1, 0, 1]) {
        gl.uniform1f(worldOffsetLocation, worldOffset)
        gl.drawArrays(gl.LINES, 0, vertexCount)
      }
      gl.disableVertexAttribArray(positionLocation)
      gl.disableVertexAttribArray(intensityLocation)
      gl.disableVertexAttribArray(opacityLocation)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
      gl.useProgram(null)
      map.triggerRepaint()
    },
    onRemove(_map, gl) {
      if (positionBuffer) gl.deleteBuffer(positionBuffer)
      if (intensityBuffer) gl.deleteBuffer(intensityBuffer)
      if (opacityBuffer) gl.deleteBuffer(opacityBuffer)
      if (program) gl.deleteProgram(program)
      positionBuffer = null
      intensityBuffer = null
      opacityBuffer = null
      program = null
    },
  }
}

export default function GfsIvtParticlesLayer({
  appState,
  ivtConfig,
  ivtManifest: manifest,
  ivtManifestUrl: manifestUrl,
  mapInstance,
}) {
  const layerRef = useRef(null)
  const forecastHour = Number.parseInt(appState.family?.forecastHour ?? '0', 10)

  useEffect(() => {
    if (!mapInstance || !manifest || appState.projection !== 'mercator') return undefined
    const timestep = manifest.timesteps.find((item) => item.forecastHour === forecastHour)
      ?? manifest.timesteps[0]
    if (!timestep) return undefined
    let cancelled = false
    let styleHandler = null
    let styleDataHandler = null
    let idleHandler = null
    let retryIntervalId = null
    let retryTimeoutId = null

    async function loadLayer() {
      try {
        const texture = await decodeRgbaPng(resolveUrl(timestep.texture, manifestUrl))
        if (cancelled) return
        if (texture.width !== manifest.grid.width || texture.height !== manifest.grid.height) {
          throw new Error('IVT texture dimensions do not match manifest grid')
        }
        const field = decodeField(texture, manifest)
        const addLayer = () => {
          if (cancelled || !mapInstance.isStyleLoaded()) return
          if (mapInstance.getLayer(CUSTOM_LAYER_ID)) {
            mapInstance.triggerRepaint()
            return
          }
          const layer = createParticleLayer(mapInstance, field, ivtConfig.palette)
          try {
            mapInstance.addLayer(layer)
            layerRef.current = layer
          } catch {
            layer.onRemove(mapInstance, mapInstance.getCanvas().getContext('webgl2'))
          }
        }
        styleHandler = addLayer
        styleDataHandler = addLayer
        idleHandler = addLayer
        mapInstance.on('style.load', styleHandler)
        mapInstance.on('styledata', styleDataHandler)
        mapInstance.on('idle', idleHandler)
        retryIntervalId = window.setInterval(addLayer, 250)
        retryTimeoutId = window.setTimeout(() => {
          if (retryIntervalId) window.clearInterval(retryIntervalId)
          retryIntervalId = null
        }, 15000)
        addLayer()
      } catch (error) {
        console.warn('Could not render GFS IVT particles', error)
      }
    }
    loadLayer()
    return () => {
      cancelled = true
      if (styleHandler) mapInstance.off('style.load', styleHandler)
      if (styleDataHandler) mapInstance.off('styledata', styleDataHandler)
      if (idleHandler) mapInstance.off('idle', idleHandler)
      if (retryIntervalId) window.clearInterval(retryIntervalId)
      if (retryTimeoutId) window.clearTimeout(retryTimeoutId)
      if (mapInstance.getLayer(CUSTOM_LAYER_ID)) mapInstance.removeLayer(CUSTOM_LAYER_ID)
      layerRef.current = null
    }
  }, [appState.projection, forecastHour, ivtConfig, manifest, manifestUrl, mapInstance])

  return null
}
