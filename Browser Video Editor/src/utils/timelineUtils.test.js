import { describe, it, expect } from 'vitest'
import {
  clamp,
  formatTimecode,
  secondsToPixels,
  pixelsToSeconds,
  trimClip,
  splitClip,
  snapTime,
  checkOverlap,
  findOverlappingClips,
  resolveOverlap,
  getSnapTargets,
  calculateProjectDuration
} from './timelineUtils'

describe('timelineUtils', () => {
  describe('clamp', () => {
    it('clamps values within bounds', () => {
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(-5, 0, 10)).toBe(0)
      expect(clamp(15, 0, 10)).toBe(10)
    })
  })

  describe('formatTimecode', () => {
    it('formats 0 seconds', () => {
      expect(formatTimecode(0)).toBe('00:00:00:00')
    })

    it('formats negative or NaN seconds to zero', () => {
      expect(formatTimecode(-5)).toBe('00:00:00:00')
      expect(formatTimecode(NaN)).toBe('00:00:00:00')
    })

    it('formats standard seconds and frames', () => {
      expect(formatTimecode(65.5, 30)).toBe('00:01:05:15')
      expect(formatTimecode(3661, 30)).toBe('01:01:01:00')
    })
  })

  describe('secondsToPixels and pixelsToSeconds', () => {
    it('converts correctly with positive zoom', () => {
      expect(secondsToPixels(10, 50)).toBe(500)
      expect(pixelsToSeconds(500, 50)).toBe(10)
    })

    it('handles negative or zero bounds safely', () => {
      expect(secondsToPixels(-5, 50)).toBe(0)
      expect(pixelsToSeconds(100, 0)).toBe(0)
      expect(pixelsToSeconds(100, -10)).toBe(0)
    })
  })

  describe('trimClip', () => {
    const baseClip = {
      id: 'clip-1',
      start: 5,
      duration: 10,
      sourceStart: 2
    }

    it('returns null if clip is not provided', () => {
      expect(trimClip(null, 5, 10)).toBeNull()
    })

    it('does not allow trimming below minDuration', () => {
      const trimmed = trimClip(baseClip, 5, 5.05, 0.1)
      expect(trimmed.duration).toBe(baseClip.duration)
    })

    it('trims right edge (shortens duration)', () => {
      const trimmed = trimClip(baseClip, 5, 12)
      expect(trimmed.start).toBe(5)
      expect(trimmed.duration).toBe(7)
      expect(trimmed.sourceStart).toBe(2)
    })

    it('trims left edge (shifts start and increases sourceStart)', () => {
      const trimmed = trimClip(baseClip, 8, 15)
      expect(trimmed.start).toBe(8)
      expect(trimmed.duration).toBe(7)
      expect(trimmed.sourceStart).toBe(5)
    })

    it('clamps start to zero if trimmed before timeline start', () => {
      const trimmed = trimClip(baseClip, -2, 10)
      expect(trimmed.start).toBe(0)
    })
  })

  describe('splitClip', () => {
    const baseClip = {
      id: 'clip-1',
      start: 10,
      duration: 10,
      sourceStart: 1
    }

    it('returns null if clip is null', () => {
      expect(splitClip(null, 15)).toBeNull()
    })

    it('returns null if splitTime is before or at clip start', () => {
      expect(splitClip(baseClip, 10)).toBeNull()
      expect(splitClip(baseClip, 8)).toBeNull()
    })

    it('returns null if splitTime is after or at clip end', () => {
      expect(splitClip(baseClip, 20)).toBeNull()
      expect(splitClip(baseClip, 22)).toBeNull()
    })

    it('returns null if split time is too close to boundaries', () => {
      expect(splitClip(baseClip, 10.02, 0.05)).toBeNull()
      expect(splitClip(baseClip, 19.98, 0.05)).toBeNull()
    })

    it('successfully splits clip into two continuous parts', () => {
      const parts = splitClip(baseClip, 14)
      expect(parts).toHaveLength(2)

      const [part1, part2] = parts
      expect(part1.start).toBe(10)
      expect(part1.duration).toBe(4)
      expect(part1.sourceStart).toBe(1)

      expect(part2.start).toBe(14)
      expect(part2.duration).toBe(6)
      expect(part2.sourceStart).toBe(5)
    })
  })

  describe('snapTime', () => {
    it('returns original time if no snap targets', () => {
      const res = snapTime(10.5, [])
      expect(res.snapped).toBe(false)
      expect(res.time).toBe(10.5)
    })

    it('snaps to target within threshold', () => {
      const targets = [0, 5, 10, 15]
      const res = snapTime(10.08, targets, 0.15)
      expect(res.snapped).toBe(true)
      expect(res.time).toBe(10)
      expect(res.target).toBe(10)
    })

    it('does not snap if outside threshold', () => {
      const targets = [0, 5, 10, 15]
      const res = snapTime(10.3, targets, 0.15)
      expect(res.snapped).toBe(false)
      expect(res.time).toBe(10.3)
    })
  })

  describe('checkOverlap and findOverlappingClips', () => {
    const clipA = { id: 'a', start: 0, duration: 5 }
    const clipB = { id: 'b', start: 4, duration: 3 }
    const clipC = { id: 'c', start: 10, duration: 5 }

    it('detects overlap when ranges intersect', () => {
      expect(checkOverlap(clipA, clipB)).toBe(true)
      expect(checkOverlap(clipB, clipA)).toBe(true)
    })

    it('does not detect overlap when ranges are separate or touching', () => {
      expect(checkOverlap(clipA, clipC)).toBe(false)
      const touching = { id: 'd', start: 5, duration: 3 }
      expect(checkOverlap(clipA, touching)).toBe(false)
    })

    it('ignores comparing same clip', () => {
      expect(checkOverlap(clipA, clipA)).toBe(false)
    })

    it('handles null arguments safely', () => {
      expect(checkOverlap(null, clipA)).toBe(false)
      expect(findOverlappingClips(null, clipA)).toEqual([])
      expect(findOverlappingClips([clipB], null)).toEqual([])
    })

    it('finds all overlapping clips in track', () => {
      const trackClips = [clipB, clipC]
      const overlaps = findOverlappingClips(trackClips, clipA)
      expect(overlaps).toHaveLength(1)
      expect(overlaps[0].id).toBe('b')
    })
  })

  describe('resolveOverlap', () => {
    const clip1 = { id: 'c1', start: 0, duration: 5 }
    const clip2 = { id: 'c2', start: 10, duration: 5 }

    it('handles null inputs safely', () => {
      expect(resolveOverlap(null, clip1)).toBe(clip1)
      expect(resolveOverlap([clip1], null)).toBeNull()
    })

    it('leaves non-overlapping clip unchanged', () => {
      const moved = { id: 'c3', start: 6, duration: 3 }
      const resolved = resolveOverlap([clip1, clip2], moved)
      expect(resolved.start).toBe(6)
      expect(resolved.duration).toBe(3)
    })

    it('shifts clip start after obstacle when moving right', () => {
      const moved = { id: 'c3', start: 2, duration: 4 }
      const resolved = resolveOverlap([clip1], moved)
      expect(resolved.start).toBe(5)
    })

    it('trims duration if there is partial slot before obstacle', () => {
      const obstacle = { id: 'o1', start: 4, duration: 5 }
      const moved = { id: 'c3', start: 1, duration: 6 }
      const resolved = resolveOverlap([obstacle], moved, 0.1)
      expect(resolved.start).toBe(1)
      expect(resolved.duration).toBe(3)
    })
  })

  describe('getSnapTargets', () => {
    it('collects start and end boundaries and playhead', () => {
      const clips = [
        { id: 'c1', start: 2, duration: 4 },
        { id: 'c2', start: 10, duration: 5 }
      ]
      const targets = getSnapTargets([], clips, 8, 'c2')
      expect(targets).toContain(0)
      expect(targets).toContain(8)
      expect(targets).toContain(2)
      expect(targets).toContain(6)
      expect(targets).not.toContain(10)
    })
  })

  describe('calculateProjectDuration', () => {
    it('returns minDuration for empty clips', () => {
      expect(calculateProjectDuration([])).toBe(30)
      expect(calculateProjectDuration(null)).toBe(30)
    })

    it('returns calculated length plus buffer', () => {
      const clips = [{ id: '1', start: 20, duration: 25 }]
      expect(calculateProjectDuration(clips)).toBe(50)
    })
  })
})
