self.onmessage = async (e) => {
  const { id, blob, duration, count = 5, width = 120, height = 68 } = e.data

  try {
    const thumbnails = []
    
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(width, height)
      const ctx = canvas.getContext('2d')
      
      const interval = duration / (count + 1)
      for (let i = 1; i <= count; i++) {
        const timestamp = i * interval
        
        ctx.fillStyle = '#1e293b'
        ctx.fillRect(0, 0, width, height)
        
        const gradient = ctx.createLinearGradient(0, 0, width, height)
        gradient.addColorStop(0, '#0f172a')
        gradient.addColorStop(0.5, '#1e293b')
        gradient.addColorStop(1, '#334155')
        ctx.fillStyle = gradient
        ctx.fillRect(2, 2, width - 4, height - 4)

        ctx.fillStyle = '#64748b'
        ctx.font = '10px monospace'
        ctx.fillText(`${timestamp.toFixed(1)}s`, 6, height - 8)

        const blobResult = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 })
        const reader = new FileReader()
        const dataUrl = await new Promise((res) => {
          reader.onloadend = () => res(reader.result)
          reader.readAsDataURL(blobResult)
        })

        thumbnails.push(dataUrl)
      }
    }

    self.postMessage({ id, status: 'success', thumbnails })
  } catch (err) {
    self.postMessage({ id, status: 'error', error: err.message, thumbnails: [] })
  }
}
