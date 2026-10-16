import React, { useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import VideoFileIcon from '@mui/icons-material/VideoFile'
import AddIcon from '@mui/icons-material/Add'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import AudiotrackIcon from '@mui/icons-material/Audiotrack'
import DeleteIcon from '@mui/icons-material/Delete'
import { addMediaItem, removeMediaItem, addClip } from '../store/timelineSlice'
import { saveMediaItemToDB, deleteMediaFromDB } from '../services/db'
import { generateThumbnails } from '../services/thumbnailService'
import { generateInstantDummyMedia, generateSampleVideo } from '../utils/sampleMediaGenerator'

export default function MediaLibrary({ onMediaLoaded, onPopulateDemo }) {
  const dispatch = useDispatch()
  const mediaList = useSelector((state) => state.timeline.present.mediaList)
  const fileInputRef = useRef(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleFileUpload = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const isAudio = file.type.startsWith('audio/')
      const isVideo = file.type.startsWith('video/')
      if (!isVideo && !isAudio) continue

      const id = `media-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      const url = URL.createObjectURL(file)

      const mediaItem = {
        id,
        name: file.name,
        type: isAudio ? 'audio' : 'video',
        size: file.size,
        blob: file,
        url,
        duration: 10,
        thumbnails: []
      }

      dispatch(addMediaItem(mediaItem))
      await saveMediaItemToDB(mediaItem)

      if (isVideo) {
        generateThumbnails(id, file, 10, 4).then((thumbs) => {
          mediaItem.thumbnails = thumbs
          dispatch(addMediaItem({ ...mediaItem, thumbnails: thumbs }))
          saveMediaItemToDB({ ...mediaItem, thumbnails: thumbs })
        })
      }

      if (onMediaLoaded) onMediaLoaded(mediaItem)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleGenerateSample = async (type) => {
    setIsGenerating(true)
    try {
      const dummy = generateInstantDummyMedia(type, 8)
      dispatch(addMediaItem(dummy))

      const sample = await generateSampleVideo(type, 8)
      dispatch(addMediaItem(sample))
      await saveMediaItemToDB(sample)
      if (onMediaLoaded) onMediaLoaded(sample)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAddToTimeline = (media) => {
    const trackId = media.type === 'audio' ? 'track-a1' : 'track-v1'
    dispatch(
      addClip({
        trackId,
        mediaId: media.id,
        name: media.name,
        type: media.type,
        proceduralType: media.proceduralType,
        duration: media.duration || 6,
        sourceStart: 0
      })
    )
  }

  const handleDeleteMedia = async (id) => {
    dispatch(removeMediaItem(id))
    await deleteMediaFromDB(id)
  }

  return (
    <aside className="panel-media" aria-label="Media Library">
      <div className="panel-title">
        <span>Project Media</span>
        <button
          className="btn-primary"
          style={{ padding: '4px 8px', fontSize: '11px' }}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Upload media file"
        >
          <CloudUploadIcon style={{ fontSize: 16 }} />
          <span>Import</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </div>

      <div style={{ padding: '8px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          className="btn-secondary"
          style={{ fontSize: 11, padding: '5px 4px', justifyContent: 'center' }}
          onClick={() => handleGenerateSample('city')}
          disabled={isGenerating}
        >
          <AutoFixHighIcon style={{ fontSize: 13 }} />
          <span>+ City 1080p</span>
        </button>
        <button
          className="btn-secondary"
          style={{ fontSize: 11, padding: '5px 4px', justifyContent: 'center' }}
          onClick={() => handleGenerateSample('sunset')}
          disabled={isGenerating}
        >
          <AutoFixHighIcon style={{ fontSize: 13 }} />
          <span>+ Sunset</span>
        </button>
        <button
          className="btn-secondary"
          style={{ fontSize: 11, padding: '5px 4px', justifyContent: 'center' }}
          onClick={() => handleGenerateSample('retro')}
          disabled={isGenerating}
        >
          <AutoFixHighIcon style={{ fontSize: 13 }} />
          <span>+ Retro 80s</span>
        </button>
        <button
          className="btn-secondary"
          style={{ fontSize: 11, padding: '5px 4px', justifyContent: 'center' }}
          onClick={() => handleGenerateSample('nature')}
          disabled={isGenerating}
        >
          <AutoFixHighIcon style={{ fontSize: 13 }} />
          <span>+ Aurora</span>
        </button>
      </div>

      <div className="media-list" role="list">
        {mediaList.length === 0 ? (
          <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            No media imported. Click "+ City 1080p", "+ Sunset", or "Import" to add clips.
          </div>
        ) : (
          mediaList.map((media) => (
            <div key={media.id} className="media-card" role="listitem">
              <div className="media-thumb">
                {media.thumbnails && media.thumbnails[0] ? (
                  <img src={media.thumbnails[0]} alt="" />
                ) : media.type === 'audio' ? (
                  <AudiotrackIcon style={{ color: '#34d399', fontSize: 20 }} />
                ) : (
                  <VideoFileIcon style={{ color: '#60a5fa', fontSize: 20 }} />
                )}
              </div>
              <div className="media-info">
                <div className="media-name" title={media.name}>
                  {media.name}
                </div>
                <div className="media-meta">
                  {(media.duration || 6).toFixed(1)}s • {(media.size / (1024 * 1024)).toFixed(1)} MB
                </div>
              </div>
              <button
                className="btn-icon"
                onClick={() => handleAddToTimeline(media)}
                title="Add to timeline"
                aria-label={`Add ${media.name} to timeline`}
              >
                <AddIcon fontSize="small" />
              </button>
              <button
                className="btn-icon"
                onClick={() => handleDeleteMedia(media.id)}
                title="Remove media"
                aria-label={`Delete ${media.name}`}
              >
                <DeleteIcon fontSize="small" style={{ fontSize: 16 }} />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
