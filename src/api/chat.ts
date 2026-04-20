import { useUserStore } from '@/store/userStore'

/** 可选模型列表 */
export interface ChatModel {
  id: string
  name: string
  description?: string
}

/** 聊天消息 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  createdAt: number
}

/** SSE 请求参数 */
export interface ChatSSEParams {
  message: string
  model: string
  sessionId?: string
}

/** SSE 回调 */
export interface ChatSSECallbacks {
  onMessage: (chunk: string) => void
  onSessionId?: (sessionId: string) => void
  onDone: () => void
  onError: (error: Error) => void
}

const BASE_URL = '/api_v2'

/** 获取可用模型列表 */
export const getChatModels = async (): Promise<ChatModel[]> => {
  const token = useUserStore.getState().token
  const res = await fetch(`${BASE_URL}/chat/models`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  const json = await res.json()
  if (json.code === 0) return json.data
  throw new Error(json.message || '获取模型列表失败')
}

/** 获取历史会话列表 */
export const getChatSessions = async (): Promise<{ sessionId: string; title: string; model: string; updatedAt: string }[]> => {
  const token = useUserStore.getState().token
  const res = await fetch(`${BASE_URL}/chat/sessions`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  const json = await res.json()
  if (json.code === 0) return json.data
  throw new Error(json.message || '获取会话列表失败')
}

/** 获取会话历史消息（用于 sessionId 重连） */
export const getChatHistory = async (sessionId: string): Promise<ChatMessage[]> => {
  const token = useUserStore.getState().token
  const res = await fetch(`${BASE_URL}/chat/history?sessionId=${sessionId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  const json = await res.json()
  if (json.code === 0) return json.data
  throw new Error(json.message || '获取历史消息失败')
}

/**
 * 发送 SSE 聊天请求
 * 返回 AbortController 用于取消请求
 */
export const sendChatSSE = (params: ChatSSEParams, callbacks: ChatSSECallbacks): AbortController => {
  const controller = new AbortController()
  const token = useUserStore.getState().token

  fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      message: params.message,
      model: params.model,
      sessionId: params.sessionId,
      stream: true
    }),
    signal: controller.signal
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法获取响应流')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          callbacks.onDone()
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6)
            if (data === '[DONE]') {
              callbacks.onDone()
              return
            }
            try {
              const parsed = JSON.parse(data)
              // 服务端可能在首条消息中返回 sessionId
              if (parsed.sessionId && callbacks.onSessionId) {
                callbacks.onSessionId(parsed.sessionId)
              }
              if (parsed.content) {
                callbacks.onMessage(parsed.content)
              }
            } catch {
              // 非 JSON 格式，当纯文本处理
              callbacks.onMessage(data)
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        callbacks.onError(err)
      }
    })

  return controller
}
