export function drawProceduralFrame(ctx, width, height, type = 'city', t = 0) {
  ctx.clearRect(0, 0, width, height)

  if (type === 'city') {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height)
    skyGrad.addColorStop(0, '#020617')
    skyGrad.addColorStop(0.5, '#1e1b4b')
    skyGrad.addColorStop(1, '#3b0764')
    ctx.fillStyle = skyGrad
    ctx.fillRect(0, 0, width, height)

    for (let i = 0; i < 45; i++) {
      const sx = ((i * 47) + (t * 2)) % width
      const sy = (i * 29) % (height * 0.55)
      const alpha = 0.5 + Math.sin(t * 3 + i) * 0.4
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
      ctx.fillRect(sx, sy, 2, 2)
    }

    ctx.beginPath()
    ctx.arc(width * 0.82, height * 0.22, 34, 0, Math.PI * 2)
    ctx.fillStyle = '#fef08a'
    ctx.shadowColor = '#fef08a'
    ctx.shadowBlur = 18
    ctx.fill()
    ctx.shadowBlur = 0

    const buildings = [
      { x: 0, w: width * 0.14, h: height * 0.55, c: '#090d16' },
      { x: width * 0.12, w: width * 0.16, h: height * 0.72, c: '#0f172a' },
      { x: width * 0.26, w: width * 0.13, h: height * 0.48, c: '#090d16' },
      { x: width * 0.37, w: width * 0.18, h: height * 0.82, c: '#1e293b' },
      { x: width * 0.53, w: width * 0.15, h: height * 0.60, c: '#0f172a' },
      { x: width * 0.66, w: width * 0.18, h: height * 0.76, c: '#1e293b' },
      { x: width * 0.82, w: width * 0.20, h: height * 0.52, c: '#090d16' }
    ]

    buildings.forEach((b) => {
      const by = height - b.h
      ctx.fillStyle = b.c
      ctx.fillRect(b.x, by, b.w, b.h)

      const winCols = Math.max(2, Math.floor(b.w / 18))
      const winRows = Math.max(3, Math.floor(b.h / 22))

      for (let r = 0; r < winRows; r++) {
        for (let c = 0; c < winCols; c++) {
          const seed = r * 13 + c * 7 + Math.floor(t * 2)
          if (seed % 4 === 0) {
            ctx.fillStyle = '#38bdf8'
          } else if (seed % 5 === 0) {
            ctx.fillStyle = '#f43f5e'
          } else if (seed % 3 === 0) {
            ctx.fillStyle = '#fbbf24'
          } else {
            continue
          }
          ctx.fillRect(b.x + 6 + c * 16, by + 10 + r * 20, 8, 11)
        }
      }
    })

    const roadY = height - 24
    ctx.fillStyle = '#05070e'
    ctx.fillRect(0, roadY, width, 24)

    for (let car = 0; car < 12; car++) {
      const hx = ((car * 120) + (t * 180)) % (width + 60) - 30
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(hx, roadY + 5, 14, 4)

      const tx = width - (((car * 120) + (t * 180)) % (width + 60))
      ctx.fillStyle = '#fef08a'
      ctx.fillRect(tx, roadY + 14, 14, 4)
    }

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 24px Inter, sans-serif'
    ctx.fillText('CYBERPUNK METROPOLIS', 36, 44)
    ctx.fillStyle = '#38bdf8'
    ctx.font = '14px monospace'
    ctx.fillText(`TIMECODE: ${t.toFixed(2)}s | 60FPS 1080p`, 36, 68)
  } else if (type === 'sunset') {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height)
    skyGrad.addColorStop(0, '#7c2d12')
    skyGrad.addColorStop(0.3, '#c2410c')
    skyGrad.addColorStop(0.6, '#ea580c')
    skyGrad.addColorStop(0.8, '#f59e0b')
    skyGrad.addColorStop(1, '#312e81')
    ctx.fillStyle = skyGrad
    ctx.fillRect(0, 0, width, height)

    const sunY = height * 0.45 + Math.sin(t * 0.4) * 8
    ctx.beginPath()
    ctx.arc(width * 0.5, sunY, 52, 0, Math.PI * 2)
    ctx.fillStyle = '#fef08a'
    ctx.shadowColor = '#fef08a'
    ctx.shadowBlur = 32
    ctx.fill()
    ctx.shadowBlur = 0

    const seaY = height * 0.62
    const seaGrad = ctx.createLinearGradient(0, seaY, 0, height)
    seaGrad.addColorStop(0, '#1e1b4b')
    seaGrad.addColorStop(0.5, '#0f172a')
    seaGrad.addColorStop(1, '#020617')
    ctx.fillStyle = seaGrad
    ctx.fillRect(0, seaY, width, height - seaY)

    for (let i = 0; i < 22; i++) {
      const wy = seaY + 4 + i * 8
      const wPhase = t * 3 + i * 0.6
      const refAlpha = Math.max(0, 0.7 - (i * 0.03))
      ctx.fillStyle = `rgba(254, 240, 138, ${refAlpha})`
      const refW = (180 - i * 6) + Math.sin(wPhase) * 20
      ctx.fillRect(width * 0.5 - refW / 2, wy, refW, 2)
    }

    ctx.strokeStyle = '#020617'
    ctx.lineWidth = 2
    for (let bird = 0; bird < 4; bird++) {
      const bx = ((bird * 160) + (t * 50)) % (width + 60) - 30
      const by = height * 0.22 + Math.sin(t * 2 + bird) * 12 + bird * 18
      ctx.beginPath()
      ctx.moveTo(bx - 10, by + 4)
      ctx.quadraticCurveTo(bx - 5, by - 6, bx, by)
      ctx.quadraticCurveTo(bx + 5, by - 6, bx + 10, by + 4)
      ctx.stroke()
    }

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 24px Inter, sans-serif'
    ctx.fillText('OCEAN GOLDEN SUNSET', 36, 44)
    ctx.fillStyle = '#fed7aa'
    ctx.font = '14px monospace'
    ctx.fillText(`TIMECODE: ${t.toFixed(2)}s | 60FPS 1080p`, 36, 68)
  } else if (type === 'retro') {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height)
    skyGrad.addColorStop(0, '#0f051d')
    skyGrad.addColorStop(0.5, '#2e1065')
    skyGrad.addColorStop(1, '#581c87')
    ctx.fillStyle = skyGrad
    ctx.fillRect(0, 0, width, height)

    const sunY = height * 0.44
    ctx.beginPath()
    ctx.arc(width * 0.5, sunY, 65, 0, Math.PI * 2)
    const sunGrad = ctx.createLinearGradient(0, sunY - 65, 0, sunY + 65)
    sunGrad.addColorStop(0, '#fde047')
    sunGrad.addColorStop(0.5, '#f43f5e')
    sunGrad.addColorStop(1, '#8b5cf6')
    ctx.fillStyle = sunGrad
    ctx.fill()

    ctx.fillStyle = '#2e1065'
    for (let stripe = 0; stripe < 6; stripe++) {
      const sy = sunY - 10 + stripe * 12
      ctx.fillRect(width * 0.5 - 65, sy, 130, 2 + stripe)
    }

    const gridY = height * 0.6
    ctx.fillStyle = '#090014'
    ctx.fillRect(0, gridY, width, height - gridY)

    ctx.strokeStyle = '#ec4899'
    ctx.lineWidth = 1.5
    for (let c = -10; c <= 10; c++) {
      ctx.beginPath()
      ctx.moveTo(width * 0.5 + c * 25, gridY)
      ctx.lineTo(width * 0.5 + c * 110, height)
      ctx.stroke()
    }

    const gridOffset = (t * 70) % 35
    for (let z = 0; z < 8; z++) {
      const gy = gridY + Math.pow(z / 7, 2) * (height - gridY) + gridOffset * (z / 7)
      if (gy <= height && gy >= gridY) {
        ctx.beginPath()
        ctx.moveTo(0, gy)
        ctx.lineTo(width, gy)
        ctx.stroke()
      }
    }

    ctx.fillStyle = '#38bdf8'
    ctx.font = 'bold 24px Inter, sans-serif'
    ctx.fillText('RETRO SYNTHWAVE 80S', 36, 44)
    ctx.fillStyle = '#f472b6'
    ctx.font = '14px monospace'
    ctx.fillText(`TIMECODE: ${t.toFixed(2)}s | 60FPS 1080p`, 36, 68)
  } else {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height)
    skyGrad.addColorStop(0, '#030712')
    skyGrad.addColorStop(0.5, '#064e3b')
    skyGrad.addColorStop(1, '#022c22')
    ctx.fillStyle = skyGrad
    ctx.fillRect(0, 0, width, height)

    for (let w = 0; w < 3; w++) {
      ctx.beginPath()
      ctx.moveTo(0, height * 0.3)
      for (let x = 0; x <= width; x += 15) {
        const ay = height * 0.3 + Math.sin(x * 0.01 + t * 2 + w) * 35 + Math.cos(x * 0.02 + t) * 20
        ctx.lineTo(x, ay)
      }
      ctx.lineTo(width, height * 0.6)
      ctx.lineTo(0, height * 0.6)
      ctx.closePath()
      ctx.fillStyle = w === 0 ? 'rgba(52, 211, 153, 0.25)' : 'rgba(167, 139, 250, 0.2)'
      ctx.fill()
    }

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 24px Inter, sans-serif'
    ctx.fillText('ARCTIC AURORA NIGHT', 36, 44)
    ctx.fillStyle = '#6ee7b7'
    ctx.font = '14px monospace'
    ctx.fillText(`TIMECODE: ${t.toFixed(2)}s | 60FPS 1080p`, 36, 68)
  }
}

