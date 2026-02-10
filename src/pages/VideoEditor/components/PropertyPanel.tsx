import { Slider, Collapse, Empty, Input, InputNumber, ColorPicker } from 'antd'
import { useEditorStore } from '../store'
import type { Clip } from '../types'
import styles from './PropertyPanel.module.scss'

export default function PropertyPanel() {
  const { project, selectedClipId, updateClip, pushHistory } = useEditorStore()

  let selectedClip: Clip | null = null
  if (selectedClipId) {
    for (const track of project.tracks) {
      const found = track.clips.find((c) => c.id === selectedClipId)
      if (found) {
        selectedClip = found
        break
      }
    }
  }

  if (!selectedClip) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>属性面板</span>
          <span className={styles.reset}>重置</span>
        </div>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选中片段查看属性" className={styles.empty} />
      </div>
    )
  }

  const handleChange = (key: keyof Clip, value: number | string) => {
    pushHistory()
    updateClip(selectedClip!.id, { [key]: value })
  }

  const handleReset = () => {
    if (!selectedClip) return
    pushHistory()
    updateClip(selectedClip.id, {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      volume: 1,
    })
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>属性面板</span>
        <span className={styles.reset} onClick={handleReset}>重置</span>
      </div>

      <div className={styles.body}>
        <div className={styles.clipName}>{selectedClip.name}</div>

        {selectedClip.mediaType === 'video' && (
          <Collapse
            ghost
            defaultActiveKey={['adjust', 'audio']}
            className={styles.collapse}
            items={[
              {
                key: 'adjust',
                label: '画面调整',
                children: (
                  <div className={styles.sliders}>
                    <SliderRow
                      label="亮度"
                      value={selectedClip.brightness ?? 100}
                      min={0}
                      max={200}
                      onChange={(v) => handleChange('brightness', v)}
                    />
                    <SliderRow
                      label="对比度"
                      value={selectedClip.contrast ?? 100}
                      min={0}
                      max={200}
                      onChange={(v) => handleChange('contrast', v)}
                    />
                    <SliderRow
                      label="饱和度"
                      value={selectedClip.saturation ?? 100}
                      min={0}
                      max={200}
                      onChange={(v) => handleChange('saturation', v)}
                    />
                    <SliderRow
                      label="模糊度"
                      value={selectedClip.blur ?? 0}
                      min={0}
                      max={20}
                      onChange={(v) => handleChange('blur', v)}
                    />
                  </div>
                ),
              },
              {
                key: 'audio',
                label: '音频',
                children: (
                  <div className={styles.sliders}>
                    <SliderRow
                      label="音量"
                      value={Math.round(selectedClip.volume * 100)}
                      min={0}
                      max={200}
                      onChange={(v) => handleChange('volume', v / 100)}
                    />
                  </div>
                ),
              },
            ]}
          />
        )}

        {selectedClip.mediaType === 'audio' && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>音频属性</div>
            <div className={styles.sliders}>
              <SliderRow
                label="音量"
                value={Math.round(selectedClip.volume * 100)}
                min={0}
                max={200}
                onChange={(v) => handleChange('volume', v / 100)}
              />
            </div>
          </div>
        )}

        {selectedClip.mediaType === 'subtitle' && (
          <Collapse
            ghost
            defaultActiveKey={['text', 'style']}
            className={styles.collapse}
            items={[
              {
                key: 'text',
                label: '字幕内容',
                children: (
                  <div className={styles.subtitleEdit}>
                    <Input.TextArea
                      value={selectedClip.text || selectedClip.name}
                      rows={3}
                      className={styles.textArea}
                      onChange={(e) => handleChange('text', e.target.value)}
                    />
                  </div>
                ),
              },
              {
                key: 'style',
                label: '字幕样式',
                children: (
                  <div className={styles.sliders}>
                    <div className={styles.sliderRow}>
                      <span className={styles.sliderLabel}>字号</span>
                      <InputNumber
                        size="small"
                        min={12}
                        max={72}
                        value={selectedClip.fontSize || 24}
                        onChange={(v) => v && handleChange('fontSize', v)}
                        className={styles.numInput}
                      />
                    </div>
                    <div className={styles.sliderRow}>
                      <span className={styles.sliderLabel}>颜色</span>
                      <ColorPicker
                        size="small"
                        value={selectedClip.fontColor || '#ffffff'}
                        onChange={(_, hex) => handleChange('fontColor', hex)}
                      />
                    </div>
                    <SliderRow
                      label="时长"
                      value={selectedClip.duration}
                      min={0.5}
                      max={30}
                      step={0.5}
                      onChange={(v) => handleChange('duration', v)}
                    />
                  </div>
                ),
              },
            ]}
          />
        )}

        <div className={styles.section}>
          <div className={styles.sectionTitle}>时间信息</div>
          <div className={styles.infoRow}>
            <span>起始时间</span>
            <span>{selectedClip.startAt.toFixed(2)}s</span>
          </div>
          <div className={styles.infoRow}>
            <span>持续时长</span>
            <span>{selectedClip.duration.toFixed(2)}s</span>
          </div>
          {selectedClip.mediaType !== 'subtitle' && (
            <div className={styles.infoRow}>
              <span>裁剪起点</span>
              <span>{selectedClip.inPoint.toFixed(2)}s</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SliderRow({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange?: (v: number) => void
}) {
  return (
    <div className={styles.sliderRow}>
      <span className={styles.sliderLabel}>{label}</span>
      <Slider
        className={styles.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        tooltip={{ formatter: (v) => `${v}` }}
      />
    </div>
  )
}
