import React, { useEffect, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Header from './components/Header'
import MediaLibrary from './components/MediaLibrary'
import PreviewPlayer from './components/PreviewPlayer'
import InspectorPanel from './components/InspectorPanel'
import Timeline from './components/Timeline'
import ExportModal from './components/ExportModal'
import KeyboardManager from './components/KeyboardManager'
import { PlaybackEngine } from './services/playbackEngine'
import {
  saveProjectToDB,
  loadProjectFromDB,
  getAllMediaFromDB,
  saveMediaItemToDB
} from './services/db'
import {
  loadTimeline,
  addMediaItem,
  populateSampleProject
} from './store/timelineSlice'
import {
  generateInstantDummyMedia,
  generateSampleVideo
} from './utils/sampleMediaGenerator'

export default function App() {
  const dispatch = useDispatch()
  const timelinePresent = useSelector((state) => state.timeline.present)
  const playbackEngineRef = useRef(null)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState(null)
  const isInitialMount = useRef(true)

  const handlePopulateDemo = async () => {
    const dummyCity = generateInstantDummyMedia('city', 7)
    const dummySunset = generateInstantDummyMedia('sunset', 9)
    const dummyRetro = generateInstantDummyMedia('retro', 8)
    const dummyNature = generateInstantDummyMedia('nature', 8)

    const dummies = [dummyCity, dummySunset, dummyRetro, dummyNature]
    dummies.forEach((d) => dispatch(addMediaItem(d)))
    dispatch(populateSampleProject(dummies))

    if (playbackEngineRef.current) {
      setTimeout(() => {
        playbackEngineRef.current.seek(0, {
          ...timelinePresent,
          clips: [
            {
              id: 'clip-sample-1',
              trackId: 'track-v1',
              name: 'Cyberpunk Metropolis',
              type: 'video',
              proceduralType: 'city',
              start: 0,
              duration: 7,
              sourceStart: 0,
              effects: { brightness: 0.05, contrast: 1.15, blur: 0, crossfade: 0 }
            }
          ]
        })
      }, 50)
    }

    Promise.all([
      generateSampleVideo('city', 7),
      generateSampleVideo('sunset', 9),
      generateSampleVideo('retro', 8)
    ]).then((videos) => {
      videos.forEach((v) => {
        dispatch(addMediaItem(v))
        saveMediaItemToDB(v)
      })
    })
  }

  useEffect(() => {
    const canvas = document.getElementById('preview-canvas')
    if (canvas && !playbackEngineRef.current) {
      playbackEngineRef.current = new PlaybackEngine(canvas)
    }

    const restoreData = async () => {
      try {
        const savedMedia = await getAllMediaFromDB()
        const restoredMedia = []

        for (let i = 0; i < savedMedia.length; i++) {
          const item = savedMedia[i]
          let itemUrl = item.url
          if (item.blob && !itemUrl) {
            itemUrl = URL.createObjectURL(item.blob)
          }
          const restored = { ...item, url: itemUrl }
          restoredMedia.push(restored)
          dispatch(addMediaItem(restored))
        }

        const savedProject = await loadProjectFromDB('default-project')
        if (
          savedProject &&
          savedProject.timelineData &&
          savedProject.timelineData.clips &&
          savedProject.timelineData.clips.length > 0
        ) {
          dispatch(loadTimeline(savedProject.timelineData))
        } else {
          handlePopulateDemo()
        }
      } catch (err) {
        console.error(err)
        handlePopulateDemo()
      }
    }

    restoreData()

    return () => {
      if (playbackEngineRef.current) {
        playbackEngineRef.current.destroy()
        playbackEngineRef.current = null
      }
    }
  }, [dispatch])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    setIsSaving(true)
    const timer = setTimeout(async () => {
      try {
        await saveProjectToDB({
          id: 'default-project',
          name: 'My Project',
          updatedAt: Date.now(),
          timelineData: {
            duration: timelinePresent.duration,
            zoom: timelinePresent.zoom,
            tracks: timelinePresent.tracks,
            clips: timelinePresent.clips
          }
        })
        setLastSavedTime(Date.now())
      } finally {
        setIsSaving(false)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [timelinePresent.clips, timelinePresent.tracks, timelinePresent.duration])

  return (
    <div className="app-container">
      <Header
        onOpenExport={() => setIsExportOpen(true)}
        isSaving={isSaving}
        lastSavedTime={lastSavedTime}
        onPopulateDemo={handlePopulateDemo}
      />

      <div className="workspace-area">
        <MediaLibrary onPopulateDemo={handlePopulateDemo} />
        <PreviewPlayer playbackEngineRef={playbackEngineRef} />
        <InspectorPanel />
      </div>

      <Timeline />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        playbackEngineRef={playbackEngineRef}
      />

      <KeyboardManager playbackEngineRef={playbackEngineRef} />
    </div>
  )
}
