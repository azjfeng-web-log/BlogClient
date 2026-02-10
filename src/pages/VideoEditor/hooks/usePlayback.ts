import { useRef, useCallback, useEffect } from 'react'
import { useEditorStore } from '../store'

export function usePlayback() {
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const playing = useEditorStore((s) => s.playing)

  const tick = useCallback(() => {
    const now = performance.now()
    const delta = (now - lastTimeRef.current) / 1000
    lastTimeRef.current = now
    const { currentTime, duration, setCurrentTime, setPlaying } = useEditorStore.getState()
    const next = currentTime + delta
    if (next >= duration && duration > 0) {
      setCurrentTime(duration)
      setPlaying(false)
      return
    }
    setCurrentTime(next)
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    if (playing) {
      lastTimeRef.current = performance.now()
      rafRef.current = requestAnimationFrame(tick)
    } else {
      cancelAnimationFrame(rafRef.current)
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, tick])

  const togglePlay = useCallback(() => {
    const s = useEditorStore.getState()
    if (s.currentTime >= s.duration && s.duration > 0) {
      s.setCurrentTime(0)
    }
    s.setPlaying(!s.playing)
  }, [])

  const stop = useCallback(() => {
    const s = useEditorStore.getState()
    s.setPlaying(false)
    s.setCurrentTime(0)
  }, [])

  const seek = useCallback((t: number) => {
    useEditorStore.getState().setCurrentTime(t)
  }, [])

  return { togglePlay, stop, seek }
}
