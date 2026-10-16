import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import TuneIcon from '@mui/icons-material/Tune'
import DeleteIcon from '@mui/icons-material/Delete'
import TitleIcon from '@mui/icons-material/Title'
import MovieIcon from '@mui/icons-material/Movie'
import { updateClipProperties, updateClipEffects, deleteClip } from '../store/timelineSlice'

export default function InspectorPanel() {
  const dispatch = useDispatch()
  const selectedClipId = useSelector((state) => state.timeline.present.selectedClipId)
  const clips = useSelector((state) => state.timeline.present.clips)
  const clip = clips.find((c) => c.id === selectedClipId)

  if (!clip) {
    return (
      <aside className="panel-inspector" aria-label="Inspector Panel">
        <div className="panel-title">
          <span>Clip Inspector</span>
          <TuneIcon fontSize="small" style={{ color: 'var(--text-muted)' }} />
        </div>
        <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          Select a clip on the timeline to inspect and edit effects.
        </div>
      </aside>
    )
  }

  const effects = clip.effects || { brightness: 0, contrast: 1, blur: 0, crossfade: 0 }

  const handleEffectChange = (key, val) => {
    dispatch(
      updateClipEffects({
        clipId: clip.id,
        effects: { [key]: parseFloat(val) }
      })
    )
  }

  const handlePropertyChange = (key, val) => {
    dispatch(
      updateClipProperties({
        clipId: clip.id,
        changes: { [key]: val }
      })
    )
  }

  return (
    <aside className="panel-inspector" aria-label="Inspector Panel">
      <div className="panel-title">
        <span>Clip Inspector</span>
        <button
          className="btn-icon"
          onClick={() => dispatch(deleteClip(clip.id))}
          title="Delete selected clip"
          aria-label="Delete clip"
        >
          <DeleteIcon fontSize="small" style={{ color: 'var(--accent-red)' }} />
        </button>
      </div>

      <div className="inspector-section">
        <div className="inspector-section-title">General</div>
        <div className="form-group">
          <div className="form-label">
            <span>Name</span>
          </div>
          <input
            type="text"
            value={clip.name}
            onChange={(e) => handlePropertyChange('name', e.target.value)}
            style={{ width: '100%' }}
            aria-label="Clip name"
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <div className="form-label">
              <span>Start (s)</span>
            </div>
            <input
              type="number"
              step="0.1"
              min="0"
              value={clip.start.toFixed(2)}
              onChange={(e) => handlePropertyChange('start', Math.max(0, parseFloat(e.target.value) || 0))}
              style={{ width: '100%' }}
              aria-label="Clip start time"
            />
          </div>

          <div className="form-group" style={{ flex: 1 }}>
            <div className="form-label">
              <span>Duration (s)</span>
            </div>
            <input
              type="number"
              step="0.1"
              min="0.2"
              value={clip.duration.toFixed(2)}
              onChange={(e) => handlePropertyChange('duration', Math.max(0.2, parseFloat(e.target.value) || 0.2))}
              style={{ width: '100%' }}
              aria-label="Clip duration"
            />
          </div>
        </div>
      </div>

      {clip.type === 'text' && (
        <div className="inspector-section">
          <div className="inspector-section-title">Text Overlay</div>
          <div className="form-group">
            <div className="form-label">
              <span>Text</span>
            </div>
            <input
              type="text"
              value={clip.text || ''}
              onChange={(e) => handlePropertyChange('text', e.target.value)}
              style={{ width: '100%' }}
              aria-label="Text content"
            />
          </div>

          <div className="form-group">
            <div className="form-label">
              <span>Font Size</span>
              <span>{clip.fontSize || 36}px</span>
            </div>
            <input
              type="range"
              min="16"
              max="96"
              value={clip.fontSize || 36}
              onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))}
              className="slider-input"
              aria-label="Font size slider"
            />
          </div>

          <div className="form-group">
            <div className="form-label">
              <span>Color</span>
            </div>
            <input
              type="color"
              value={clip.fontColor || '#ffffff'}
              onChange={(e) => handlePropertyChange('fontColor', e.target.value)}
              style={{ width: '100%', height: 36, padding: 2, cursor: 'pointer' }}
              aria-label="Text color picker"
            />
          </div>
        </div>
      )}

      {clip.type === 'video' && (
        <div className="inspector-section">
          <div className="inspector-section-title">WebGL Shader Effects</div>

          <div className="form-group">
            <div className="form-label">
              <span>Brightness</span>
              <span>{effects.brightness?.toFixed(2) || '0.00'}</span>
            </div>
            <input
              type="range"
              min="-0.5"
              max="0.5"
              step="0.02"
              value={effects.brightness || 0}
              onChange={(e) => handleEffectChange('brightness', e.target.value)}
              className="slider-input"
              aria-label="Brightness effect slider"
            />
          </div>

          <div className="form-group">
            <div className="form-label">
              <span>Contrast</span>
              <span>{(effects.contrast !== undefined ? effects.contrast : 1).toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.05"
              value={effects.contrast !== undefined ? effects.contrast : 1}
              onChange={(e) => handleEffectChange('contrast', e.target.value)}
              className="slider-input"
              aria-label="Contrast effect slider"
            />
          </div>

          <div className="form-group">
            <div className="form-label">
              <span>Gaussian Blur</span>
              <span>{effects.blur?.toFixed(1) || '0.0'} px</span>
            </div>
            <input
              type="range"
              min="0"
              max="12"
              step="0.5"
              value={effects.blur || 0}
              onChange={(e) => handleEffectChange('blur', e.target.value)}
              className="slider-input"
              aria-label="Blur effect slider"
            />
          </div>

          <div className="form-group">
            <div className="form-label">
              <span>Crossfade Transition</span>
              <span>{((effects.crossfade || 0) * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={effects.crossfade || 0}
              onChange={(e) => handleEffectChange('crossfade', e.target.value)}
              className="slider-input"
              aria-label="Crossfade slider"
            />
          </div>
        </div>
      )}
    </aside>
  )
}