export function generateInstantDummyMedia(type = 'city', durationSec = 8) {
  const thumbCanvas = document.createElement('canvas')
  thumbCanvas.width = 120
  thumbCanvas.height = 68
  const thumbCtx = thumbCanvas.getContext('2d')

  const thumbnails = []
  const count = 4
  const interval = durationSec / (count + 1)

  for (let i = 1; i <= count; i++) {
    drawProceduralFrame(thumbCtx, thumbCanvas.width, thumbCanvas.height, type, i * interval)
    thumbnails.push(thumbCanvas.toDataURL('image/jpeg', 0.7))
  }

  const names = {
    city: 'Cyberpunk Metropolis 1080p',
    sunset: 'Golden Ocean Sunset 1080p',
    retro: 'Retro Synthwave 80s 1080p',
    nature: 'Arctic Aurora Night 1080p'
  }

  return {
    id: `dummy-${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: names[type] || 'Sample Video',
    type: 'video',
    proceduralType: type,
    duration: durationSec,
    size: 2400000,
    url: '',
    thumbnails
  }
}

export async function generateSampleVideo(type = 'city', durationSec = 8) {
  const dummy = generateInstantDummyMedia(type, durationSec)

  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 360
  const ctx = canvas.getContext('2d')

  let stream = null
  try {
    stream = canvas.captureStream(30)
  } catch {
    return dummy
  }

  let mimeType = 'video/webm'
  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9'
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      mimeType = 'video/webm;codecs=vp8'
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4'
    }
  }

  try {
    const recorder = new MediaRecorder(stream, { mimeType })
    const chunks = []
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data)
    }

    recorder.start()

    const framesToRecord = 20
    for (let f = 0; f < framesToRecord; f++) {
      drawProceduralFrame(ctx, canvas.width, canvas.height, type, f * (durationSec / framesToRecord))
      await new Promise((r) => setTimeout(r, 12))
    }

    recorder.stop()

    const blob = await new Promise((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: mimeType }))
      }
      setTimeout(() => resolve(new Blob([], { type: mimeType })), 500)
    })

    const url = blob.size > 0 ? URL.createObjectURL(blob) : ''
    return {
      ...dummy,
      blob,
      url,
      size: blob.size || dummy.size
    }
  } catch {
    return dummy
  }
}
