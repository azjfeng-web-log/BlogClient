import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ChatMessage, ChatModel } from '@/api/chat'

interface ChatSession {
  sessionId: string
  title: string
  model: string
  messages: ChatMessage[]
  updatedAt: number
}

interface ChatState {
  /** 可用模型列表 */
  models: ChatModel[]
  /** 当前选中模型 */
  currentModel: string
  /** 会话列表 */
  sessions: ChatSession[]
  /** 当前活跃会话 ID */
  activeSessionId: string | null
  /** 是否正在生成回复 */
  streaming: boolean
  /** 流式累积内容 */
  streamContent: string

  setModels: (models: ChatModel[]) => void
  setCurrentModel: (model: string) => void
  setStreaming: (streaming: boolean) => void
  setStreamContent: (content: string) => void
  appendStreamContent: (chunk: string) => void

  /** 创建新会话 */
  createSession: (model: string) => string
  /** 切换会话 */
  setActiveSession: (sessionId: string | null) => void
  /** 删除会话 */
  deleteSession: (sessionId: string) => void
  /** 恢复会话（从服务端拉取历史消息） */
  restoreSession: (sessionId: string, title: string, model: string, messages: ChatMessage[]) => void
  /** 初始化会话列表（从服务端加载，合并到本地） */
  initServerSessions: (serverSessions: { sessionId: string; title: string; model: string; updatedAt: string }[]) => void
  /** 替换整个会话列表（服务端数据优先） */
  replaceAllSessions: (sessions: ChatSession[]) => void

  /** 添加消息到当前会话 */
  addMessage: (sessionId: string, message: ChatMessage) => void
  /** 更新会话的 sessionId（首次 SSE 返回时） */
  updateSessionId: (oldId: string, newId: string) => void

  /** 获取当前会话消息 */
  getActiveMessages: () => ChatMessage[]
}

const genTempId = () => `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      models: [],
      currentModel: '',
      sessions: [],
      activeSessionId: null,
      streaming: false,
      streamContent: '',

      setModels: (models) => set({ models }),
      setCurrentModel: (model) => set({ currentModel: model }),
      setStreaming: (streaming) => set({ streaming }),
      setStreamContent: (content) => set({ streamContent: content }),
      appendStreamContent: (chunk) => set((s) => ({ streamContent: s.streamContent + chunk })),

      createSession: (model) => {
        const id = genTempId()
        const session: ChatSession = {
          sessionId: id,
          title: '新对话',
          model,
          messages: [],
          updatedAt: Date.now()
        }
        set((s) => ({
          sessions: [session, ...s.sessions],
          activeSessionId: id
        }))
        return id
      },

      setActiveSession: (sessionId) => set({ activeSessionId: sessionId, streamContent: '' }),

      deleteSession: (sessionId) =>
        set((s) => {
          const sessions = s.sessions.filter((se) => se.sessionId !== sessionId)
          return {
            sessions,
            activeSessionId: s.activeSessionId === sessionId ? null : s.activeSessionId
          }
        }),

      restoreSession: (sessionId: string, title: string, model: string, messages: ChatMessage[]) => {
        const state = get()
        const exists = state.sessions.find((s) => s.sessionId === sessionId)
        if (exists) {
          set((s) => ({
            sessions: s.sessions.map((se) =>
              se.sessionId === sessionId ? { ...se, messages, title, model } : se
            ),
            activeSessionId: sessionId
          }))
        } else {
          const session: ChatSession = { sessionId, title, model, messages, updatedAt: Date.now() }
          set((s) => ({
            sessions: [session, ...s.sessions],
            activeSessionId: sessionId
          }))
        }
      },

      initServerSessions: (serverSessions) =>
        set((s) => {
          const existingIds = new Set(s.sessions.map((se) => se.sessionId))
          const merged = serverSessions
            .filter((ss) => !existingIds.has(ss.sessionId))
            .map((ss) => ({
              sessionId: ss.sessionId,
              title: ss.title,
              model: ss.model,
              messages: [] as ChatMessage[],
              updatedAt: new Date(ss.updatedAt).getTime() || Date.now()
            }))
          return { sessions: [...merged, ...s.sessions] }
        }),

      replaceAllSessions: (sessions) => set({ sessions }),

      addMessage: (sessionId, message) =>
        set((s) => ({
          sessions: s.sessions.map((se) =>
            se.sessionId === sessionId
              ? {
                  ...se,
                  messages: [...se.messages, message],
                  title: se.messages.length === 0 && message.role === 'user'
                    ? message.content.slice(0, 20) || '新对话'
                    : se.title,
                  updatedAt: Date.now()
                }
              : se
          )
        })),

      updateSessionId: (oldId, newId) =>
        set((s) => ({
          sessions: s.sessions.map((se) =>
            se.sessionId === oldId ? { ...se, sessionId: newId } : se
          ),
          activeSessionId: s.activeSessionId === oldId ? newId : s.activeSessionId
        })),

      getActiveMessages: () => {
        const { sessions, activeSessionId } = get()
        return sessions.find((s) => s.sessionId === activeSessionId)?.messages || []
      }
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        sessions: state.sessions.slice(0, 50),
        currentModel: state.currentModel
      })
    }
  )
)
