export class ExportEngine {
  constructor() {
    this.isCancelled = false
    this.mediaRecorder = null
    this.recordedChunks = []
  }

  cancel() {
    this.isCancelled = true
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop()
      } catch {}
    }
  }

  getSupportedMimeType(preferredFormat = 'webm') {
    const types = preferredFormat === 'mp4' 
      ? [
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
          'video/mp4',
          'video/webm;codecs=vp9',
          'video/webm'
        ]
      : [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4'
        ]

    for (let i = 0; i < types.length; i++) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(types[i])) {
        return types[i]
      }
    }
    return 'video/webm'
  }

  async exportVideo(params) {
    const {
      canvas,
      playbackEngine,
      timelineState,
      fps = 30,
      format = 'webm',
      onProgress
    } = params

    this.isCancelled = false
    this.recordedChunks = []

    const mimeType = this.getSupportedMimeType(format)
    const stream = canvas.captureStream(fps)
    this.mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4000000 })

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data)
      }
    }

    const duration = timelineState.duration || 10
    const totalFrames = Math.floor(duration * fps)
    const frameInterval = 1 / fps

    return new Promise(async (resolve, reject) => {
      this.mediaRecorder.onstop = () => {
        if (this.isCancelled) {
          resolve(null)
          return
        }
        const blob = new Blob(this.recordedChunks, { type: mimeType })
        const url = URL.createObjectURL(blob)
        resolve({ blob, url, filename: `export-${Date.now()}.${format}` })
      }

      this.mediaRecorder.onerror = (e) => {
        reject(e)
      }

      this.mediaRecorder.start(100)

      const startTime = performance.now()

      for (let frameIndex = 0; frameIndex <= totalFrames; frameIndex++) {
        if (this.isCancelled) {
          break
        }

        const currentTime = frameIndex * frameInterval
        playbackEngine.seek(currentTime, timelineState)

        const percent = Math.min(100, Math.round((frameIndex / totalFrames) * 100))
        const elapsedTime = (performance.now() - startTime) / 1000

        if (onProgress) {
          onProgress({
            percent,
            frame: frameIndex,
            totalFrames,
            elapsedTime: Math.round(elapsedTime)
          })
        }

        await new Promise((r) => setTimeout(r, 1000 / fps))
      }

      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop()
      }
    })
  }
}
