import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Row, Col, Card, Tag, Pagination, Empty, Spin } from 'antd'
import { EyeOutlined, LikeOutlined, MessageOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { getArticleList, Article } from '@/api/article'
import styles from './Home.module.scss'

export default function Home() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [articles, setArticles] = useState<Article[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 12

  const keyword = searchParams.get('keyword') || ''

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const res = await getArticleList({ page, pageSize, keyword })
      setArticles(res.data.list || [])
      setTotal(res.data.total || 0)
    } catch {
      setArticles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArticles()
  }, [page, keyword])

  const handlePageChange = (p: number) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={styles.home}>
      {keyword && (
        <div className={styles.searchTip}>
          搜索关键词：<span>{keyword}</span>
        </div>
      )}

      <Spin spinning={loading}>
        {articles.length > 0 ? (
          <div className={styles.articleList}>
            <Row gutter={[24, 24]}>
              {articles.map((article) => (
                <Col xs={24} sm={12} lg={8} key={article.id}>
                  <Card
                    hoverable
                    cover={article.cover && <img alt={article.title} src={article.cover} className={styles.cover} />}
                    className={styles.articleCard}
                    onClick={() => navigate(`/article/${article.id}`)}
                  >
                    <div className={styles.category}>
                      <Tag color="blue">{article.category}</Tag>
                    </div>
                    <h3 className={styles.title}>{article.title}</h3>
                    <p className={styles.summary}>{article.summary}</p>
                    <div className={styles.tags}>
                      {article.tags?.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </div>
                    <div className={styles.meta}>
                      <span><ClockCircleOutlined /> {article.createdAt?.slice(0, 10)}</span>
                      <span><EyeOutlined /> {article.viewCount}</span>
                      <span><LikeOutlined /> {article.likeCount}</span>
                      <span><MessageOutlined /> {article.commentCount}</span>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        ) : (
          <div className={styles.emptyWrapper}>
            <Empty description="暂无文章" />
          </div>
        )}
      </Spin>

      {articles.length > 0 && (
        <div className={styles.pagination}>
          <Pagination
            current={page}
            total={total}
            pageSize={pageSize}
            onChange={handlePageChange}
            showSizeChanger={false}
          />
        </div>
      )}
    </div>
  )
}
