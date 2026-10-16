import { WebGLRenderer } from './webglRenderer'
import { drawProceduralFrame } from '../utils/sampleMediaGenerator'

export class PlaybackEngine {
  constructor(canvas) {
    this.canvas = canvas
    this.renderer = new WebGLRenderer(canvas)
    this.audioCtx = null
    this.isPlaying = false
    this.currentTime = 0
    this.startAudioTime = 0
    this.startTimelineTime = 0
    this.animationFrameId = null
    this.mediaElements = new Map()
    this.audioSourceNodes = new Map()
    this.onTimeUpdate = null
    this.currentTimelineState = null
    this.activeVideoFrames = []

    this.scratchCanvas = document.createElement('canvas')
    this.scratchCanvas.width = 1280
    this.scratchCanvas.height = 720
    this.scratchCtx = this.scratchCanvas.getContext('2d')

    this.scratchCanvasB = document.createElement('canvas')
    this.scratchCanvasB.width = 1280
    this.scratchCanvasB.height = 720
    this.scratchCtxB = this.scratchCanvasB.getContext('2d')
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass()
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume()
    }
    return this.audioCtx
  }

  getOrCreateMediaElement(mediaItem) {
    if (!mediaItem || !mediaItem.id || !mediaItem.url) return null
    if (this.mediaElements.has(mediaItem.id)) {
      return this.mediaElements.get(mediaItem.id)
    }

    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = mediaItem.url

    this.mediaElements.set(mediaItem.id, video)
    return video
  }

  seek(time, timelineState) {
    this.currentTime = Math.max(0, time)
    this.currentTimelineState = timelineState
    this.renderCurrentFrame()
  }

  async play(timelineState, onTimeUpdate) {
    const ctx = this.getAudioContext()
    this.isPlaying = true
    this.currentTimelineState = timelineState
    this.onTimeUpdate = onTimeUpdate
    this.startAudioTime = ctx ? ctx.currentTime : performance.now() / 1000
    this.startTimelineTime = this.currentTime

    const loop = () => {
      if (!this.isPlaying) return

      const nowAudio = ctx ? ctx.currentTime : performance.now() / 1000
      const elapsed = nowAudio - this.startAudioTime
      this.currentTime = this.startTimelineTime + elapsed

      const maxDuration = timelineState?.duration || 30
      if (this.currentTime >= maxDuration) {
        this.pause()
        this.currentTime = maxDuration
        if (this.onTimeUpdate) this.onTimeUpdate(this.currentTime)
        return
      }

      this.renderCurrentFrame()

      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.currentTime)
      }

      this.animationFrameId = requestAnimationFrame(loop)
    }

    this.animationFrameId = requestAnimationFrame(loop)
  }

  pause() {
    this.isPlaying = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.mediaElements.forEach((video) => {
      if (!video.paused) {
        video.pause()
      }
    })
  }

  renderCurrentFrame() {
    if (!this.currentTimelineState) {
      this.renderer.clear()
      return
    }

    const { tracks = [], clips = [], mediaMap = {} } = this.currentTimelineState
    const time = this.currentTime

    const activeClips = clips.filter((c) => {
      const track = tracks.find((t) => t.id === c.trackId)
      if (track && track.muted) return false
      return time >= c.start && time < c.start + c.duration
    })

    const videoClips = activeClips.filter((c) => c.type === 'video')
    const primaryClip = videoClips[0]
    const secondaryClip = videoClips[1]

    let sourceA = null
    let sourceB = null

    if (primaryClip) {
      const media = mediaMap[primaryClip.mediaId]
      const clipOffset = time - primaryClip.start
      const targetVideoTime = (primaryClip.sourceStart || 0) + clipOffset

      if (media && media.url) {
        const video = this.getOrCreateMediaElement(media)
        if (video) {
          if (Math.abs(video.currentTime - targetVideoTime) > 0.04) {
            video.currentTime = targetVideoTime
          }
          if (this.isPlaying && video.paused && video.readyState >= 2) {
            video.play().catch(() => {})
          } else if (!this.isPlaying && !video.paused) {
            video.pause()
          }
          if (video.readyState >= 2) {
            sourceA = video
          }
        }
      }

      if (!sourceA) {
        const pType = primaryClip.proceduralType || media?.proceduralType || 'city'
        drawProceduralFrame(this.scratchCtx, this.scratchCanvas.width, this.scratchCanvas.height, pType, targetVideoTime)
        sourceA = this.scratchCanvas
      }
    }

    if (secondaryClip) {
      const media = mediaMap[secondaryClip.mediaId]
      const clipOffset = time - secondaryClip.start
      const targetVideoTime = (secondaryClip.sourceStart || 0) + clipOffset

      if (media && media.url) {
        const video = this.getOrCreateMediaElement(media)
        if (video) {
          if (Math.abs(video.currentTime - targetVideoTime) > 0.04) {
            video.currentTime = targetVideoTime
          }
          if (this.isPlaying && video.paused && video.readyState >= 2) {
            video.play().catch(() => {})
          } else if (!this.isPlaying && !video.paused) {
            video.pause()
          }
          if (video.readyState >= 2) {
            sourceB = video
          }
        }
      }

      if (!sourceB) {
        const pType = secondaryClip.proceduralType || media?.proceduralType || 'sunset'
        drawProceduralFrame(this.scratchCtxB, this.scratchCanvasB.width, this.scratchCanvasB.height, pType, targetVideoTime)
        sourceB = this.scratchCanvasB
      }
    }

    const effects = primaryClip?.effects || {
      brightness: 0,
      contrast: 1,
      blur: 0,
      crossfade: 0
    }

    this.renderer.render({
      sourceA,
      sourceB,
      crossfade: effects.crossfade || 0,
      brightness: effects.brightness || 0,
      contrast: effects.contrast !== undefined ? effects.contrast : 1,
      blur: effects.blur || 0
    })

    this.renderTextOverlays(activeClips.filter((c) => c.type === 'text'))
  }

  renderTextOverlays(textClips) {
    if (!textClips || textClips.length === 0) return
    const gl = this.renderer.gl
    if (!gl) return

    const overlayCanvas = document.createElement('canvas')
    overlayCanvas.width = this.canvas.width
    overlayCanvas.height = this.canvas.height
    const ctx = overlayCanvas.getContext('2d')

    textClips.forEach((clip) => {
      if (!clip.text) return
      ctx.fillStyle = clip.fontColor || '#ffffff'
      ctx.font = `bold ${clip.fontSize || 36}px Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur = 6
      const x = overlayCanvas.width * (clip.posX !== undefined ? clip.posX : 0.5)
      const y = overlayCanvas.height * (clip.posY !== undefined ? clip.posY : 0.5)
      ctx.fillText(clip.text, x, y)
    })

    const tempCtx = this.canvas.getContext('2d')
    if (tempCtx) {
      tempCtx.drawImage(overlayCanvas, 0, 0)
    }
  }

  destroy() {
    this.pause()
    this.mediaElements.forEach((video) => {
      video.pause()
      video.removeAttribute('src')
      video.load()
    })
    this.mediaElements.clear()
    this.activeVideoFrames.forEach((f) => {
      if (typeof f.close === 'function') f.close()
    })
    this.activeVideoFrames = []
    if (this.renderer) {
      this.renderer.destroy()
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {})
    }
    this.audioCtx = null
  }
}
