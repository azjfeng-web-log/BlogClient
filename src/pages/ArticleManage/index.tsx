import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { Editor, Toolbar } from '@wangeditor/editor-for-react'
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import '@wangeditor/editor/dist/css/style.css'
import { getArticleList, createArticle, updateArticle, deleteArticle, getCategoryList, getTagList, Article } from '@/api/article'
import { useUserStore } from '@/store/userStore'
import styles from './ArticleManage.module.scss'

const { TextArea } = Input

const ArticleManage = () => {
  const { user } = useUserStore()
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [tags, setTags] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [form] = Form.useForm()

  // 富文本编辑器
  const [editor, setEditor] = useState<IDomEditor | null>(null)
  const [html, setHtml] = useState('')

  // 预览
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<{ title: string; content: string } | null>(null)

  const toolbarConfig: Partial<IToolbarConfig> = {}
  const editorConfig: Partial<IEditorConfig> = {
    placeholder: '请输入文章内容...',
  }

  // 组件卸载时销毁编辑器
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy()
      }
    }
  }, [])

  const fetchArticles = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const res = await getArticleList({ page, pageSize })
      setArticles(res.data.list)
      setPagination({ current: page, pageSize, total: res.data.total })
    } catch {
      message.error('获取文章列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchOptions = async () => {
    try {
      const [catRes, tagRes] = await Promise.all([getCategoryList(), getTagList()])
      setCategories(catRes.data)
      setTags(tagRes.data)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchArticles()
    fetchOptions()
  }, [])

  const handleAdd = () => {
    setEditingArticle(null)
    form.resetFields()
    setHtml('')
    setModalOpen(true)
  }

  const handleEdit = (record: Article) => {
    setEditingArticle(record)
    form.setFieldsValue({
      title: record.title,
      summary: record.summary,
      cover: record.cover,
      category: record.category,
      tags: record.tags,
    })
    setHtml(record.content || '')
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteArticle(id)
      message.success('删除成功')
      fetchArticles(pagination.current, pagination.pageSize)
    } catch {
      message.error('删除失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (!html || html === '<p><br></p>') {
        message.error('请输入文章内容')
        return
      }
      const submitData = { ...values, content: html }
      if (editingArticle) {
        await updateArticle(editingArticle.id, submitData)
        message.success('更新成功')
      } else {
        await createArticle(submitData)
        message.success('创建成功')
      }
      setModalOpen(false)
      fetchArticles(pagination.current, pagination.pageSize)
    } catch {
      // validation failed
    }
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setHtml('')
  }

  const handlePreview = () => {
    const title = form.getFieldValue('title') || '未命名文章'
    setPreviewData({ title, content: html })
    setPreviewOpen(true)
  }

  const handlePreviewFromList = (record: Article) => {
    setPreviewData({ title: record.title, content: record.content })
    setPreviewOpen(true)
  }

  const columns: ColumnsType<Article> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 100,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      width: 180,
      render: (tags: string[]) => (
        <Space size={[0, 4]} wrap>
          {tags?.map(tag => <Tag key={tag} color="blue">{tag}</Tag>)}
        </Space>
      ),
    },
    {
      title: '浏览',
      dataIndex: 'viewCount',
      width: 70,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 120,
      render: (text: string) => text?.slice(0, 10),
    },
    {
      title: '操作',
      width: 150,
      fixed: 'right',
      render: (_, record) => {
        const canModify = user?.role === 'admin' || user?.id === record.authorId
        return (
          <Space size={0}>
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handlePreviewFromList(record)} />
            {canModify && (
              <>
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
                  <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>文章管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新建文章
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={articles}
        loading={loading}
        scroll={{ x: 800 }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: total => `共 ${total} 条`,
          onChange: (page, pageSize) => fetchArticles(page, pageSize),
        }}
      />

      <Modal
        title={editingArticle ? '编辑文章' : '新建文章'}
        open={modalOpen}
        onCancel={handleModalClose}
        width={900}
        destroyOnClose={false}
        afterClose={() => {
          if (editor) {
            editor.destroy()
            setEditor(null)
          }
        }}
        footer={[
          <Button key="cancel" onClick={handleModalClose}>取消</Button>,
          <Button key="preview" icon={<EyeOutlined />} onClick={handlePreview}>预览</Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>提交</Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入文章标题" />
          </Form.Item>
          <Form.Item name="summary" label="摘要">
            <TextArea rows={2} placeholder="请输入文章摘要" />
          </Form.Item>
          <Form.Item name="cover" label="封面图">
            <Input placeholder="请输入封面图URL" />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select placeholder="请选择分类">
              {categories.map(cat => (
                <Select.Option key={cat.id} value={cat.name}>{cat.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select mode="multiple" placeholder="请选择标签">
              {tags.map(tag => (
                <Select.Option key={tag.id} value={tag.name}>{tag.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="内容" required>
            <div className={styles.editorWrapper}>
              {modalOpen && (
                <>
                  <Toolbar
                    editor={editor}
                    defaultConfig={toolbarConfig}
                    mode="default"
                    className={styles.toolbar}
                  />
                  <Editor
                    defaultConfig={editorConfig}
                    value={html}
                    onCreated={setEditor}
                    onChange={e => setHtml(e.getHtml())}
                    mode="default"
                    className={styles.editor}
                  />
                </>
              )}
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={previewData?.title || '文章预览'}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        width={900}
        footer={<Button onClick={() => setPreviewOpen(false)}>关闭</Button>}
      >
        <div 
          className={styles.previewContent}
          dangerouslySetInnerHTML={{ __html: previewData?.content || '' }}
        />
      </Modal>
    </div>
  )
}

export default ArticleManage
