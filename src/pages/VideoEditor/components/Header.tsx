import { Dropdown, Button, Space, Tooltip } from 'antd'
import {
  ScissorOutlined,
  UndoOutlined,
  RedoOutlined,
  DeleteOutlined,
  LeftOutlined,
  FontSizeOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useEditorStore } from '../store'
import styles from './Header.module.scss'

const fileMenuItems = [
  { key: 'new', label: '新建项目' },
  { key: 'open', label: '打开项目' },
  { key: 'save', label: '保存项目' },
  { type: 'divider' as const },
  { key: 'import', label: '导入素材' },
]

const editMenuItems = [
  { key: 'undo', label: '撤销' },
  { key: 'redo', label: '重做' },
  { type: 'divider' as const },
  { key: 'delete', label: '删除选中' },
  { key: 'selectAll', label: '全选' },
]

const viewMenuItems = [
  { key: 'zoomIn', label: '放大时间轴' },
  { key: 'zoomOut', label: '缩小时间轴' },
  { key: 'fitAll', label: '适应全部' },
]

const effectMenuItems = [
  { key: 'transition', label: '转场效果' },
  { key: 'filter', label: '滤镜' },
  { key: 'text', label: '添加文字' },
]

export default function Header() {
  const navigate = useNavigate()
  const { undo, redo, removeClip, selectedClipId, setPps, pps, addClip, project, currentTime, splitClip, pushHistory } = useEditorStore()

  const handleEditMenu = ({ key }: { key: string }) => {
    if (key === 'undo') undo()
    else if (key === 'redo') redo()
    else if (key === 'delete' && selectedClipId) removeClip(selectedClipId)
  }

  const handleViewMenu = ({ key }: { key: string }) => {
    if (key === 'zoomIn') setPps(pps * 1.5)
    else if (key === 'zoomOut') setPps(pps / 1.5)
    else if (key === 'fitAll') setPps(80)
  }

  const handleSplit = () => {
    if (!selectedClipId) return
    // 找到选中的 clip，在当前播放时间处分割
    let targetClip = null
    for (const track of project.tracks) {
      const found = track.clips.find((c) => c.id === selectedClipId)
      if (found) { targetClip = found; break }
    }
    if (!targetClip) return
    if (currentTime <= targetClip.startAt || currentTime >= targetClip.startAt + targetClip.duration) return
    pushHistory()
    splitClip(selectedClipId, currentTime)
  }

  const handleEffectMenu = ({ key }: { key: string }) => {
    if (key === 'text') {
      const subtitleTrack = project.tracks.find((t) => t.type === 'subtitle')
      if (!subtitleTrack) return
      addClip(subtitleTrack.id, {
        trackId: subtitleTrack.id,
        mediaUrl: '',
        mediaType: 'subtitle',
        name: '新字幕',
        startAt: currentTime,
        duration: 3,
        inPoint: 0,
        originalDuration: 3,
        volume: 1,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        text: '请输入字幕文字',
        fontSize: 24,
        fontColor: '#ffffff',
      })
    }
  }

  return (
    <div className={styles.header}>
      <div className={styles.left}>
        <Tooltip title="返回">
          <Button
            type="text"
            icon={<LeftOutlined />}
            className={styles.backBtn}
            onClick={() => navigate('/')}
          />
        </Tooltip>
        <span className={styles.logo}>视频编辑器</span>

        <div className={styles.menus}>
          <Dropdown menu={{ items: fileMenuItems }} trigger={['click']}>
            <span className={styles.menuItem}>文件</span>
          </Dropdown>
          <Dropdown menu={{ items: editMenuItems, onClick: handleEditMenu }} trigger={['click']}>
            <span className={styles.menuItem}>编辑</span>
          </Dropdown>
          <Dropdown menu={{ items: viewMenuItems, onClick: handleViewMenu }} trigger={['click']}>
            <span className={styles.menuItem}>视图</span>
          </Dropdown>
          <Dropdown menu={{ items: effectMenuItems, onClick: handleEffectMenu }} trigger={['click']}>
            <span className={styles.menuItem}>效果</span>
          </Dropdown>
        </div>
      </div>

      <div className={styles.center}>
        <Space>
          <Tooltip title="撤销">
            <Button type="text" icon={<UndoOutlined />} className={styles.toolBtn} onClick={undo} />
          </Tooltip>
          <Tooltip title="重做">
            <Button type="text" icon={<RedoOutlined />} className={styles.toolBtn} onClick={redo} />
          </Tooltip>
          <Tooltip title="分割">
            <Button type="text" icon={<ScissorOutlined />} className={styles.toolBtn} onClick={handleSplit} />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              className={styles.toolBtn}
              onClick={() => selectedClipId && removeClip(selectedClipId)}
            />
          </Tooltip>
          <Tooltip title="添加字幕">
            <Button
              type="text"
              icon={<FontSizeOutlined />}
              className={styles.toolBtn}
              onClick={() => handleEffectMenu({ key: 'text' })}
            />
          </Tooltip>
        </Space>
      </div>

      <div className={styles.right} />
    </div>
  )
}
