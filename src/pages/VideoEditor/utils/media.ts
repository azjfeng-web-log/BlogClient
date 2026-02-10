export function getMediaDuration(url: string, type: 'video' | 'audio'): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement(type)
    el.preload = 'metadata'
    el.src = url

    let resolved = false
    const done = (d: number) => {
      if (resolved) return
      resolved = true
      resolve(isFinite(d) && d > 0 ? d : 0)
    }

    el.onloadedmetadata = () => done(el.duration)
    el.ondurationchange = () => {
      if (el.duration && isFinite(el.duration)) done(el.duration)
    }
    el.onerror = () => done(0)
    setTimeout(() => done(0), 5000)
  })
}

export function getVideoThumbnail(url: string, time = 0.5): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.crossOrigin = 'anonymous'
    video.src = url

    let resolved = false
    const done = (v: string) => {
      if (resolved) return
      resolved = true
      resolve(v)
    }

    video.onloadeddata = () => {
      video.currentTime = Math.min(time, video.duration || time)
    }
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 160
        canvas.height = 90
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(video, 0, 0, 160, 90)
        done(canvas.toDataURL('image/jpeg', 0.6))
      } catch {
        done('')
      }
    }
    video.onerror = () => done('')
    setTimeout(() => done(''), 5000)
  })
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`
}
