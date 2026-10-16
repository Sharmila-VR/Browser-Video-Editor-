import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import ContentCutIcon from '@mui/icons-material/ContentCut'
import DeleteIcon from '@mui/icons-material/Delete'
import PushPinIcon from '@mui/icons-material/PushPin'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import AddIcon from '@mui/icons-material/Add'
import MovieIcon from '@mui/icons-material/Movie'
import AudiotrackIcon from '@mui/icons-material/Audiotrack'
import TitleIcon from '@mui/icons-material/Title'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import {
  setCurrentTime,
  setZoom,
  toggleSnapping,
  selectClip,
  selectTrack,
  deleteClip,
  trimClipAction,
  splitClipAtPlayheadAction,
  moveClipAction,
  addTrack,
  deleteTrack,
  toggleMuteTrack,
  toggleLockTrack
} from '../store/timelineSlice'
import {
  secondsToPixels,
  pixelsToSeconds,
  snapTime,
  getSnapTargets,
  formatTimecode
} from '../utils/timelineUtils'

export default function Timeline() {
  const dispatch = useDispatch()
  const lanesContainerRef = useRef(null)

  const currentTime = useSelector((state) => state.timeline.present.currentTime)
  const duration = useSelector((state) => state.timeline.present.duration)
  const zoom = useSelector((state) => state.timeline.present.zoom)
  const snappingEnabled = useSelector((state) => state.timeline.present.snappingEnabled)
  const tracks = useSelector((state) => state.timeline.present.tracks)
  const clips = useSelector((state) => state.timeline.present.clips)
  const selectedClipId = useSelector((state) => state.timeline.present.selectedClipId)
  const mediaList = useSelector((state) => state.timeline.present.mediaList)

  const [activeDrag, setActiveDrag] = useState(null)
  const [snapGuideX, setSnapGuideX] = useState(null)

  const mediaMap = useMemo(() => {
    const map = {}
    mediaList.forEach((m) => {
      map[m.id] = m
    })
    return map
  }, [mediaList])

  const timelineWidth = Math.max(1200, secondsToPixels(duration + 10, zoom))

  const rulerTicks = useMemo(() => {
    const ticks = []
    const step = zoom < 30 ? 5 : zoom < 80 ? 2 : 1
    const totalSeconds = Math.ceil(duration + 10)

    for (let sec = 0; sec <= totalSeconds; sec += step) {
      ticks.push({
        second: sec,
        x: secondsToPixels(sec, zoom)
      })
    }
    return ticks
  }, [duration, zoom])

  const handleRulerMouseDown = (e) => {
    if (!lanesContainerRef.current) return
    const rect = lanesContainerRef.current.getBoundingClientRect()
    const scrollLeft = lanesContainerRef.current.scrollLeft
    const clickX = e.clientX - rect.left + scrollLeft
    const time = Math.max(0, pixelsToSeconds(clickX, zoom))
    dispatch(setCurrentTime(time))

    const onMouseMove = (moveEvent) => {
      const currentScrollLeft = lanesContainerRef.current ? lanesContainerRef.current.scrollLeft : 0
      const moveX = moveEvent.clientX - rect.left + currentScrollLeft
      const newTime = Math.max(0, pixelsToSeconds(moveX, zoom))
      dispatch(setCurrentTime(newTime))
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const handleClipMouseDown = (e, clip) => {
    e.stopPropagation()
    const track = tracks.find((t) => t.id === clip.trackId)
    if (track && track.locked) return

    dispatch(selectClip(clip.id))

    const startX = e.clientX
    const initialStart = clip.start

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaSeconds = deltaX / zoom
      let newStart = Math.max(0, initialStart + deltaSeconds)

      if (snappingEnabled) {
        const targets = getSnapTargets(tracks, clips, currentTime, clip.id)
        const snap = snapTime(newStart, targets, 0.25)
        if (snap.snapped) {
          newStart = snap.time
          setSnapGuideX(secondsToPixels(snap.time, zoom))
        } else {
          setSnapGuideX(null)
        }
      }

      setActiveDrag({
        type: 'move',
        clipId: clip.id,
        currentStart: newStart
      })
    }

    const onMouseUp = (upEvent) => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      setSnapGuideX(null)

      const deltaX = upEvent.clientX - startX
      const deltaSeconds = deltaX / zoom
      let finalStart = Math.max(0, initialStart + deltaSeconds)

      let targetTrackId = clip.trackId
      if (lanesContainerRef.current) {
        const lanesRect = lanesContainerRef.current.getBoundingClientRect()
        const mouseY = upEvent.clientY - lanesRect.top
        const trackIndex = Math.floor((mouseY - 28) / 56)
        if (trackIndex >= 0 && trackIndex < tracks.length) {
          targetTrackId = tracks[trackIndex].id
        }
      }

      dispatch(
        moveClipAction({
          clipId: clip.id,
          newTrackId: targetTrackId,
          newStart: finalStart
        })
      )
      setActiveDrag(null)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const handleTrimStartMouseDown = (e, clip) => {
    e.stopPropagation()
    const track = tracks.find((t) => t.id === clip.trackId)
    if (track && track.locked) return

    dispatch(selectClip(clip.id))
    const startX = e.clientX
    const originalStart = clip.start
    const originalEnd = clip.start + clip.duration

    const onMouseMove = (moveEvent) => {
      const deltaSeconds = (moveEvent.clientX - startX) / zoom
      let proposedStart = originalStart + deltaSeconds
      if (proposedStart >= originalEnd - 0.2) {
        proposedStart = originalEnd - 0.2
      }
      if (proposedStart < 0) proposedStart = 0

      if (snappingEnabled) {
        const targets = getSnapTargets(tracks, clips, currentTime, clip.id)
        const snap = snapTime(proposedStart, targets, 0.2)
        if (snap.snapped) {
          proposedStart = snap.time
          setSnapGuideX(secondsToPixels(snap.time, zoom))
        } else {
          setSnapGuideX(null)
        }
      }

      setActiveDrag({
        type: 'trim-start',
        clipId: clip.id,
        start: proposedStart,
        end: originalEnd
      })
    }

    const onMouseUp = (upEvent) => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      setSnapGuideX(null)

      const deltaSeconds = (upEvent.clientX - startX) / zoom
      let finalStart = Math.max(0, originalStart + deltaSeconds)
      if (finalStart >= originalEnd - 0.2) {
        finalStart = originalEnd - 0.2
      }

      dispatch(
        trimClipAction({
          clipId: clip.id,
          newStart: finalStart,
          newEnd: originalEnd
        })
      )
      setActiveDrag(null)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const handleTrimEndMouseDown = (e, clip) => {
    e.stopPropagation()
    const track = tracks.find((t) => t.id === clip.trackId)
    if (track && track.locked) return

    dispatch(selectClip(clip.id))
    const startX = e.clientX
    const clipStart = clip.start
    const originalEnd = clip.start + clip.duration

    const onMouseMove = (moveEvent) => {
      const deltaSeconds = (moveEvent.clientX - startX) / zoom
      let proposedEnd = originalEnd + deltaSeconds
      if (proposedEnd <= clipStart + 0.2) {
        proposedEnd = clipStart + 0.2
      }

      if (snappingEnabled) {
        const targets = getSnapTargets(tracks, clips, currentTime, clip.id)
        const snap = snapTime(proposedEnd, targets, 0.2)
        if (snap.snapped) {
          proposedEnd = snap.time
          setSnapGuideX(secondsToPixels(snap.time, zoom))
        } else {
          setSnapGuideX(null)
        }
      }

      setActiveDrag({
        type: 'trim-end',
        clipId: clip.id,
        start: clipStart,
        end: proposedEnd
      })
    }

    const onMouseUp = (upEvent) => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      setSnapGuideX(null)

      const deltaSeconds = (upEvent.clientX - startX) / zoom
      let finalEnd = originalEnd + deltaSeconds
      if (finalEnd <= clipStart + 0.2) {
        finalEnd = clipStart + 0.2
      }

      dispatch(
        trimClipAction({
          clipId: clip.id,
          newStart: clipStart,
          newEnd: finalEnd
        })
      )
      setActiveDrag(null)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const playheadPositionX = secondsToPixels(currentTime, zoom)

  return (
    <section className="timeline-panel" aria-label="Multi-track Timeline">
      <div className="timeline-toolbar">
        <div className="timeline-tools-left">
          <button
            className="btn-secondary"
            style={{ fontSize: 12, padding: '4px 8px' }}
            onClick={() => dispatch(splitClipAtPlayheadAction(currentTime))}
            title="Split clip at playhead (S)"
            aria-label="Split clip at playhead"
          >
            <ContentCutIcon fontSize="small" style={{ fontSize: 16 }} />
            <span>Split</span>
          </button>

          <button
            className="btn-secondary"
            style={{ fontSize: 12, padding: '4px 8px' }}
            onClick={() => dispatch(deleteClip(selectedClipId))}
            disabled={!selectedClipId}
            title="Delete selected clip (Delete)"
            aria-label="Delete selected clip"
          >
            <DeleteIcon fontSize="small" style={{ fontSize: 16 }} />
            <span>Delete</span>
          </button>

          <button
            className={`btn-secondary ${snappingEnabled ? 'active' : ''}`}
            style={{
              fontSize: 12,
              padding: '4px 8px',
              backgroundColor: snappingEnabled ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              borderColor: snappingEnabled ? 'var(--accent-blue)' : 'var(--border-subtle)',
              color: snappingEnabled ? '#60a5fa' : 'var(--text-secondary)'
            }}
            onClick={() => dispatch(toggleSnapping())}
            title="Toggle Snapping Magnet"
            aria-label="Toggle timeline snapping"
          >
            <PushPinIcon fontSize="small" style={{ fontSize: 16 }} />
            <span>Snap</span>
          </button>

          <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
            <button
              className="btn-secondary"
              style={{ fontSize: 11, padding: '3px 6px' }}
              onClick={() => dispatch(addTrack({ type: 'video' }))}
              aria-label="Add video track"
            >
              <AddIcon style={{ fontSize: 14 }} />
              <span>+Video</span>
            </button>
            <button
              className="btn-secondary"
              style={{ fontSize: 11, padding: '3px 6px' }}
              onClick={() => dispatch(addTrack({ type: 'audio' }))}
              aria-label="Add audio track"
            >
              <AddIcon style={{ fontSize: 14 }} />
              <span>+Audio</span>
            </button>
            <button
              className="btn-secondary"
              style={{ fontSize: 11, padding: '3px 6px' }}
              onClick={() => dispatch(addTrack({ type: 'text' }))}
              aria-label="Add text track"
            >
              <AddIcon style={{ fontSize: 14 }} />
              <span>+Text</span>
            </button>
          </div>
        </div>

        <div className="timeline-tools-right">
          <button
            className="btn-icon"
            onClick={() => dispatch(setZoom(zoom - 10))}
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOutIcon fontSize="small" />
          </button>
          <input
            type="range"
            min="20"
            max="200"
            value={zoom}
            onChange={(e) => dispatch(setZoom(parseInt(e.target.value)))}
            style={{ width: 90 }}
            className="slider-input"
            aria-label="Timeline zoom slider"
          />
          <button
            className="btn-icon"
            onClick={() => dispatch(setZoom(zoom + 10))}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomInIcon fontSize="small" />
          </button>
        </div>
      </div>

      <div className="timeline-viewport">
        <div className="track-headers-column">
          <div className="track-header-top-spacer">
            <span>TRACKS ({tracks.length})</span>
          </div>
          {tracks.map((track) => (
            <div key={track.id} className="track-header-item">
              <div className="track-name-badge">
                <span className={`track-type-tag track-type-${track.type}`}>
                  {track.type[0]}
                </span>
                <span>{track.name}</span>
              </div>
              <div className="track-controls">
                <button
                  className="btn-icon"
                  style={{ padding: 4 }}
                  onClick={() => dispatch(toggleMuteTrack(track.id))}
                  title={track.muted ? 'Unmute' : 'Mute'}
                  aria-label={`${track.muted ? 'Unmute' : 'Mute'} ${track.name}`}
                >
                  {track.muted ? (
                    <VolumeOffIcon style={{ fontSize: 15, color: 'var(--accent-red)' }} />
                  ) : (
                    <VolumeUpIcon style={{ fontSize: 15, color: 'var(--text-muted)' }} />
                  )}
                </button>
                <button
                  className="btn-icon"
                  style={{ padding: 4 }}
                  onClick={() => dispatch(toggleLockTrack(track.id))}
                  title={track.locked ? 'Unlock' : 'Lock'}
                  aria-label={`${track.locked ? 'Unlock' : 'Lock'} ${track.name}`}
                >
                  {track.locked ? (
                    <LockIcon style={{ fontSize: 15, color: 'var(--accent-amber)' }} />
                  ) : (
                    <LockOpenIcon style={{ fontSize: 15, color: 'var(--text-muted)' }} />
                  )}
                </button>
                <button
                  className="btn-icon"
                  style={{ padding: 4 }}
                  onClick={() => dispatch(deleteTrack(track.id))}
                  title="Delete track"
                  aria-label={`Delete ${track.name}`}
                >
                  <DeleteIcon style={{ fontSize: 15, color: 'var(--text-muted)' }} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div ref={lanesContainerRef} className="timeline-lanes-scrollable">
          <div style={{ width: timelineWidth, position: 'relative' }}>
            <div
              className="timeline-ruler"
              onMouseDown={handleRulerMouseDown}
              role="slider"
              aria-label="Timeline scrubber ruler"
              aria-valuenow={currentTime}
            >
              {rulerTicks.map((tick) => (
                <div key={tick.second} className="ruler-tick" style={{ left: tick.x }}>
                  {formatTimecode(tick.second).slice(3, 8)}
                </div>
              ))}
            </div>

            <div
              className="playhead-line"
              style={{ left: playheadPositionX, height: tracks.length * 56 + 28 }}
            >
              <div className="playhead-head" onMouseDown={handleRulerMouseDown} />
            </div>

            {snapGuideX !== null && (
              <div
                className="snap-guide"
                style={{ left: snapGuideX, height: tracks.length * 56 + 28 }}
              />
            )}

            {tracks.map((track) => {
              const trackClips = clips.filter((c) => c.trackId === track.id)

              return (
                <div key={track.id} className="track-lane">
                  {trackClips.map((clip) => {
                    let clipStart = clip.start
                    let clipDuration = clip.duration

                    if (activeDrag && activeDrag.clipId === clip.id) {
                      if (activeDrag.type === 'move') {
                        clipStart = activeDrag.currentStart
                      } else if (activeDrag.type === 'trim-start') {
                        clipStart = activeDrag.start
                        clipDuration = activeDrag.end - activeDrag.start
                      } else if (activeDrag.type === 'trim-end') {
                        clipDuration = activeDrag.end - activeDrag.start
                      }
                    }

                    const clipLeft = secondsToPixels(clipStart, zoom)
                    const clipWidth = Math.max(12, secondsToPixels(clipDuration, zoom))
                    const isSelected = selectedClipId === clip.id

                    return (
                      <div
                        key={clip.id}
                        className={`timeline-clip clip-${clip.type} ${isSelected ? 'selected' : ''}`}
                        style={{
                          left: clipLeft,
                          width: clipWidth,
                          opacity: track.locked ? 0.75 : 1
                        }}
                        onMouseDown={(e) => handleClipMouseDown(e, clip)}
                        role="button"
                        tabIndex={0}
                        aria-label={`${clip.name}, start ${clipStart.toFixed(1)}s, duration ${clipDuration.toFixed(1)}s`}
                      >
                        <div
                          className="clip-trim-handle trim-left"
                          onMouseDown={(e) => handleTrimStartMouseDown(e, clip)}
                          title="Trim Left"
                        />

                        {clip.type === 'video' && mediaMap[clip.mediaId]?.thumbnails?.length > 0 && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', opacity: 0.3, pointerEvents: 'none', overflow: 'hidden' }}>
                            {mediaMap[clip.mediaId].thumbnails.map((t, i) => (
                              <img key={i} src={t} alt="" style={{ height: '100%', width: 60, objectFit: 'cover', flexShrink: 0 }} />
                            ))}
                          </div>
                        )}

                        <div className="clip-content">
                          {clip.name} {clip.text ? `("${clip.text}")` : ''}
                        </div>

                        <div
                          className="clip-trim-handle trim-right"
                          onMouseDown={(e) => handleTrimEndMouseDown(e, clip)}
                          title="Trim Right"
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
