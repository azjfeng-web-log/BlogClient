import { useRef, useState, useCallback } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (loaded || loading) return
    setLoading(true)
    setLoadError(null)
    try {
      const ffmpeg = new FFmpeg()
      ffmpeg.on('progress', ({ progress: p }) => setProgress(Math.round(p * 100)))
      ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]', message))

      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })

      ffmpegRef.current = ffmpeg
      setLoaded(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载失败'
      console.error('FFmpeg load failed:', err)
      setLoadError(msg)
    } finally {
      setLoading(false)
    }
  }, [loaded, loading])

  return { ffmpeg: ffmpegRef, loaded, loading, progress, loadError, load }
}
