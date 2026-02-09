import request from '@/utils/request'

export interface Article {
  id: number
  title: string
  summary: string
  content: string
  cover: string
  category: string
  tags: string[]
  authorId: number
  viewCount: number
  likeCount: number
  commentCount: number
  createdAt: string
  updatedAt: string
}

export interface ArticleListParams {
  page?: number
  pageSize?: number
  category?: string
  tag?: string
  keyword?: string
}

// 获取文章列表
export const getArticleList = (params: ArticleListParams) => {
  return request.get('/article/list', { params })
}

// 获取文章详情
export const getArticleDetail = (id: number) => {
  return request.get(`/article/${id}`)
}

// 获取推荐文章
export const getRecommendArticles = () => {
  return request.get('/article/recommend')
}

// 点赞文章
export const likeArticle = (id: number) => {
  return request.post(`/article/${id}/like`)
}

// 收藏文章
export const collectArticle = (id: number) => {
  return request.post(`/article/${id}/collect`)
}

// 获取文章交互状态
export const getArticleInteraction = (id: number) => {
  return request.get(`/article/${id}/interaction`)
}

// 获取分类列表
export const getCategoryList = () => {
  return request.get('/category/list')
}

// 获取标签列表
export const getTagList = () => {
  return request.get('/tag/list')
}

// 获取归档列表
export const getArchiveList = () => {
  return request.get('/article/archive')
}

// 创建文章
export const createArticle = (data: Partial<Article>) => {
  return request.post('/article', data)
}

// 更新文章
export const updateArticle = (id: number, data: Partial<Article>) => {
  return request.put(`/article/${id}`, data)
}

// 删除文章
export const deleteArticle = (id: number) => {
  return request.delete(`/article/${id}`)
}
