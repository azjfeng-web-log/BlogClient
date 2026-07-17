//ts-ignore
import { useState, useEffect, useRef, useCallback } from 'react'
import { Button, Select, Input, Avatar, Spin, Empty, Popconfirm, message } from 'antd'
import {
  PlusOutlined,
  SendOutlined,
  DeleteOutlined,
  RobotOutlined,
  UserOutlined,
  StopOutlined
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { sendChatSSE, getChatModels, getChatSessions, getChatHistory, ChatMessage } from '@/api/chat'
import { useChatStore } from '@/store/chatStore'
import { useUserStore } from '@/store/userStore'
import styles from './Chat.module.scss'

const { TextArea } = Input

/** 默认模型列表（接口失败时兜底，需与后端一致） */
const FALLBACK_MODELS = [
  { id: 'deepseek-chat', name: 'DeepSeek V3', description: 'DeepSeek 最新对话模型' },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1', description: 'DeepSeek 推理模型' }
]

export default function Chat() {
  const user = useUserStore((s) => s.user)
  const {
    models, currentModel, sessions, activeSessionId, streaming, streamContent,
    setModels, setCurrentModel, setStreaming, setStreamContent, appendStreamContent,
    createSession, setActiveSession, deleteSession, restoreSession,
    addMessage, updateSessionId, getActiveMessages, initServerSessions
  } = useChatStore()

  const [inputValue, setInputValue] = useState('')
  const [loadingHistory, setLoadingHistory] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const messageEndRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef<string | null>(null)

  // 初始化模型列表
  useEffect(() => {
    getChatModels()
      .then((list) => {
        setModels(list.length ? list : FALLBACK_MODELS)
        if (!currentModel && list.length) setCurrentModel(list[0].id)
      })
      .catch(() => {
        setModels(FALLBACK_MODELS)
        if (!currentModel) setCurrentModel(FALLBACK_MODELS[0].id)
      })

    // 加载服务端会话列表
    if (user) {
      getChatSessions()
        .then((serverSessions) => {
          if (serverSessions.length > 0) initServerSessions(serverSessions)
        })
        .catch(() => {})
    }
  }, [user])

  // 自动滚动到底部
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [getActiveMessages().length, streamContent])

  // 跟踪当前 sessionId
  useEffect(() => {
    sessionIdRef.current = activeSessionId
  }, [activeSessionId])

  const activeMessages = getActiveMessages()
  const activeSession = sessions.find((s) => s.sessionId === activeSessionId)

  /** 新建对话 */
  const handleNewChat = useCallback(() => {
    if (streaming) return
    const model = currentModel || models[0]?.id || 'deepseek-chat'
    createSession(model)
  }, [streaming, currentModel, models, createSession])

  /** 切换会话（支持从服务端恢复） */
  const handleSelectSession = useCallback(async (sessionId: string) => {
    if (streaming) return
    const session = sessions.find((s) => s.sessionId === sessionId)
    if (session && session.messages.length > 0) {
      setActiveSession(sessionId)
      return
    }
    // 尝试从服务端拉取历史
    if (!sessionId.startsWith('temp_')) {
      setLoadingHistory(true)
      try {
        const history = await getChatHistory(sessionId)
        restoreSession(sessionId, session?.title || '对话', session?.model || currentModel, history)
      } catch {
        setActiveSession(sessionId)
      } finally {
        setLoadingHistory(false)
      }
    } else {
      setActiveSession(sessionId)
    }
  }, [streaming, sessions, currentModel, setActiveSession, restoreSession])

  /** 发送消息 */
  const handleSend = useCallback(() => {
    const text = inputValue.trim()
    if (!text || streaming) return

    let sessionId = activeSessionId
    if (!sessionId) {
      sessionId = createSession(currentModel)
    }

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text,
      model: currentModel,
      createdAt: Date.now()
    }
    addMessage(sessionId, userMsg)
    setInputValue('')
    setStreaming(true)
    setStreamContent('')

    const currentSessionId = sessionId

    abortRef.current = sendChatSSE(
      { message: text, model: currentModel, sessionId: currentSessionId.startsWith('temp_') ? undefined : currentSessionId },
      {
        onMessage: (chunk) => {
          appendStreamContent(chunk)
        },
        onSessionId: (newSessionId) => {
          if (currentSessionId.startsWith('temp_')) {
            updateSessionId(currentSessionId, newSessionId)
            sessionIdRef.current = newSessionId
          }
        },
        onDone: () => {
          const content = useChatStore.getState().streamContent
          const sid = sessionIdRef.current || currentSessionId
          const assistantMsg: ChatMessage = {
            id: `msg_${Date.now()}_assistant`,
            role: 'assistant',
            content,
            model: currentModel,
            createdAt: Date.now()
          }
          addMessage(sid, assistantMsg)
          setStreaming(false)
          setStreamContent('')
          abortRef.current = null
        },
        onError: (err) => {
          message.error(`请求失败: ${err.message}`)
          setStreaming(false)
          setStreamContent('')
          abortRef.current = null
        }
      }
    )
  }, [inputValue, streaming, activeSessionId, currentModel, createSession, addMessage, setStreaming, setStreamContent, appendStreamContent, updateSessionId])

  /** 停止生成 */
  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    const content = useChatStore.getState().streamContent
    if (content) {
      const sid = sessionIdRef.current || activeSessionId
      if (sid) {
        const assistantMsg: ChatMessage = {
          id: `msg_${Date.now()}_stopped`,
          role: 'assistant',
          content: content + '\n\n*[已停止生成]*',
          model: currentModel,
          createdAt: Date.now()
        }
        addMessage(sid, assistantMsg)
      }
    }
    setStreaming(false)
    setStreamContent('')
    abortRef.current = null
  }, [activeSessionId, currentModel, addMessage, setStreaming, setStreamContent])

  /** 快捷键发送 */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /** Markdown 代码块渲染 */
  const codeRenderer = {
    code({ className, children, ...props }: React.ComponentPropsWithoutRef<'code'>) {
      const match = /language-(\w+)/.exec(className || '')
      const codeStr = String(children).replace(/\n$/, '')
      return match ? (
        <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div">
          {codeStr}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>{children}</code>
      )
    }
  }

  return (
    <div className={styles.chatPage}>
      {/* 左侧会话列表 */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Button type="primary" icon={<PlusOutlined />} block onClick={handleNewChat} disabled={streaming}>
            新对话
          </Button>
        </div>
        <div className={styles.sessionList}>
          {sessions.length === 0 ? (
            <Empty description="暂无对话" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            sessions.map((session) => (
              <div
                key={session.sessionId}
                className={`${styles.sessionItem} ${session.sessionId === activeSessionId ? styles.active : ''}`}
                onClick={() => handleSelectSession(session.sessionId)}
              >
                <div className={styles.sessionInfo}>
                  <div className={styles.sessionTitle}>{session.title}</div>
                  <div className={styles.sessionMeta}>{session.model}</div>
                </div>
                <Popconfirm
                  title="确定删除此对话？"
                  onConfirm={(e) => { e?.stopPropagation(); deleteSession(session.sessionId) }}
                  onCancel={(e) => e?.stopPropagation()}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    className={styles.deleteBtn}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧对话区 */}
      <div className={styles.chatMain}>
        <div className={styles.chatHeader}>
          <Select
            className={styles.modelSelect}
            value={currentModel || undefined}
            onChange={setCurrentModel}
            placeholder="选择模型"
            disabled={streaming}
            options={models.map((m) => ({
              value: m.id,
              label: m.name + (m.description ? ` - ${m.description}` : '')
            }))}
          />
          {activeSession && !activeSession.sessionId.startsWith('temp_') && (
            <span style={{ color: '#999', fontSize: 12 }}>
              Session: {activeSession.sessionId.slice(0, 12)}...
            </span>
          )}
        </div>

        {/* 消息列表 */}
        <div className={styles.messageArea}>
          <Spin spinning={loadingHistory}>
            {!activeSessionId ? (
              <div className={styles.emptyState}>选择对话或创建新对话开始聊天</div>
            ) : activeMessages.length === 0 && !streaming ? (
              <div className={styles.emptyState}>发送消息开始对话</div>
            ) : (
              <>
                {activeMessages.map((msg) => (
                  <div key={msg.id} className={`${styles.messageItem} ${styles[msg.role]}`}>
                    <Avatar
                      className={styles.avatar}
                      icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                      style={{ backgroundColor: msg.role === 'user' ? '#1677ff' : '#52c41a' }}
                      src={msg.role === 'user' ? user?.avatar : undefined}
                    />
                    <div className={styles.bubble}>
                      <ReactMarkdown components={codeRenderer}>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}

                {/* 流式输出中 */}
                {streaming && streamContent && (
                  <div className={`${styles.messageItem} ${styles.assistant}`}>
                    <Avatar
                      className={styles.avatar}
                      icon={<RobotOutlined />}
                      style={{ backgroundColor: '#52c41a' }}
                    />
                    <div className={`${styles.bubble} ${styles.streaming}`}>
                      <ReactMarkdown components={codeRenderer}>{streamContent}</ReactMarkdown>
                    </div>
                  </div>
                )}
                <div ref={messageEndRef} />
              </>
            )}
          </Spin>
        </div>

        {/* 输入区 */}
        <div className={styles.inputArea}>
          <TextArea
            className={styles.inputBox}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，Enter 发送，Shift+Enter 换行"
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={!activeSessionId && !inputValue}
          />
          {streaming ? (
            <Button icon={<StopOutlined />} onClick={handleStop} danger>停止</Button>
          ) : (
            <Button type="primary" icon={<SendOutlined />} onClick={handleSend} disabled={!inputValue.trim()}>
              发送
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
