import { create } from 'zustand'
import type { EditorState, Project, Clip } from './types'

let clipIdCounter = 0
const genId = () => `clip_${++clipIdCounter}_${Date.now()}`

const defaultProject: Project = {
  tracks: [
    { id: 'video-1', type: 'video', name: '视频轨道', clips: [], muted: false, locked: false },
    { id: 'audio-1', type: 'audio', name: '音频轨道', clips: [], muted: false, locked: false },
    { id: 'subtitle-1', type: 'subtitle', name: '字幕轨道', clips: [], muted: false, locked: false },
  ],
}

function calcDuration(project: Project): number {
  let max = 0
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      max = Math.max(max, clip.startAt + clip.duration)
    }
  }
  return max
}

export const useEditorStore = create<EditorState>((set) => ({
  project: defaultProject,
  currentTime: 0,
  duration: 0,
  playing: false,
  selectedClipId: null,
  assets: [],
  pps: 80,
  history: [],
  historyIndex: -1,
  exporting: false,
  exportProgress: 0,

  setCurrentTime: (t) => set({ currentTime: Math.max(0, t) }),
  setPlaying: (p) => set({ playing: p }),
  selectClip: (id) => set({ selectedClipId: id }),
  setPps: (pps) => set({ pps: Math.max(20, Math.min(300, pps)) }),
  setExporting: (v) => set({ exporting: v }),
  setExportProgress: (v) => set({ exportProgress: v }),

  addAsset: (asset) => set((s) => ({ assets: [...s.assets, asset] })),
  removeAsset: (id) => set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),

  addClip: (trackId, clipData) =>
    set((s) => {
      const project = structuredClone(s.project)
      const track = project.tracks.find((t) => t.id === trackId)
      if (!track) return s
      const clip: Clip = { ...clipData, id: genId() }
      track.clips.push(clip)
      return { project, duration: calcDuration(project) }
    }),

  removeClip: (clipId) =>
    set((s) => {
      const project = structuredClone(s.project)
      for (const track of project.tracks) {
        track.clips = track.clips.filter((c) => c.id !== clipId)
      }
      const selectedClipId = s.selectedClipId === clipId ? null : s.selectedClipId
      return { project, selectedClipId, duration: calcDuration(project) }
    }),

  updateClip: (clipId, data) =>
    set((s) => {
      const project = structuredClone(s.project)
      for (const track of project.tracks) {
        const clip = track.clips.find((c) => c.id === clipId)
        if (clip) {
          Object.assign(clip, data)
          break
        }
      }
      return { project, duration: calcDuration(project) }
    }),

  moveClip: (clipId, newStartAt) =>
    set((s) => {
      const project = structuredClone(s.project)
      for (const track of project.tracks) {
        const clip = track.clips.find((c) => c.id === clipId)
        if (clip) {
          clip.startAt = Math.max(0, newStartAt)
          break
        }
      }
      return { project, duration: calcDuration(project) }
    }),

  splitClip: (clipId, splitTime) =>
    set((s) => {
      const project = structuredClone(s.project)
      for (const track of project.tracks) {
        const clipIndex = track.clips.findIndex((c) => c.id === clipId)
        if (clipIndex === -1) continue
        const clip = track.clips[clipIndex]
        // splitTime 是全局时间轴时间，确保它在 clip 范围内
        if (splitTime <= clip.startAt || splitTime >= clip.startAt + clip.duration) break

        const localSplit = splitTime - clip.startAt // 相对于 clip 起点的偏移
        const leftDuration = localSplit
        const rightDuration = clip.duration - localSplit

        // 左半部分（修改原 clip）
        clip.duration = leftDuration

        // 右半部分（新 clip）
        const rightClip = {
          ...clip,
          id: genId(),
          startAt: splitTime,
          inPoint: clip.inPoint + localSplit,
          duration: rightDuration,
        }
        // 字幕分割时复制文字
        if (clip.mediaType === 'subtitle') {
          rightClip.text = clip.text
        }

        track.clips.splice(clipIndex + 1, 0, rightClip)
        break
      }
      return { project, duration: calcDuration(project) }
    }),

  pushHistory: () =>
    set((s) => {
      const history = s.history.slice(0, s.historyIndex + 1)
      history.push(structuredClone(s.project))
      if (history.length > 50) history.shift()
      return { history, historyIndex: history.length - 1 }
    }),

  undo: () =>
    set((s) => {
      if (s.historyIndex < 0) return s
      const project = structuredClone(s.history[s.historyIndex])
      return { project, historyIndex: s.historyIndex - 1, duration: calcDuration(project) }
    }),

  redo: () =>
    set((s) => {
      if (s.historyIndex >= s.history.length - 1) return s
      const project = structuredClone(s.history[s.historyIndex + 1])
      return { project, historyIndex: s.historyIndex + 1, duration: calcDuration(project) }
    }),

  recalcDuration: () =>
    set((s) => ({ duration: calcDuration(s.project) })),
}))
