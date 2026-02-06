import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Row, Col, Empty, Spin } from 'antd'
import { FolderOutlined } from '@ant-design/icons'
import { getCategoryList, getArticleList, Article } from '@/api/article'
import styles from './Category.module.scss'

interface Category {
  id: number
  name: string
}

export default function Category() {
  const { name } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [articles, setArticles] = useState<Article[]>([])

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true)
      try {
        const res = await getCategoryList()
        setCategories(res.data || [])
      } catch {
        setCategories([])
      } finally {
        setLoading(false)
      }
    }
    if (!name) {
      fetchCategories()
    }
  }, [name])

  useEffect(() => {
    const fetchArticles = async () => {
      if (!name) return
      setLoading(true)
      try {
        const res = await getArticleList({ category: name, pageSize: 100 })
        setArticles(res.data.list || [])
      } catch {
        setArticles([])
      } finally {
        setLoading(false)
      }
    }
    fetchArticles()
  }, [name])

  if (name) {
    return (
      <div className={styles.category}>
        <Spin spinning={loading}>
          <Card title={`分类：${name}`} className={styles.listCard}>
            {articles.length > 0 ? (
              articles.map((article) => (
                <div
                  key={article.id}
                  className={styles.articleItem}
                  onClick={() => navigate(`/article/${article.id}`)}
                >
                  <h3>{article.title}</h3>
                  <p>{article.summary}</p>
                  <span>{article.createdAt?.slice(0, 10)}</span>
                </div>
              ))
            ) : (
              <Empty description="该分类暂无文章" />
            )}
          </Card>
        </Spin>
      </div>
    )
  }

  const colors = ['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#eb2f96', '#13c2c2']

  return (
    <div className={styles.category}>
      <Spin spinning={loading}>
        <Card title="文章分类" className={styles.card}>
          <Row gutter={[24, 24]}>
            {categories.map((cat, index) => (
              <Col xs={12} sm={8} md={6} key={cat.id}>
                <div
                  className={styles.categoryItem}
                  onClick={() => navigate(`/category/${cat.name}`)}
                >
                  <FolderOutlined style={{ color: colors[index % colors.length], fontSize: 32 }} />
                  <h3>{cat.name}</h3>
                </div>
              </Col>
            ))}
          </Row>
        </Card>
      </Spin>
    </div>
  )
}
