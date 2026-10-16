import React, { useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import { setCurrentTime, setPlaying } from '../store/timelineSlice'
import { formatTimecode } from '../utils/timelineUtils'
import { PlaybackEngine } from '../services/playbackEngine'

export default function PreviewPlayer({ playbackEngineRef }) {
  const dispatch = useDispatch()
  const canvasRef = useRef(null)
  const isPlaying = useSelector((state) => state.timeline.present.isPlaying)
  const currentTime = useSelector((state) => state.timeline.present.currentTime)
  const duration = useSelector((state) => state.timeline.present.duration)
  const timelinePresent = useSelector((state) => state.timeline.present)

  const stateWithMediaMap = React.useMemo(() => {
    const mediaMap = {}
    timelinePresent.mediaList.forEach((m) => {
      mediaMap[m.id] = m
    })
    return {
      ...timelinePresent,
      mediaMap
    }
  }, [timelinePresent])

  useEffect(() => {
    if (canvasRef.current && !playbackEngineRef.current) {
      playbackEngineRef.current = new PlaybackEngine(canvasRef.current)
    }
    if (playbackEngineRef.current) {
      playbackEngineRef.current.seek(currentTime, stateWithMediaMap)
    }
  }, [stateWithMediaMap, currentTime])

  const togglePlay = () => {
    const engine = playbackEngineRef.current
    if (!engine) return

    if (isPlaying) {
      engine.pause()
      dispatch(setPlaying(false))
    } else {
      dispatch(setPlaying(true))
      engine.play(stateWithMediaMap, (time) => {
        dispatch(setCurrentTime(time))
      })
    }
  }

  const handleStep = (seconds) => {
    const newTime = Math.max(0, Math.min(currentTime + seconds, duration))
    dispatch(setCurrentTime(newTime))
  }

  const handleFullscreen = () => {
    if (canvasRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        canvasRef.current.requestFullscreen()
      }
    }
  }

  return (
    <section className="panel-preview" aria-label="Video Preview Player">
      <div className="preview-canvas-wrapper">
        <canvas
          ref={canvasRef}
          id="preview-canvas"
          className="preview-canvas"
          width={1280}
          height={720}
        />
      </div>

      <div className="preview-controls">
        <div className="playback-buttons">
          <button
            className="btn-icon"
            onClick={() => handleStep(-1)}
            title="Step Back 1s"
            aria-label="Step back 1 second"
          >
            <SkipPreviousIcon fontSize="small" />
          </button>

          <button
            className="btn-primary"
            style={{ width: 36, height: 36, padding: 0, justifyContent: 'center', borderRadius: '50%' }}
            onClick={togglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
          >
            {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
          </button>

          <button
            className="btn-icon"
            onClick={() => handleStep(1)}
            title="Step Forward 1s"
            aria-label="Step forward 1 second"
          >
            <SkipNextIcon fontSize="small" />
          </button>
        </div>

        <div className="timecode-display" aria-label="Current timecode">
          {formatTimecode(currentTime)} / {formatTimecode(duration)}
        </div>

        <div>
          <button
            className="btn-icon"
            onClick={handleFullscreen}
            title="Fullscreen Preview"
            aria-label="Toggle fullscreen"
          >
            <FullscreenIcon fontSize="small" />
          </button>
        </div>
      </div>
    </section>
  )
}
