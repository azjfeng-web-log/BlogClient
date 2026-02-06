import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Tag, Button, Divider, Anchor, Spin, message } from 'antd'
import { 
  CalendarOutlined, 
  EyeOutlined, 
  LikeOutlined, 
  LikeFilled,
  StarOutlined,
  StarFilled,
  ShareAltOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons'
import { getArticleDetail, likeArticle, collectArticle, Article } from '@/api/article'
import { useUserStore } from '@/store/userStore'
import CommentSection from './CommentSection'
import styles from './ArticleDetail.module.scss'

export default function ArticleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useUserStore()
  const [loading, setLoading] = useState(true)
  const [article, setArticle] = useState<Article | null>(null)
  const [liked, setLiked] = useState(false)
  const [collected, setCollected] = useState(false)

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true)
      try {
        const res = await getArticleDetail(Number(id))
        setArticle(res.data)
      } catch {
        message.error('文章不存在')
        navigate('/')
      } finally {
        setLoading(false)
      }
    }
    fetchArticle()
  }, [id])

  const handleLike = async () => {
    if (!user) {
      message.warning('请先登录')
      return
    }
    try {
      const res = await likeArticle(Number(id))
      setLiked(res.data.liked)
      message.success(res.data.liked ? '点赞成功' : '已取消点赞')
    } catch {
      // error handled by interceptor
    }
  }

  const handleCollect = async () => {
    if (!user) {
      message.warning('请先登录')
      return
    }
    try {
      const res = await collectArticle(Number(id))
      setCollected(res.data.collected)
      message.success(res.data.collected ? '收藏成功' : '已取消收藏')
    } catch {
      // error handled by interceptor
    }
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    message.success('链接已复制')
  }

  if (!article && !loading) {
    return null
  }

  return (
    <Spin spinning={loading}>
      <div className={styles.articleDetail}>
        {article && (
          <>
            <div className={styles.main}>
              <Card className={styles.articleCard}>
                <Button 
                  type="text" 
                  icon={<ArrowLeftOutlined />} 
                  onClick={() => navigate(-1)}
                  className={styles.backBtn}
                >
                  返回
                </Button>

                <h1 className={styles.title}>{article.title}</h1>

                <div className={styles.meta}>
                  <span><CalendarOutlined /> {article.createdAt?.slice(0, 10)}</span>
                  <span><EyeOutlined /> {article.viewCount}</span>
                  <Tag color="blue">{article.category}</Tag>
                </div>

                <div className={styles.tags}>
                  {article.tags?.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>

                {article.cover && (
                  <img src={article.cover} alt={article.title} className={styles.cover} />
                )}

                <div 
                  className={styles.content}
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />

                <div className={styles.actions}>
                  <Button 
                    type={liked ? 'primary' : 'default'}
                    icon={liked ? <LikeFilled /> : <LikeOutlined />}
                    onClick={handleLike}
                  >
                    {article.likeCount + (liked ? 1 : 0)}
                  </Button>
                  <Button 
                    type={collected ? 'primary' : 'default'}
                    icon={collected ? <StarFilled /> : <StarOutlined />}
                    onClick={handleCollect}
                  >
                    收藏
                  </Button>
                  <Button icon={<ShareAltOutlined />} onClick={handleShare}>
                    分享
                  </Button>
                </div>

                <Divider />

                <CommentSection articleId={Number(id)} />
              </Card>
            </div>

            <div className={styles.sidebar}>
              <Card title="目录" className={styles.tocCard}>
                <Anchor items={[]} />
              </Card>
            </div>
          </>
        )}
      </div>
    </Spin>
  )
}
