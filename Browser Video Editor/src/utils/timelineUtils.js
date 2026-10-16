export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function formatTimecode(seconds, fps = 30) {
  if (isNaN(seconds) || seconds < 0) seconds = 0
  const totalFrames = Math.floor(seconds * fps)
  const frames = totalFrames % fps
  const totalSecs = Math.floor(seconds)
  const secs = totalSecs % 60
  const totalMins = Math.floor(totalSecs / 60)
  const mins = totalMins % 60
  const hours = Math.floor(totalMins / 60)

  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}:${pad(frames)}`
}

export function secondsToPixels(seconds, zoom) {
  return Math.max(0, seconds * zoom)
}

export function pixelsToSeconds(pixels, zoom) {
  if (zoom <= 0) return 0
  return Math.max(0, pixels / zoom)
}

export function trimClip(clip, newStart, newEnd, minDuration = 0.1) {
  if (!clip) return null
  if (newEnd <= newStart + minDuration) {
    return { ...clip }
  }

  const startDiff = newStart - clip.start
  const newSourceStart = Math.max(0, (clip.sourceStart || 0) + startDiff)
  const newDuration = Math.max(minDuration, newEnd - newStart)

  return {
    ...clip,
    start: Math.max(0, newStart),
    duration: newDuration,
    sourceStart: newSourceStart
  }
}

export function splitClip(clip, splitTime, minDuration = 0.05) {
  if (!clip) return null
  const clipEnd = clip.start + clip.duration

  if (splitTime <= clip.start + minDuration || splitTime >= clipEnd - minDuration) {
    return null
  }

  const firstDuration = splitTime - clip.start
  const secondDuration = clipEnd - splitTime

  const firstClip = {
    ...clip,
    id: `${clip.id}-part1-${Date.now()}`,
    duration: firstDuration
  }

  const secondClip = {
    ...clip,
    id: `${clip.id}-part2-${Date.now()}`,
    start: splitTime,
    duration: secondDuration,
    sourceStart: (clip.sourceStart || 0) + firstDuration
  }

  return [firstClip, secondClip]
}

export function snapTime(time, snapTargets = [], threshold = 0.15) {
  if (!snapTargets || snapTargets.length === 0) {
    return { time, snapped: false, target: null }
  }

  let closestTarget = null
  let minDistance = threshold

  for (let i = 0; i < snapTargets.length; i++) {
    const target = snapTargets[i]
    const distance = Math.abs(time - target)
    if (distance < minDistance) {
      minDistance = distance
      closestTarget = target
    }
  }

  if (closestTarget !== null) {
    return { time: closestTarget, snapped: true, target: closestTarget }
  }

  return { time, snapped: false, target: null }
}

export function checkOverlap(clipA, clipB) {
  if (!clipA || !clipB || clipA.id === clipB.id) return false
  const endA = clipA.start + clipA.duration
  const endB = clipB.start + clipB.duration
  return clipA.start < endB && endA > clipB.start
}

export function findOverlappingClips(trackClips, targetClip) {
  if (!trackClips || !targetClip) return []
  return trackClips.filter((c) => checkOverlap(c, targetClip))
}

export function resolveOverlap(trackClips, movedClip, minDuration = 0.1) {
  if (!trackClips || !movedClip) return movedClip
  const otherClips = trackClips
    .filter((c) => c.id !== movedClip.id)
    .sort((a, b) => a.start - b.start)

  let proposedStart = Math.max(0, movedClip.start)
  const proposedEnd = proposedStart + movedClip.duration

  for (let i = 0; i < otherClips.length; i++) {
    const current = otherClips[i]
    const currentEnd = current.start + current.duration

    if (proposedStart < currentEnd && proposedEnd > current.start) {
      if (movedClip.start >= current.start) {
        proposedStart = currentEnd
      } else {
        const availableDuration = current.start - proposedStart
        if (availableDuration >= minDuration) {
          return {
            ...movedClip,
            start: proposedStart,
            duration: availableDuration
          }
        } else {
          proposedStart = currentEnd
        }
      }
    }
  }

  return {
    ...movedClip,
    start: proposedStart
  }
}

export function getSnapTargets(tracks, clips, playheadTime, excludeClipId = null) {
  const targets = new Set([0, playheadTime])

  clips.forEach((clip) => {
    if (clip.id === excludeClipId) return
    targets.add(clip.start)
    targets.add(clip.start + clip.duration)
  })

  return Array.from(targets).sort((a, b) => a - b)
}

export function calculateProjectDuration(clips, minDuration = 30) {
  if (!clips || clips.length === 0) return minDuration
  let maxEnd = minDuration
  for (let i = 0; i < clips.length; i++) {
    const end = clips[i].start + clips[i].duration
    if (end > maxEnd) {
      maxEnd = end
    }
  }
  return Math.ceil(maxEnd + 5)
}
