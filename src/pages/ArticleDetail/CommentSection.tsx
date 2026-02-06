import { useState, useEffect } from 'react'
import { Avatar, Button, Input, message } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { useUserStore } from '@/store/userStore'
import { getCommentList, addComment, Comment } from '@/api/comment'
import styles from './CommentSection.module.scss'

interface CommentWithChildren extends Comment {
  children?: Comment[]
}

interface Props {
  articleId: number
}

export default function CommentSection({ articleId }: Props) {
  const { user } = useUserStore()
  const [comments, setComments] = useState<CommentWithChildren[]>([])
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: number; username: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchComments = async () => {
    try {
      const res = await getCommentList(articleId)
      setComments(res.data || [])
    } catch {
      setComments([])
    }
  }

  useEffect(() => {
    if (articleId) {
      fetchComments()
    }
  }, [articleId])

  const handleSubmit = async () => {
    if (!user) {
      message.warning('请先登录')
      return
    }
    if (!content.trim()) {
      message.warning('请输入评论内容')
      return
    }

    setSubmitting(true)
    try {
      await addComment({
        articleId,
        content: content.trim(),
        parentId: replyTo?.id
      })
      setContent('')
      setReplyTo(null)
      message.success('评论成功')
      fetchComments()
    } catch {
      // error handled by interceptor
    } finally {
      setSubmitting(false)
    }
  }

  const renderComment = (comment: Comment, isChild = false) => (
    <div className={`${styles.commentItem} ${isChild ? styles.childComment : ''}`} key={comment.id}>
      <Avatar src={comment.avatar} icon={<UserOutlined />} />
      <div className={styles.commentContent}>
        <div className={styles.commentHeader}>
          <span className={styles.username}>{comment.username}</span>
          {comment.replyTo && <span className={styles.replyTo}>回复 @{comment.replyTo}</span>}
          <span className={styles.time}>{comment.createdAt?.slice(0, 16)}</span>
        </div>
        <p className={styles.text}>{comment.content}</p>
        {!isChild && (
          <Button 
            type="link" 
            size="small" 
            onClick={() => setReplyTo({ id: comment.id, username: comment.username })}
          >
            回复
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div className={styles.commentSection}>
      <h3 className={styles.title}>评论 ({comments.length})</h3>

      <div className={styles.inputArea}>
        {replyTo && (
          <div className={styles.replyTip}>
            回复 @{replyTo.username}
            <Button type="link" size="small" onClick={() => setReplyTo(null)}>取消</Button>
          </div>
        )}
        <Input.TextArea
          rows={3}
          placeholder={user ? '写下你的评论...' : '请先登录后评论'}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={!user}
        />
        <Button 
          type="primary" 
          onClick={handleSubmit} 
          loading={submitting}
          disabled={!user}
          className={styles.submitBtn}
        >
          发表评论
        </Button>
      </div>

      <div className={styles.commentList}>
        {comments.map((comment) => (
          <div key={comment.id}>
            {renderComment(comment)}
            {comment.children?.map((child) => renderComment(child, true))}
          </div>
        ))}
      </div>
    </div>
  )
}
