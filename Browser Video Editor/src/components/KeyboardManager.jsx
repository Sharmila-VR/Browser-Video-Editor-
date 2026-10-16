import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  setCurrentTime,
  setPlaying,
  deleteClip,
  splitClipAtPlayheadAction,
  trimClipAction,
  undo,
  redo
} from '../store/timelineSlice'

export default function KeyboardManager({ playbackEngineRef }) {
  const dispatch = useDispatch()
  const currentTime = useSelector((state) => state.timeline.present.currentTime)
  const duration = useSelector((state) => state.timeline.present.duration)
  const isPlaying = useSelector((state) => state.timeline.present.isPlaying)
  const selectedClipId = useSelector((state) => state.timeline.present.selectedClipId)
  const clips = useSelector((state) => state.timeline.present.clips)
  const timelinePresent = useSelector((state) => state.timeline.present)

  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : ''
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          dispatch(redo())
        } else {
          dispatch(undo())
        }
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        dispatch(redo())
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        const engine = playbackEngineRef.current
        if (!engine) return
        if (isPlaying) {
          engine.pause()
          dispatch(setPlaying(false))
        } else {
          dispatch(setPlaying(true))
          engine.play(timelinePresent, (time) => {
            dispatch(setCurrentTime(time))
          })
        }
        return
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const step = e.shiftKey ? 2.0 : 0.1
        dispatch(setCurrentTime(Math.max(0, currentTime - step)))
        return
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        const step = e.shiftKey ? 2.0 : 0.1
        dispatch(setCurrentTime(Math.min(duration, currentTime + step)))
        return
      }

      if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        dispatch(splitClipAtPlayheadAction(currentTime))
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault()
          dispatch(deleteClip(selectedClipId))
        }
        return
      }

      if (e.key === '[' && selectedClipId) {
        e.preventDefault()
        const clip = clips.find((c) => c.id === selectedClipId)
        if (clip && currentTime > clip.start && currentTime < clip.start + clip.duration) {
          dispatch(
            trimClipAction({
              clipId: clip.id,
              newStart: currentTime,
              newEnd: clip.start + clip.duration
            })
          )
        }
        return
      }

      if (e.key === ']' && selectedClipId) {
        e.preventDefault()
        const clip = clips.find((c) => c.id === selectedClipId)
        if (clip && currentTime > clip.start && currentTime < clip.start + clip.duration) {
          dispatch(
            trimClipAction({
              clipId: clip.id,
              newStart: clip.start,
              newEnd: currentTime
            })
          )
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, currentTime, duration, isPlaying, selectedClipId, clips, timelinePresent, playbackEngineRef])

  return null
}
