import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import UndoIcon from '@mui/icons-material/Undo'
import RedoIcon from '@mui/icons-material/Redo'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial'
import SpeedIcon from '@mui/icons-material/Speed'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  undo,
  redo,
  populateSampleProject,
  loadTimeline
} from '../store/timelineSlice'
import { clearAllDB } from '../services/db'

export default function Header({ onOpenExport, isSaving, lastSavedTime, onPopulateDemo }) {
  const dispatch = useDispatch()
  const past = useSelector((state) => state.timeline.past)
  const future = useSelector((state) => state.timeline.future)
  const clips = useSelector((state) => state.timeline.present.clips)

  const handleClear = async () => {
    if (window.confirm('Clear timeline and reset project?')) {
      await clearAllDB()
      dispatch(
        loadTimeline({
          currentTime: 0,
          duration: 30,
          clips: [],
          mediaList: []
        })
      )
    }
  }

  const handleBenchmark200Clips = () => {
    const stressClips = []
    const trackIds = ['track-v1', 'track-v2', 'track-a1', 'track-t1']

    for (let i = 0; i < 205; i++) {
      const trackId = trackIds[i % trackIds.length]
      const type = trackId.includes('a') ? 'audio' : trackId.includes('t') ? 'text' : 'video'
      const start = (Math.floor(i / trackIds.length) * 2) + ((i % 2) * 0.5)

      stressClips.push({
        id: `bench-clip-${i}`,
        trackId,
        name: `Clip #${i + 1}`,
        type,
        start,
        duration: 1.8,
        sourceStart: 0,
        text: type === 'text' ? `Text ${i}` : '',
        effects: { brightness: 0, contrast: 1, blur: 0, crossfade: 0 }
      })
    }

    dispatch(
      loadTimeline({
        currentTime: 0,
        duration: 120,
        clips: stressClips
      })
    )
  }

  return (
    <header className="app-header" role="banner">
      <div className="header-brand">
        <span className="brand-title">StudioCut Web</span>
        <span className="brand-badge">WebCodecs & WebGL</span>
      </div>

      <div className="header-actions">
        <div className="save-indicator" aria-live="polite">
          <span className="save-dot" />
          <span>{isSaving ? 'Saving...' : 'Autosaved'}</span>
        </div>

        <button
          className="btn-icon"
          onClick={() => dispatch(undo())}
          disabled={past.length === 0}
          title="Undo (Ctrl+Z)"
          aria-label="Undo action"
        >
          <UndoIcon fontSize="small" />
        </button>

        <button
          className="btn-icon"
          onClick={() => dispatch(redo())}
          disabled={future.length === 0}
          title="Redo (Ctrl+Y)"
          aria-label="Redo action"
        >
          <RedoIcon fontSize="small" />
        </button>

        <div style={{ width: 1, height: 20, backgroundColor: 'var(--border-subtle)', margin: '0 4px' }} />

        <button
          className="btn-secondary"
          onClick={onPopulateDemo}
          title="Load sample video project"
          aria-label="Load demo project"
        >
          <FolderSpecialIcon fontSize="small" />
          <span>Demo Project</span>
        </button>

        <button
          className="btn-secondary"
          onClick={handleBenchmark200Clips}
          title="Stress test timeline with 200+ clips at 60fps"
          aria-label="Stress test 200 clips"
        >
          <SpeedIcon fontSize="small" />
          <span>200+ Clips</span>
        </button>

        <button
          className="btn-secondary"
          onClick={handleClear}
          title="Reset project"
          aria-label="Clear project"
        >
          <DeleteIcon fontSize="small" />
          <span>Reset</span>
        </button>

        <button
          className="btn-primary"
          onClick={onOpenExport}
          title="Render and export timeline"
          aria-label="Export video"
        >
          <FileDownloadIcon fontSize="small" />
          <span>Export</span>
        </button>
      </div>
    </header>
  )
}
