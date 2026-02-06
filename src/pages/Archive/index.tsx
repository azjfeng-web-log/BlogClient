import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Timeline, Spin, Empty } from 'antd'
import { CalendarOutlined } from '@ant-design/icons'
import { getArchiveList } from '@/api/article'
import styles from './Archive.module.scss'

interface ArticleResponse {
  id: number
  title: string
  createdAt: string
}

export default function Archive() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [archives, setArchives] = useState<Record<string, ArticleResponse[]>>({})

  useEffect(() => {
    const fetchArchives = async () => {
      setLoading(true)
      try {
        const res = await getArchiveList()
        setArchives(res.data || {})
      } catch {
        setArchives({})
      } finally {
        setLoading(false)
      }
    }
    fetchArchives()
  }, [])

  const sortedKeys = Object.keys(archives).sort((a, b) => b.localeCompare(a))

  const timelineItems = sortedKeys.flatMap((yearMonth) => {
    const [year, month] = yearMonth.split('-')
    const articles = archives[yearMonth]
    return [
      {
        dot: <CalendarOutlined style={{ fontSize: 16 }} />,
        color: 'blue',
        children: (
          <div className={styles.monthHeader}>
            {year}年{month}月
            <span className={styles.count}>({articles.length}篇)</span>
          </div>
        )
      },
      ...articles.map((article) => ({
        children: (
          <div
            className={styles.articleItem}
            onClick={() => navigate(`/article/${article.id}`)}
          >
            <span className={styles.day}>{article.createdAt?.slice(8, 10)}日</span>
            <span className={styles.title}>{article.title}</span>
          </div>
        )
      }))
    ]
  })

  return (
    <div className={styles.archive}>
      <Spin spinning={loading}>
        <Card title="文章归档" className={styles.card}>
          {timelineItems.length > 0 ? (
            <Timeline items={timelineItems} />
          ) : (
            <Empty description="暂无文章" />
          )}
        </Card>
      </Spin>
    </div>
  )
}
