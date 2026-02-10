import { useState } from 'react'
import { Button, Upload, Tabs, Empty, Typography, Tooltip, message } from 'antd'
import {
  VideoCameraOutlined,
  AudioOutlined,
  FileImageOutlined,
  PlusOutlined,
  DeleteOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons'
import type { UploadFile } from 'antd'
import { useEditorStore } from '../store'
import { getMediaDuration, getVideoThumbnail } from '../utils/media'
import type { MediaAsset, Clip } from '../types'
import styles from './MediaLibrary.module.scss'

export default function MediaLibrary() {
  const { assets, addAsset, removeAsset, addClip, project } = useEditorStore()
  const [activeTab, setActiveTab] = useState('all')

  const handleUpload = async (file: UploadFile) => {
    const raw = file.originFileObj || (file as unknown as File)
    if (!raw) return
    const url = URL.createObjectURL(raw)
    const isVideo = raw.type.startsWith('video')
    const isAudio = raw.type.startsWith('audio')
    const isImage = raw.type.startsWith('image')
    const type = isVideo ? 'video' : isAudio ? 'audio' : isImage ? 'image' : null
    if (!type) return

    let duration = 0
    let thumbnail = ''
    if (type === 'video') {
      duration = await getMediaDuration(url, 'video')
      thumbnail = await getVideoThumbnail(url)
    } else if (type === 'audio') {
      duration = await getMediaDuration(url, 'audio')
    }

    const asset: MediaAsset = {
      id: `asset_${Date.now()}`,
      name: raw.name,
      type,
      url,
      duration,
      thumbnail,
    }
    addAsset(asset)
  }

  const handleAddToTimeline = async (asset: MediaAsset) => {
    const trackType = asset.type === 'image' ? 'video' : asset.type
    const track = project.tracks.find((t) => t.type === trackType)
    if (!track) return

    let dur = asset.duration
    if (dur <= 0 && asset.type !== 'image') {
      dur = await getMediaDuration(asset.url, asset.type === 'video' ? 'video' : 'audio')
      if (dur <= 0) dur = 10
    }

    let startAt = 0
    for (const c of track.clips) {
      startAt = Math.max(startAt, c.startAt + c.duration)
    }

    const clip: Omit<Clip, 'id'> = {
      trackId: track.id,
      mediaUrl: asset.url,
      mediaType: asset.type,
      name: asset.name,
      startAt,
      duration: asset.type === 'image' ? 5 : dur,
      inPoint: 0,
      originalDuration: dur,
      volume: 1,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
    }
    addClip(track.id, clip)
    message.success('已添加到时间轴')
  }

  const filtered = activeTab === 'all'
    ? assets
    : assets.filter((a) => a.type === activeTab)

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>项目素材</span>
        <Upload
          showUploadList={false}
          multiple
          accept="video/*,audio/*,image/*"
          beforeUpload={() => false}
          onChange={({ file }) => handleUpload(file)}
        >
          <Tooltip title="上传素材">
            <Button type="text" size="small" icon={<PlusOutlined />} className={styles.addBtn} />
          </Tooltip>
        </Upload>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="small"
        className={styles.tabs}
        items={[
          { key: 'all', label: '全部' },
          { key: 'video', label: '视频', icon: <VideoCameraOutlined /> },
          { key: 'audio', label: '音频', icon: <AudioOutlined /> },
          { key: 'image', label: '图片', icon: <FileImageOutlined /> },
        ]}
      />

      <AssetList assets={filtered} onAdd={handleAddToTimeline} onRemove={removeAsset} />
    </div>
  )
}

function AssetList({
  assets,
  onAdd,
  onRemove,
}: {
  assets: MediaAsset[]
  onAdd: (a: MediaAsset) => void
  onRemove: (id: string) => void
}) {
  if (assets.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无素材" className={styles.empty} />
  }
  return (
    <div className={styles.list}>
      {assets.map((asset) => (
        <div key={asset.id} className={styles.item}>
          <div className={styles.thumb} onClick={() => onAdd(asset)} title="点击添加到时间轴">
            {asset.thumbnail ? (
              <img src={asset.thumbnail} alt="" />
            ) : asset.type === 'audio' ? (
              <AudioOutlined style={{ fontSize: 28, color: 'rgba(255,255,255,0.45)' }} />
            ) : (
              <FileImageOutlined style={{ fontSize: 28, color: 'rgba(255,255,255,0.45)' }} />
            )}
          </div>
          <div className={styles.info}>
            <Typography.Text ellipsis className={styles.name}>{asset.name}</Typography.Text>
            {asset.duration > 0 && (
              <Typography.Text type="secondary" className={styles.dur}>
                {Math.floor(asset.duration / 60)}:{String(Math.floor(asset.duration % 60)).padStart(2, '0')}
              </Typography.Text>
            )}
          </div>
          <div className={styles.actions}>
            <Tooltip title="添加到轨道">
              <Button
                type="text"
                size="small"
                icon={<PlusCircleOutlined />}
                className={styles.actionBtn}
                onClick={() => onAdd(asset)}
              />
            </Tooltip>
            <Tooltip title="移除">
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                className={styles.delBtn}
                onClick={() => onRemove(asset.id)}
              />
            </Tooltip>
          </div>
        </div>
      ))}
    </div>
  )
}
