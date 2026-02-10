import { useRef } from 'react'
import { useEditorStore } from '../../store'
import type { Track } from '../../types'
import styles from './TrackRow.module.scss'

interface TrackRowProps {
  track: Track
  pps: number
}

const CLIP_COLORS: Record<string, string> = {
  video: '#1890ff',
  audio: '#52c41a',
  image: '#1890ff',
  subtitle: '#faad14',
}

export default function TrackRow({ track, pps }: TrackRowProps) {
  const { selectClip, updateClip, moveClip, pushHistory, selectedClipId } = useEditorStore()
  const dragRef = useRef<{ clipId: string; startX: number; origStartAt: number } | null>(null)
  const resizeRef = useRef<{
    clipId: string
    edge: 'left' | 'right'
    startX: number
    origStartAt: number
    origDuration: number
    origInPoint: number
  } | null>(null)

  const handleTrackClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(`.${styles.clip}`)) return
    selectClip(null)
  }

  const handleClipMouseDown = (e: React.MouseEvent, clipId: string) => {
    e.stopPropagation()
    selectClip(clipId)
    const clip = track.clips.find((c) => c.id === clipId)
    if (!clip) return

    const rect = (e.target as HTMLElement).closest(`.${styles.clip}`)?.getBoundingClientRect()
    if (!rect) return
    const offsetX = e.clientX - rect.left
    const isLeftEdge = offsetX < 6
    const isRightEdge = offsetX > rect.width - 6
    const startX = e.clientX
    let dragging = false

    const handleMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX
      if (!dragging && Math.abs(dx) < 3) return
      if (!dragging) {
        dragging = true
        pushHistory()
        if (isLeftEdge || isRightEdge) {
          resizeRef.current = {
            clipId,
            edge: isLeftEdge ? 'left' : 'right',
            startX,
            origStartAt: clip.startAt,
            origDuration: clip.duration,
            origInPoint: clip.inPoint,
          }
        } else {
          dragRef.current = { clipId, startX, origStartAt: clip.startAt }
        }
      }

      if (dragRef.current) {
        const dt = (ev.clientX - dragRef.current.startX) / pps
        moveClip(dragRef.current.clipId, dragRef.current.origStartAt + dt)
      }
      if (resizeRef.current) {
        const r = resizeRef.current
        const dt = (ev.clientX - r.startX) / pps
        if (r.edge === 'right') {
          const newDur = Math.max(0.1, r.origDuration + dt)
          updateClip(r.clipId, { duration: newDur })
        } else {
          const maxShift = r.origDuration - 0.1
          const shift = Math.max(-r.origInPoint, Math.min(maxShift, dt))
          updateClip(r.clipId, {
            startAt: r.origStartAt + shift,
            inPoint: r.origInPoint + shift,
            duration: r.origDuration - shift,
          })
        }
      }
    }

    const handleUp = () => {
      dragRef.current = null
      resizeRef.current = null
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  return (
    <div className={styles.trackRow} onClick={handleTrackClick}>
      {track.clips.map((clip) => {
        const left = clip.startAt * pps
        const width = clip.duration * pps
        const color = CLIP_COLORS[clip.mediaType] || '#1890ff'
        const isSelected = clip.id === selectedClipId

        return (
          <div
            key={clip.id}
            className={`${styles.clip} ${isSelected ? styles.selected : ''}`}
            style={{
              left,
              width: Math.max(width, 4),
              background: `linear-gradient(135deg, ${color}cc, ${color}88)`,
              borderColor: isSelected ? '#fff' : `${color}aa`,
            }}
            onMouseDown={(e) => handleClipMouseDown(e, clip.id)}
          >
            <div className={styles.clipWaveform} />
            <span className={styles.clipName}>{clip.name}</span>
            <div className={styles.resizeLeft} />
            <div className={styles.resizeRight} />
          </div>
        )
      })}
    </div>
  )
}
