import request from '@/utils/request'

export interface Comment {
  id: number
  articleId: number
  userId: number
  username: string
  avatar: string
  content: string
  parentId: number | null
  replyTo: string | null
  createdAt: string
  children?: Comment[]
}

// 获取评论列表
export const getCommentList = (articleId: number) => {
  return request.get(`/comment/list`, { params: { articleId } })
}

// 添加评论
export const addComment = (data: { articleId: number; content: string; parentId?: number }) => {
  return request.post('/comment/add', data)
}

// 删除评论
export const deleteComment = (id: number) => {
  return request.delete(`/comment/${id}`)
}
