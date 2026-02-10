export interface MediaAsset {
  id: string
  name: string
  type: 'video' | 'audio' | 'image'
  url: string
  duration: number
  thumbnail?: string
}

export interface Clip {
  id: string
  trackId: string
  mediaUrl: string
  mediaType: 'video' | 'audio' | 'image' | 'subtitle'
  name: string
  startAt: number
  duration: number
  inPoint: number
  originalDuration: number
  volume: number
  brightness: number
  contrast: number
  saturation: number
  blur: number
  text?: string
  fontSize?: number
  fontColor?: string
}

export interface Track {
  id: string
  type: 'video' | 'audio' | 'subtitle'
  name: string
  clips: Clip[]
  muted: boolean
  locked: boolean
}

export interface Project {
  tracks: Track[]
}

export interface EditorState {
  project: Project
  currentTime: number
  duration: number
  playing: boolean
  selectedClipId: string | null
  assets: MediaAsset[]
  pps: number
  history: Project[]
  historyIndex: number
  exporting: boolean
  exportProgress: number

  setCurrentTime: (t: number) => void
  setPlaying: (p: boolean) => void
  selectClip: (id: string | null) => void
  setPps: (pps: number) => void
  setExporting: (v: boolean) => void
  setExportProgress: (v: number) => void
  addAsset: (asset: MediaAsset) => void
  removeAsset: (id: string) => void
  addClip: (trackId: string, clip: Omit<Clip, 'id'>) => void
  removeClip: (clipId: string) => void
  updateClip: (clipId: string, data: Partial<Clip>) => void
  moveClip: (clipId: string, newStartAt: number) => void
  splitClip: (clipId: string, splitTime: number) => void
  pushHistory: () => void
  undo: () => void
  redo: () => void
  recalcDuration: () => void
}
