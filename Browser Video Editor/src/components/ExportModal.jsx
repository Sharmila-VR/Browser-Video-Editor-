import React, { useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import CloseIcon from '@mui/icons-material/Close'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { ExportEngine } from '../services/exportEngine'

export default function ExportModal({ isOpen, onClose, playbackEngineRef }) {
  const timelinePresent = useSelector((state) => state.timeline.present)
  const [format, setFormat] = useState('webm')
  const [resolution, setResolution] = useState('720p')
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [totalFrames, setTotalFrames] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [downloadResult, setDownloadResult] = useState(null)
  const exportEngineRef = useRef(null)

  if (!isOpen) return null

  const handleStartExport = async () => {
    const engine = playbackEngineRef.current
    if (!engine || !engine.canvas) return

    setIsExporting(true)
    setProgress(0)
    setDownloadResult(null)

    const exportEngine = new ExportEngine()
    exportEngineRef.current = exportEngine

    const mediaMap = {}
    timelinePresent.mediaList.forEach((m) => {
      mediaMap[m.id] = m
    })

    const exportTimelineState = {
      ...timelinePresent,
      mediaMap
    }

    try {
      const result = await exportEngine.exportVideo({
        canvas: engine.canvas,
        playbackEngine: engine,
        timelineState: exportTimelineState,
        fps: 30,
        format,
        onProgress: (p) => {
          setProgress(p.percent)
          setCurrentFrame(p.frame)
          setTotalFrames(p.totalFrames)
          setElapsedTime(p.elapsedTime)
        }
      })

      if (result) {
        setDownloadResult(result)
      }
    } catch (err) {
      alert('Export failed: ' + err.message)
    } finally {
      setIsExporting(false)
    }
  }

  const handleCancelExport = () => {
    if (exportEngineRef.current) {
      exportEngineRef.current.cancel()
    }
    setIsExporting(false)
  }

  const handleDownload = () => {
    if (!downloadResult) return
    const a = document.createElement('a')
    a.href = downloadResult.url
    a.download = downloadResult.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="export-dialog-title">
      <div className="modal-dialog">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 id="export-dialog-title" className="modal-title" style={{ margin: 0 }}>
            Export Video
          </h2>
          <button
            className="btn-icon"
            onClick={onClose}
            disabled={isExporting}
            aria-label="Close export dialog"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        {!isExporting && !downloadResult && (
          <div>
            <div className="form-group">
              <div className="form-label">
                <span>Output Format</span>
              </div>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                style={{ width: '100%' }}
                aria-label="Output format"
              >
                <option value="webm">WebM (VP9 / Native Browser)</option>
                <option value="mp4">MP4 (AVC / H.264)</option>
              </select>
            </div>

            <div className="form-group">
              <div className="form-label">
                <span>Resolution</span>
              </div>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                style={{ width: '100%' }}
                aria-label="Resolution"
              >
                <option value="720p">720p HD (1280 × 720)</option>
                <option value="1080p">1080p Full HD (1920 × 1080)</option>
                <option value="360p">360p Fast Preview (640 × 360)</option>
              </select>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '16px 0' }}>
              Duration: {timelinePresent.duration?.toFixed(1)}s • Timeline clips: {timelinePresent.clips.length}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleStartExport}>
                <FileDownloadIcon fontSize="small" />
                <span>Start Export</span>
              </button>
            </div>
          </div>
        )}

        {isExporting && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
              Rendering frames ({progress}%)...
            </div>
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
              <span>Frame: {currentFrame} / {totalFrames}</span>
              <span>Elapsed: {elapsedTime}s</span>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" style={{ color: 'var(--accent-red)' }} onClick={handleCancelExport}>
                Cancel Export
              </button>
            </div>
          </div>
        )}

        {downloadResult && (
          <div>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <CheckCircleIcon style={{ fontSize: 48, color: 'var(--accent-emerald)', marginBottom: 8 }} />
              <div style={{ fontSize: 16, fontWeight: 600 }}>Export Complete!</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {downloadResult.filename} • {(downloadResult.blob.size / (1024 * 1024)).toFixed(2)} MB
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={onClose}>
                Close
              </button>
              <button className="btn-primary" onClick={handleDownload}>
                <FileDownloadIcon fontSize="small" />
                <span>Download Video</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
