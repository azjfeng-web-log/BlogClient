---
name: VideoEditor
description: 专业网页版视频编辑器开发技能，涵盖 React + TypeScript + Ant Design 技术栈，深色主题，包含时间轴、素材库、预览区、属性面板等核心模块的架构规范与实现指南。
---

# Skill: 网页版视频编辑器（VideoEditor）

## 角色定义
你是一个专业的前端视频编辑器开发专家，精通 React + TypeScript + Ant Design 技术栈，擅长构建类似 Premiere Pro / Final Cut Pro 风格的深色主题 Web 应用。

## 项目上下文
- **项目路径**: `BlogClient/src/pages/VideoEditor/`
- **技术栈**: React 18 + TypeScript + Ant Design 5 + Zustand + Vite + SCSS Modules
- **已有依赖**: antd, @ant-design/icons, zustand, react-router-dom, sass

## 模块架构

```
src/pages/VideoEditor/
├── index.tsx                    # 主页面布局
├── store.ts                     # Zustand 状态管理
├── types.ts                     # TypeScript 类型定义
├── index.module.scss            # 主布局样式
├── components/
│   ├── Header.tsx               # 顶部工具栏 (h: 60px)
│   ├── Header.module.scss
│   ├── MediaLibrary.tsx         # 左侧素材库 (w: 250px, 可折叠)
│   ├── MediaLibrary.module.scss
│   ├── PreviewCanvas.tsx        # 中间预览区 (16:9)
│   ├── PreviewCanvas.module.scss
│   ├── PropertyPanel.tsx        # 右侧属性面板 (w: 300px, 可折叠)
│   ├── PropertyPanel.module.scss
│   └── Timeline/
│       ├── Timeline.tsx         # 底部时间轴 (h: 200px, 可调整)
│       ├── Timeline.module.scss
│       ├── TrackRow.tsx         # 轨道行
│       └── TrackRow.module.scss
├── hooks/
│   ├── usePlayback.ts           # 播放控制
│   └── useFFmpeg.ts             # FFmpeg.wasm 集成
└── utils/
    └── media.ts                 # 媒体工具函数
```

## 类型定义规范

```typescript
// 媒体素材
interface MediaAsset {
  id: string
  name: string
  type: 'video' | 'audio' | 'image'
  url: string
  duration: number
  thumbnail?: string
}

// 轨道片段
interface Clip {
  id: string
  trackId: string
  mediaUrl: string
  mediaType: 'video' | 'audio' | 'image'
  name: string
  startAt: number       // 在时间轴上的起始时间
  duration: number      // 片段显示时长
  inPoint: number       // 裁剪起点
  originalDuration: number
  volume: number
}

// 轨道
interface Track {
  id: string
  type: 'video' | 'audio' | 'subtitle'
  name: string
  clips: Clip[]
  muted: boolean
  locked: boolean
}

// 项目
interface Project {
  tracks: Track[]
}
```

## 设计规范

### 配色
| 用途 | 色值 |
|------|------|
| 主背景 | `#1e1e1e` |
| 面板背景 | `#252525` |
| 轨道背景 | `#2a2a2a` |
| 边框 | `rgba(255,255,255,0.08)` |
| 主文字 | `rgba(255,255,255,0.85)` |
| 次文字 | `rgba(255,255,255,0.45)` |
| 强调色 | `#1890ff` |
| 播放指针 | `#ff4d4f` |
| 视频片段 | `#1890ff` |
| 音频片段 | `#52c41a` |
| 字幕片段 | `#faad14` |

### 布局
- Header: 固定顶部, 高度 60px
- MediaLibrary: 左侧, 宽度 250px, 可折叠
- PreviewCanvas: 中间自适应, 16:9 比例
- PropertyPanel: 右侧, 宽度 300px, 可折叠
- Timeline: 底部, 高度 200px, 可拖拽调整

## 关键实现要点

### 状态管理 (Zustand)
- `project`: 项目数据（tracks + clips）
- `currentTime`: 当前播放时间
- `playing`: 播放状态
- `selectedClipId`: 选中的片段
- `assets`: 素材列表
- 支持 `undo/redo`（history 栈）

### 时间轴交互
- 片段拖拽移动：mousedown 仅 selectClip，移动超过 3px 阈值才启动拖拽
- 片段边缘拖拽 resize：左/右边缘 6px 内触发
- 点击轨道空白区域取消选中
- 时间刻度尺 + 缩放控制（pps: pixels per second）

### 播放控制 (usePlayback)
- 使用 requestAnimationFrame 驱动
- tick 函数内从 `useEditorStore.getState()` 实时取值，避免闭包陷阱
- 播放到末尾自动停止

### 媒体工具 (utils/media.ts)
- `getMediaDuration`: 获取媒体时长，带 `ondurationchange` 兜底 + 5s 超时
- `getVideoThumbnail`: 生成缩略图，先 `loadeddata` 再 `seek`
- 所有 Promise 都要 resolve 保护，避免挂起

### FFmpeg.wasm 集成
- Vite 需要 `optimizeDeps.exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']`
- 需要 COOP/COEP 响应头
- Vite 必须用 ESM 版 CDN: `https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm`
- 用 `toBlobURL` 加载核心文件解决 CORS

## 工作流程

### 新建功能时
1. 先在 `types.ts` 定义/扩展类型
2. 在 `store.ts` 添加状态和 action
3. 实现组件 + 样式（SCSS Modules）
4. 如需媒体处理，在 `utils/media.ts` 或 `hooks/useFFmpeg.ts` 中实现

### 修复 bug 时
1. 确认问题组件和相关 store action
2. 检查事件冒泡、闭包、异步竞态
3. 修改后验证 TypeScript 编译通过

## 禁止事项
- 不使用 CSS-in-JS，统一用 SCSS Modules
- 不在 useCallback/useMemo 依赖中放可变 store 值（用 getState() 代替）
- 不用 `any` 类型（除 catch error）
- 不在 Promise 中遗漏 reject/resolve 路径
