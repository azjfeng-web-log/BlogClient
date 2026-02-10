import { useRef, useCallback } from 'react'
import { Button, Tooltip, Slider } from 'antd'
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  SoundOutlined,
  LockOutlined,
} from '@ant-design/icons'
import { useEditorStore } from '../../store'
import { usePlayback } from '../../hooks/usePlayback'
import { formatTime } from '../../utils/media'
import TrackRow from './TrackRow'
import styles from './Timeline.module.scss'

export default function Timeline() {
  const { project, currentTime, duration, pps, setPps } = useEditorStore()
  const { seek } = usePlayback()
  const rulerRef = useRef<HTMLDivElement>(null)

  const totalWidth = Math.max(duration * pps + 200, 800)

  const handleRulerClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = e.clientX - rect.left + (e.currentTarget.scrollLeft || 0)
      seek(Math.max(0, x / pps))
    },
    [pps, seek]
  )

  const ticks = generateTicks(duration + 3, pps)

  return (
    <div className={styles.timeline}>
      <div className={styles.toolbar}>
        <div className={styles.trackLabels}>
          <span className={styles.toolbarTitle}>轨道</span>
        </div>
        <div className={styles.toolbarRight}>
          <div className={styles.zoomControls}>
            <Tooltip title="缩小">
              <Button
                type="text"
                size="small"
                icon={<ZoomOutOutlined />}
                className={styles.zoomBtn}
                onClick={() => setPps(pps / 1.3)}
              />
            </Tooltip>
            <Slider
              className={styles.zoomSlider}
              min={20}
              max={300}
              value={pps}
              onChange={setPps}
              tooltip={{ formatter: (v) => `${v}px/s` }}
            />
            <Tooltip title="放大">
              <Button
                type="text"
                size="small"
                icon={<ZoomInOutlined />}
                className={styles.zoomBtn}
                onClick={() => setPps(pps * 1.3)}
              />
            </Tooltip>
          </div>
          <span className={styles.durationLabel}>总时长 {formatTime(duration)}</span>
        </div>
      </div>

      <div className={styles.body}>
        {/* 轨道名称列 */}
        <div className={styles.trackNames}>
          {project.tracks.map((track) => (
            <div key={track.id} className={styles.trackName}>
              <span className={styles.trackLabel}>{track.name}</span>
              <div className={styles.trackControls}>
                <SoundOutlined className={styles.trackIcon} />
                <LockOutlined className={styles.trackIcon} />
              </div>
            </div>
          ))}
        </div>

        {/* 时间轴滚动区 */}
        <div className={styles.scrollArea} ref={rulerRef}>
          {/* 刻度尺 */}
          <div className={styles.ruler} style={{ width: totalWidth }} onClick={handleRulerClick}>
            {ticks.map((t, i) => (
              <div
                key={i}
                className={styles.tick}
                style={{ left: t.time * pps }}
              >
                {t.major && <span className={styles.tickLabel}>{t.label}</span>}
                <div className={t.major ? styles.tickMajor : styles.tickMinor} />
              </div>
            ))}
          </div>

          {/* 轨道行 */}
          <div className={styles.tracks} style={{ width: totalWidth }}>
            {project.tracks.map((track) => (
              <TrackRow key={track.id} track={track} pps={pps} />
            ))}
          </div>

          {/* 播放指针 */}
          <div
            className={styles.playhead}
            style={{ left: currentTime * pps }}
          >
            <div className={styles.playheadHead} />
            <div className={styles.playheadLine} />
          </div>
        </div>
      </div>
    </div>
  )
}

interface Tick {
  time: number
  major: boolean
  label: string
}

function generateTicks(totalTime: number, pps: number): Tick[] {
  const ticks: Tick[] = []
  let interval = 1
  if (pps < 30) interval = 10
  else if (pps < 60) interval = 5
  else if (pps < 120) interval = 2
  else interval = 1

  for (let t = 0; t <= totalTime; t += interval / 2) {
    const major = t % interval === 0
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    ticks.push({
      time: t,
      major,
      label: major ? `${m}:${String(s).padStart(2, '0')}` : '',
    })
  }
  return ticks
}
