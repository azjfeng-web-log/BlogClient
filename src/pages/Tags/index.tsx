import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Tag, Empty, Spin } from 'antd'
import { getTagList, getArticleList, Article } from '@/api/article'
import styles from './Tags.module.scss'

interface TagItem {
  id: number
  name: string
}

const colors = ['blue', 'green', 'orange', 'purple', 'cyan', 'magenta', 'red', 'volcano', 'gold', 'lime']

export default function Tags() {
  const { name } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [tags, setTags] = useState<TagItem[]>([])
  const [articles, setArticles] = useState<Article[]>([])

  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true)
      try {
        const res = await getTagList()
        setTags(res.data || [])
      } catch {
        setTags([])
      } finally {
        setLoading(false)
      }
    }
    if (!name) {
      fetchTags()
    }
  }, [name])

  useEffect(() => {
    const fetchArticles = async () => {
      if (!name) return
      setLoading(true)
      try {
        const res = await getArticleList({ tag: name, pageSize: 100 })
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
      <div className={styles.tags}>
        <Spin spinning={loading}>
          <Card title={`标签：${name}`} className={styles.listCard}>
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
              <Empty description="该标签暂无文章" />
            )}
          </Card>
        </Spin>
      </div>
    )
  }

  return (
    <div className={styles.tags}>
      <Spin spinning={loading}>
        <Card title="标签云" className={styles.card}>
          <div className={styles.tagCloud}>
            {tags.map((tag, index) => (
              <Tag
                key={tag.id}
                color={colors[index % colors.length]}
                className={styles.tag}
                onClick={() => navigate(`/tags/${tag.name}`)}
              >
                {tag.name}
              </Tag>
            ))}
          </div>
        </Card>
      </Spin>
    </div>
  )
}
