import { useRef, useEffect, useCallback, useState } from 'react'
import { Button, Tooltip, Typography, Modal, Progress, message } from 'antd'
import {
  CaretRightOutlined,
  PauseOutlined,
  StepForwardOutlined,
  StopOutlined,
  ExportOutlined,
} from '@ant-design/icons'
import { useEditorStore } from '../store'
import { usePlayback } from '../hooks/usePlayback'
import { useFFmpeg } from '../hooks/useFFmpeg'
import { formatTime } from '../utils/media'
import type { Clip } from '../types'
import styles from './PreviewCanvas.module.scss'

export default function PreviewCanvas() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { project, currentTime, playing, duration } = useEditorStore()
  const { togglePlay, stop } = usePlayback()
  const { ffmpeg, loaded, loading, load, progress: ffmpegProgress } = useFFmpeg()
  const [exportModalVisible, setExportModalVisible] = useState(false)

  const allClips = project.tracks.flatMap((t) => t.clips)
  const activeClip = findActiveVideoClip(allClips, currentTime)

  // 同步视频
  useEffect(() => {
    const video = videoRef.current
    if (!video || !activeClip) return
    if (video.src !== activeClip.mediaUrl) {
      video.src = activeClip.mediaUrl
    }

    // 应用视频滤镜
    const b = (activeClip.brightness ?? 100) / 100
    const c = (activeClip.contrast ?? 100) / 100
    const s = (activeClip.saturation ?? 100) / 100
    const bl = activeClip.blur ?? 0
    video.style.filter = `brightness(${b}) contrast(${c}) saturate(${s}) blur(${bl}px)`

    const targetTime = activeClip.inPoint + (currentTime - activeClip.startAt)
    if (Math.abs(video.currentTime - targetTime) > 0.1) {
      video.currentTime = targetTime
    }
    video.volume = activeClip.volume ?? 1
    if (playing && video.paused) {
      video.play().catch(() => {})
    } else if (!playing && !video.paused) {
      video.pause()
    }
  }, [activeClip, currentTime, playing])

  useEffect(() => {
    if (!activeClip && videoRef.current) {
      videoRef.current.pause()
      videoRef.current.removeAttribute('src')
      videoRef.current.style.filter = ''
    }
  }, [activeClip])

  // 同步音频轨道
  useEffect(() => {
    const audioClips = allClips.filter((c) => c.mediaType === 'audio')
    const map = audioMapRef.current

    // 清理不再需要的 audio
    for (const [id, el] of map) {
      if (!audioClips.find((c) => c.id === id)) {
        el.pause()
        el.src = ''
        map.delete(id)
      }
    }

    for (const clip of audioClips) {
      const isActive = currentTime >= clip.startAt && currentTime < clip.startAt + clip.duration
      let audio = map.get(clip.id)

      if (isActive) {
        if (!audio) {
          audio = new Audio(clip.mediaUrl)
          map.set(clip.id, audio)
        }
        if (audio.src !== clip.mediaUrl) audio.src = clip.mediaUrl
        audio.volume = clip.volume ?? 1

        const targetTime = clip.inPoint + (currentTime - clip.startAt)
        if (Math.abs(audio.currentTime - targetTime) > 0.3) {
          audio.currentTime = targetTime
        }
        if (playing && audio.paused) {
          audio.play().catch(() => {})
        } else if (!playing && !audio.paused) {
          audio.pause()
        }
      } else if (audio) {
        audio.pause()
      }
    }
  }, [currentTime, playing, allClips])

  // 停止时清理所有音频
  useEffect(() => {
    if (!playing) {
      audioMapRef.current.forEach((el) => el.pause())
    }
  }, [playing])

  // 渲染字幕到 canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const subtitleClips = allClips.filter(
      (c) => c.mediaType === 'subtitle' && currentTime >= c.startAt && currentTime < c.startAt + c.duration
    )

    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)

    if (subtitleClips.length > 0) {
      canvas.style.display = 'block'
      for (const clip of subtitleClips) {
        const fontSize = clip.fontSize || 24
        const fontColor = clip.fontColor || '#ffffff'
        ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        const text = clip.text || clip.name
        const metrics = ctx.measureText(text)
        const x = canvas.offsetWidth / 2
        const y = canvas.offsetHeight - 40
        ctx.fillRect(x - metrics.width / 2 - 8, y - fontSize, metrics.width + 16, fontSize + 10)
        ctx.fillStyle = fontColor
        ctx.fillText(text, x, y)
      }
    } else {
      canvas.style.display = 'none'
    }
  }, [currentTime, allClips])

  // 导出项目
  const handleExport = useCallback(async () => {
    const { project } = useEditorStore.getState()
    const videoClips = project.tracks
      .filter((t) => t.type === 'video')
      .flatMap((t) => t.clips)
      .filter((c) => c.mediaType === 'video')

    if (videoClips.length === 0) {
      message.warning('没有视频片段可导出')
      return
    }

    setExportModalVisible(true)

    if (!loaded) {
      await load()
    }

    const ff = ffmpeg.current
    if (!ff) {
      message.error('FFmpeg 加载失败')
      setExportModalVisible(false)
      return
    }

    try {
      useEditorStore.getState().setExporting(true)

      const audioClips = project.tracks
        .filter((t) => t.type === 'audio')
        .flatMap((t) => t.clips)
        .filter((c) => c.mediaType === 'audio')

      const subtitleClips = project.tracks
        .filter((t) => t.type === 'subtitle')
        .flatMap((t) => t.clips)
        .filter((c) => c.mediaType === 'subtitle')

      // 写入所有视频文件
      const videoInputs: string[] = []
      for (let i = 0; i < videoClips.length; i++) {
        const clip = videoClips[i]
        const filename = `video_${i}.mp4`
        const response = await fetch(clip.mediaUrl)
        const data = new Uint8Array(await response.arrayBuffer())
        await ff.writeFile(filename, data)
        videoInputs.push(filename)
      }

      // 写入所有音频文件
      const audioInputs: string[] = []
      for (let i = 0; i < audioClips.length; i++) {
        const clip = audioClips[i]
        const ext = clip.name.split('.').pop() || 'mp3'
        const filename = `audio_${i}.${ext}`
        const response = await fetch(clip.mediaUrl)
        const data = new Uint8Array(await response.arrayBuffer())
        await ff.writeFile(filename, data)
        audioInputs.push(filename)
      }

      // 第一步：分别裁剪每个视频片段
      const trimmedVideos: string[] = []
      for (let i = 0; i < videoClips.length; i++) {
        const clip = videoClips[i]
        const outName = `vtrim_${i}.mp4`
        await ff.exec([
          '-i', videoInputs[i],
          '-ss', String(clip.inPoint),
          '-t', String(clip.duration),
          '-c:v', 'libx264',
          '-c:a', 'aac',
          '-preset', 'fast',
          '-y', outName,
        ])
        trimmedVideos.push(outName)
      }

      // 第二步：拼接所有视频片段
      let mergedVideo = trimmedVideos[0]
      if (trimmedVideos.length > 1) {
        // 创建 concat 列表
        const concatList = trimmedVideos.map((f) => `file '${f}'`).join('\n')
        await ff.writeFile('concat.txt', concatList)
        mergedVideo = 'merged_video.mp4'
        await ff.exec([
          '-f', 'concat',
          '-safe', '0',
          '-i', 'concat.txt',
          '-c:v', 'libx264',
          '-c:a', 'aac',
          '-preset', 'fast',
          '-y', mergedVideo,
        ])
      }

      // 第三步：混合音频轨道
      if (audioClips.length > 0) {
        const totalDur = videoClips.reduce((acc, c) => acc + c.duration, 0)

        // 先确保视频有音频流，没有则添加静音音频
        const videoWithAudio = 'video_ensured_audio.mp4'
        await ff.exec([
          '-i', mergedVideo,
          '-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo`,
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-shortest',
          '-y', videoWithAudio,
        ])
        mergedVideo = videoWithAudio

        // 逐个裁剪音频并合并到视频
        for (let i = 0; i < audioClips.length; i++) {
          const clip = audioClips[i]
          const trimName = `atrim_${i}.mp3`
          await ff.exec([
            '-i', audioInputs[i],
            '-ss', String(clip.inPoint),
            '-t', String(clip.duration),
            '-y', trimName,
          ])

          const delayMs = Math.round(clip.startAt * 1000)
          const vol = clip.volume ?? 1
          const outName = `mix_${i}.mp4`
          await ff.exec([
            '-i', mergedVideo,
            '-i', trimName,
            '-filter_complex',
            `[1:a]adelay=${delayMs}|${delayMs},volume=${vol}[aud];[0:a]volume=1[orig];[orig][aud]amix=inputs=2:duration=first[aout]`,
            '-map', '0:v',
            '-map', '[aout]',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-t', String(totalDur),
            '-y', outName,
          ])
          mergedVideo = outName
        }
      }

      // 第四步：烧录字幕（drawtext）
      if (subtitleClips.length > 0) {
        // 下载 TTF 字体文件写入 wasm FS（支持中文）
        // ffmpeg.wasm 的 freetype 仅支持 .ttf 格式
        const fontURLs = [
          'https://raw.githubusercontent.com/ffmpegwasm/testdata/master/arial.ttf',
        ]
        let fontFile = ''
        for (const url of fontURLs) {
          try {
            const fontResp = await fetch(url)
            if (!fontResp.ok) continue
            const fontData = new Uint8Array(await fontResp.arrayBuffer())
            fontFile = 'font.ttf'
            await ff.writeFile(fontFile, fontData)
            break
          } catch {
            continue
          }
        }
        if (!fontFile) {
          console.warn('无法下载字体文件，跳过字幕烧录')
        }

        if (fontFile) {
          const drawFilters = subtitleClips.map((clip) => {
            const text = (clip.text || clip.name).replace(/'/g, "\\'").replace(/:/g, '\\:')
            const fontSize = clip.fontSize || 24
            const fontColor = (clip.fontColor || '#ffffff').replace('#', '0x')
            const enable = `between(t,${clip.startAt},${clip.startAt + clip.duration})`
            return `drawtext=fontfile='${fontFile}':text='${text}':fontsize=${fontSize}:fontcolor=${fontColor}:x=(w-text_w)/2:y=h-${fontSize + 40}:enable='${enable}':borderw=2:bordercolor=black`
          })

          const outputWithSubs = 'output_final.mp4'
          await ff.exec([
            '-i', mergedVideo,
            '-vf', drawFilters.join(','),
            '-c:v', 'libx264',
            '-c:a', 'copy',
            '-preset', 'fast',
            '-y', outputWithSubs,
          ])
          mergedVideo = outputWithSubs
        }
      }

      // 读取最终输出
      const output = await ff.readFile(mergedVideo)
      const blob = new Blob([output], { type: 'video/mp4' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `export_${Date.now()}.mp4`
      a.click()
      URL.revokeObjectURL(url)

      message.success('导出完成')
    } catch (err) {
      console.error('Export failed:', err)
      message.error('导出失败')
    } finally {
      useEditorStore.getState().setExporting(false)
      setExportModalVisible(false)
    }
  }, [loaded, load, ffmpeg])

  return (
    <div className={styles.preview}>
      <div className={styles.canvasHeader}>
        <span className={styles.badge}>编辑预览</span>
        <span className={styles.resolution}>1920 × 1080</span>
      </div>

      <div className={styles.canvasWrap}>
        <video
          ref={videoRef}
          className={styles.video}
          playsInline
        />
        <canvas ref={canvasRef} className={styles.canvas} />
        {!activeClip && (
          <div className={styles.placeholder}>
            <Typography.Text type="secondary">添加素材到时间轴开始编辑</Typography.Text>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.transport}>
          <Tooltip title={playing ? '暂停' : '播放'}>
            <Button
              type="text"
              icon={playing ? <PauseOutlined /> : <CaretRightOutlined />}
              className={styles.controlBtn}
              onClick={togglePlay}
            />
          </Tooltip>
          <Tooltip title="跳到下一片段">
            <Button type="text" icon={<StepForwardOutlined />} className={styles.controlBtn} />
          </Tooltip>
        </div>

        <div className={styles.actionBtns}>
          <Button type="primary" className={styles.actionBtn} onClick={togglePlay}>
            {playing ? '暂停' : '播放'}
          </Button>
          <Button className={styles.actionPause} onClick={togglePlay}>
            {playing ? <PauseOutlined /> : <CaretRightOutlined />}
          </Button>
          <Button danger className={styles.actionStop} onClick={stop}>
            <StopOutlined /> 停止
          </Button>
          <Button type="primary" className={styles.exportBtn} onClick={handleExport}>
            <ExportOutlined /> 导出项目
          </Button>
        </div>

        <div className={styles.timecode}>
          <span className={styles.time}>{formatTime(currentTime)}</span>
          <span className={styles.sep}>/</span>
          <span className={styles.totalTime}>{formatTime(duration)}</span>
        </div>
      </div>

      <Modal
        open={exportModalVisible}
        title="导出项目"
        footer={null}
        closable={false}
        centered
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          {loading ? (
            <>
              <p>正在加载 FFmpeg...</p>
              <Progress percent={ffmpegProgress} />
            </>
          ) : (
            <>
              <p>正在导出视频...</p>
              <Progress percent={useEditorStore.getState().exportProgress} status="active" />
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}

function findActiveVideoClip(clips: Clip[], time: number): Clip | null {
  for (const clip of clips) {
    if (clip.mediaType !== 'video' && clip.mediaType !== 'image') continue
    if (time >= clip.startAt && time < clip.startAt + clip.duration) {
      return clip
    }
  }
  return null
}
