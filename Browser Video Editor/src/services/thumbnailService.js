let workerInstance = null

function getWorker() {
  if (!workerInstance && typeof window !== 'undefined' && window.Worker) {
    try {
      workerInstance = new Worker(
        new URL('../workers/thumbnailWorker.js', import.meta.url),
        { type: 'module' }
      )
    } catch {
      workerInstance = null
    }
  }
  return workerInstance
}

export async function generateThumbnails(mediaId, blobOrUrl, duration, count = 5) {
  return new Promise((resolve) => {
    const worker = getWorker()

    if (worker && blobOrUrl instanceof Blob) {
      const messageHandler = (e) => {
        if (e.data.id === mediaId) {
          worker.removeEventListener('message', messageHandler)
          if (e.data.status === 'success' && e.data.thumbnails.length > 0) {
            resolve(e.data.thumbnails)
          } else {
            fallbackVideoElementThumbnails(blobOrUrl, duration, count).then(resolve)
          }
        }
      }

      worker.addEventListener('message', messageHandler)
      worker.postMessage({
        id: mediaId,
        blob: blobOrUrl,
        duration,
        count
      })

      setTimeout(() => {
        worker.removeEventListener('message', messageHandler)
        fallbackVideoElementThumbnails(blobOrUrl, duration, count).then(resolve)
      }, 3000)
    } else {
      fallbackVideoElementThumbnails(blobOrUrl, duration, count).then(resolve)
    }
  })
}

async function fallbackVideoElementThumbnails(src, duration, count = 5) {
  const url = src instanceof Blob ? URL.createObjectURL(src) : src
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'metadata'
  video.src = url

  const thumbnails = []
  const canvas = document.createElement('canvas')
  canvas.width = 120
  canvas.height = 68
  const ctx = canvas.getContext('2d')

  await new Promise((res) => {
    video.onloadedmetadata = () => res()
    video.onerror = () => res()
    setTimeout(res, 2000)
  })

  const validDuration = duration || video.duration || 10
  const interval = validDuration / (count + 1)

  for (let i = 1; i <= count; i++) {
    const targetTime = i * interval
    await new Promise((res) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked)
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          thumbnails.push(canvas.toDataURL('image/jpeg', 0.6))
        } catch {
          thumbnails.push('')
        }
        res()
      }
      video.addEventListener('seeked', onSeeked)
      video.currentTime = targetTime
      setTimeout(res, 300)
    })
  }

  video.pause()
  video.removeAttribute('src')
  video.load()

  return thumbnails
}
