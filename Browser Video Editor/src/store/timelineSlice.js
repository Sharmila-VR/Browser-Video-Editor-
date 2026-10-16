import { createSlice } from '@reduxjs/toolkit'
import {
  trimClip,
  splitClip,
  snapTime,
  resolveOverlap,
  getSnapTargets,
  calculateProjectDuration
} from '../utils/timelineUtils'

const initialPresentState = {
  currentTime: 0,
  duration: 30,
  zoom: 50,
  snappingEnabled: true,
  isPlaying: false,
  selectedClipId: null,
  selectedTrackId: null,
  tracks: [
    { id: 'track-v1', name: 'Video 1', type: 'video', muted: false, locked: false },
    { id: 'track-v2', name: 'Video 2', type: 'video', muted: false, locked: false },
    { id: 'track-a1', name: 'Audio 1', type: 'audio', muted: false, locked: false },
    { id: 'track-t1', name: 'Text 1', type: 'text', muted: false, locked: false }
  ],
  clips: [],
  mediaList: []
}

function pushHistory(state) {
  state.past.push(JSON.parse(JSON.stringify(state.present)))
  if (state.past.length > 50) {
    state.past.shift()
  }
  state.future = []
}

export const timelineSlice = createSlice({
  name: 'timeline',
  initialState: {
    past: [],
    present: initialPresentState,
    future: []
  },
  reducers: {
    setCurrentTime: (state, action) => {
      state.present.currentTime = Math.max(0, action.payload)
    },
    setPlaying: (state, action) => {
      state.present.isPlaying = action.payload
    },
    setZoom: (state, action) => {
      state.present.zoom = Math.min(Math.max(15, action.payload), 250)
    },
    toggleSnapping: (state) => {
      state.present.snappingEnabled = !state.present.snappingEnabled
    },
    selectClip: (state, action) => {
      state.present.selectedClipId = action.payload
    },
    selectTrack: (state, action) => {
      state.present.selectedTrackId = action.payload
    },
    addMediaItem: (state, action) => {
      const exists = state.present.mediaList.find((m) => m.id === action.payload.id)
      if (!exists) {
        state.present.mediaList.push(action.payload)
      }
    },
    removeMediaItem: (state, action) => {
      pushHistory(state)
      const mediaId = action.payload
      state.present.mediaList = state.present.mediaList.filter((m) => m.id !== mediaId)
      state.present.clips = state.present.clips.filter((c) => c.mediaId !== mediaId)
      state.present.duration = calculateProjectDuration(state.present.clips)
    },
    addClip: (state, action) => {
      pushHistory(state)
      const newClip = {
        id: `clip-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        trackId: action.payload.trackId || state.present.tracks[0].id,
        name: action.payload.name || 'New Clip',
        type: action.payload.type || 'video',
        mediaId: action.payload.mediaId || null,
        start: action.payload.start !== undefined ? action.payload.start : state.present.currentTime,
        duration: action.payload.duration || 5,
        sourceStart: action.payload.sourceStart || 0,
        text: action.payload.text || (action.payload.type === 'text' ? 'Sample Title' : ''),
        fontSize: action.payload.fontSize || 36,
        fontColor: action.payload.fontColor || '#ffffff',
        posX: 0.5,
        posY: 0.5,
        effects: {
          brightness: 0,
          contrast: 1,
          blur: 0,
          crossfade: 0
        }
      }

      const trackClips = state.present.clips.filter((c) => c.trackId === newClip.trackId)
      const resolved = resolveOverlap(trackClips, newClip)
      state.present.clips.push(resolved)
      state.present.selectedClipId = resolved.id
      state.present.duration = calculateProjectDuration(state.present.clips)
    },
    deleteClip: (state, action) => {
      pushHistory(state)
      const clipId = action.payload || state.present.selectedClipId
      if (!clipId) return
      state.present.clips = state.present.clips.filter((c) => c.id !== clipId)
      if (state.present.selectedClipId === clipId) {
        state.present.selectedClipId = null
      }
      state.present.duration = calculateProjectDuration(state.present.clips)
    },
    updateClipProperties: (state, action) => {
      const { clipId, changes } = action.payload
      const clipIndex = state.present.clips.findIndex((c) => c.id === clipId)
      if (clipIndex !== -1) {
        pushHistory(state)
        state.present.clips[clipIndex] = {
          ...state.present.clips[clipIndex],
          ...changes
        }
        state.present.duration = calculateProjectDuration(state.present.clips)
      }
    },
    updateClipEffects: (state, action) => {
      const { clipId, effects } = action.payload
      const clip = state.present.clips.find((c) => c.id === clipId)
      if (clip) {
        pushHistory(state)
        clip.effects = {
          ...clip.effects,
          ...effects
        }
      }
    },
    trimClipAction: (state, action) => {
      const { clipId, newStart, newEnd } = action.payload
      const clip = state.present.clips.find((c) => c.id === clipId)
      if (clip) {
        pushHistory(state)
        const trimmed = trimClip(clip, newStart, newEnd)
        if (trimmed) {
          const index = state.present.clips.findIndex((c) => c.id === clipId)
          state.present.clips[index] = trimmed
          state.present.duration = calculateProjectDuration(state.present.clips)
        }
      }
    },
    splitClipAtPlayheadAction: (state, action) => {
      const playheadTime = action.payload !== undefined ? action.payload : state.present.currentTime
      let targetClip = null

      if (state.present.selectedClipId) {
        const sel = state.present.clips.find((c) => c.id === state.present.selectedClipId)
        if (sel && playheadTime > sel.start && playheadTime < sel.start + sel.duration) {
          targetClip = sel
        }
      }

      if (!targetClip) {
        targetClip = state.present.clips.find(
          (c) => playheadTime > c.start && playheadTime < c.start + c.duration
        )
      }

      if (targetClip) {
        const parts = splitClip(targetClip, playheadTime)
        if (parts) {
          pushHistory(state)
          state.present.clips = state.present.clips.filter((c) => c.id !== targetClip.id)
          state.present.clips.push(parts[0], parts[1])
          state.present.selectedClipId = parts[1].id
          state.present.duration = calculateProjectDuration(state.present.clips)
        }
      }
    },
    moveClipAction: (state, action) => {
      const { clipId, newTrackId, newStart } = action.payload
      const clip = state.present.clips.find((c) => c.id === clipId)
      if (!clip) return

      pushHistory(state)
      let finalStart = Math.max(0, newStart)

      if (state.present.snappingEnabled) {
        const targets = getSnapTargets(
          state.present.tracks,
          state.present.clips,
          state.present.currentTime,
          clipId
        )
        const snap = snapTime(finalStart, targets, 0.2)
        if (snap.snapped) {
          finalStart = snap.time
        }
      }

      const updated = {
        ...clip,
        trackId: newTrackId || clip.trackId,
        start: finalStart
      }

      const trackClips = state.present.clips.filter((c) => c.trackId === updated.trackId && c.id !== clipId)
      const resolved = resolveOverlap(trackClips, updated)

      const index = state.present.clips.findIndex((c) => c.id === clipId)
      state.present.clips[index] = resolved
      state.present.duration = calculateProjectDuration(state.present.clips)
    },
    addTrack: (state, action) => {
      pushHistory(state)
      const type = action.payload?.type || 'video'
      const count = state.present.tracks.filter((t) => t.type === type).length + 1
      const typeLabel = type.charAt(0).toUpperCase() + type.slice(1)
      const newTrack = {
        id: `track-${type[0]}-${Date.now()}`,
        name: `${typeLabel} ${count}`,
        type,
        muted: false,
        locked: false
      }
      state.present.tracks.push(newTrack)
    },
    deleteTrack: (state, action) => {
      const trackId = action.payload
      if (state.present.tracks.length <= 1) return
      pushHistory(state)
      state.present.tracks = state.present.tracks.filter((t) => t.id !== trackId)
      state.present.clips = state.present.clips.filter((c) => c.trackId !== trackId)
      state.present.duration = calculateProjectDuration(state.present.clips)
    },
    toggleMuteTrack: (state, action) => {
      const track = state.present.tracks.find((t) => t.id === action.payload)
      if (track) {
        pushHistory(state)
        track.muted = !track.muted
      }
    },
    toggleLockTrack: (state, action) => {
      const track = state.present.tracks.find((t) => t.id === action.payload)
      if (track) {
        pushHistory(state)
        track.locked = !track.locked
      }
    },
    undo: (state) => {
      if (state.past.length > 0) {
        const previous = state.past.pop()
        state.future.push(JSON.parse(JSON.stringify(state.present)))
        state.present = previous
      }
    },
    redo: (state) => {
      if (state.future.length > 0) {
        const next = state.future.pop()
        state.past.push(JSON.parse(JSON.stringify(state.present)))
        state.present = next
      }
    },
    loadTimeline: (state, action) => {
      if (action.payload) {
        state.past = []
        state.future = []
        state.present = {
          ...initialPresentState,
          ...action.payload,
          isPlaying: false
        }
      }
    },
    populateSampleProject: (state, action) => {
      const sampleMedia = action.payload || []
      pushHistory(state)
      state.present.mediaList = sampleMedia

      const mCity = sampleMedia.find((m) => m.proceduralType === 'city') || sampleMedia[0] || { id: 'dummy-city' }
      const mSunset = sampleMedia.find((m) => m.proceduralType === 'sunset') || sampleMedia[1] || mCity
      const mRetro = sampleMedia.find((m) => m.proceduralType === 'retro') || sampleMedia[2] || mCity

      state.present.clips = [
        {
          id: 'clip-sample-1',
          trackId: 'track-v1',
          name: 'Cyberpunk Metropolis',
          type: 'video',
          proceduralType: 'city',
          mediaId: mCity.id,
          start: 0,
          duration: 7,
          sourceStart: 0,
          effects: { brightness: 0.05, contrast: 1.15, blur: 0, crossfade: 0 }
        },
        {
          id: 'clip-sample-2',
          trackId: 'track-v1',
          name: 'Golden Ocean Sunset',
          type: 'video',
          proceduralType: 'sunset',
          mediaId: mSunset.id,
          start: 7,
          duration: 9,
          sourceStart: 0,
          effects: { brightness: 0, contrast: 1.0, blur: 0, crossfade: 0 }
        },
        {
          id: 'clip-sample-3',
          trackId: 'track-v2',
          name: 'Retro Synthwave 80s',
          type: 'video',
          proceduralType: 'retro',
          mediaId: mRetro.id,
          start: 4,
          duration: 8,
          sourceStart: 0,
          effects: { brightness: 0, contrast: 1.1, blur: 0, crossfade: 0.5 }
        },
        {
          id: 'clip-sample-4',
          trackId: 'track-t1',
          name: 'Title Overlay',
          type: 'text',
          mediaId: null,
          text: 'STUDIOCUT 4K ULTRA',
          fontSize: 40,
          fontColor: '#38bdf8',
          start: 1,
          duration: 5,
          sourceStart: 0,
          effects: { brightness: 0, contrast: 1, blur: 0, crossfade: 0 }
        }
      ]
      state.present.duration = 24
      state.present.currentTime = 0
      state.present.selectedClipId = 'clip-sample-1'
    }
  }
})

export const {
  setCurrentTime,
  setPlaying,
  setZoom,
  toggleSnapping,
  selectClip,
  selectTrack,
  addMediaItem,
  removeMediaItem,
  addClip,
  deleteClip,
  updateClipProperties,
  updateClipEffects,
  trimClipAction,
  splitClipAtPlayheadAction,
  moveClipAction,
  addTrack,
  deleteTrack,
  toggleMuteTrack,
  toggleLockTrack,
  undo,
  redo,
  loadTimeline,
  populateSampleProject
} = timelineSlice.actions

export default timelineSlice.reducer
