import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Avatar, Tabs, Form, Input, Button, message, List, Empty } from 'antd'
import {  EditOutlined, LockOutlined, HeartOutlined, StarOutlined } from '@ant-design/icons'
import { useUserStore } from '@/store/userStore'
import { updateUserInfo, updatePassword } from '@/api/user'
import styles from './Profile.module.scss'

export default function Profile() {
  const navigate = useNavigate()
  const { user, setUser, logout } = useUserStore()
  const [activeTab, setActiveTab] = useState('info')
  const [loading, setLoading] = useState(false)

  if (!user) {
    navigate('/login')
    return null
  }

  const handleUpdateInfo = async (values: { nickname: string; email: string }) => {
    setLoading(true)
    try {
      const res = await updateUserInfo(values)
      setUser(res.data)
      message.success('更新成功')
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (values: { oldPassword: string; newPassword: string }) => {
    setLoading(true)
    try {
      await updatePassword(values)
      message.success('密码修改成功，请重新登录')
      logout()
      navigate('/login')
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    message.success('已退出登录')
    navigate('/')
  }

  const tabItems = [
    {
      key: 'info',
      label: '个人信息',
      icon: <EditOutlined />,
      children: (
        <Form
          layout="vertical"
          initialValues={{ nickname: user.nickname, email: user.email }}
          onFinish={handleUpdateInfo}
        >
          <Form.Item label="头像">
            <Avatar src={user.avatar || undefined} size={80} style={!user.avatar ? { backgroundColor: '#1677ff', fontSize: 32 } : undefined}>
              {!user.avatar && (user.nickname || user.username)?.charAt(0)?.toUpperCase()}
            </Avatar>
          </Form.Item>
          <Form.Item label="用户名">
            <Input value={user.username} disabled />
          </Form.Item>
          <Form.Item name="nickname" label="昵称" rules={[{ required: true }]}>
            <Input placeholder="请输入昵称" />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>保存修改</Button>
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'password',
      label: '修改密码',
      icon: <LockOutlined />,
      children: (
        <Form layout="vertical" onFinish={handleUpdatePassword}>
          <Form.Item name="oldPassword" label="原密码" rules={[{ required: true }]}>
            <Input.Password placeholder="请输入原密码" />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true, min: 6 }]}>
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['newPassword']}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                }
              })
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>修改密码</Button>
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'collections',
      label: '我的收藏',
      icon: <StarOutlined />,
      children: (
        <List
          dataSource={[]}
          renderItem={(item: { id: number; title: string; createdAt: string }) => (
            <List.Item
              actions={[<a onClick={() => navigate(`/article/${item.id}`)}>查看</a>]}
            >
              <List.Item.Meta title={item.title} description={item.createdAt} />
            </List.Item>
          )}
          locale={{ emptyText: <Empty description="暂无收藏" /> }}
        />
      )
    },
    {
      key: 'likes',
      label: '我的点赞',
      icon: <HeartOutlined />,
      children: (
        <List
          dataSource={[]}
          renderItem={(item: { id: number; title: string; createdAt: string }) => (
            <List.Item
              actions={[<a onClick={() => navigate(`/article/${item.id}`)}>查看</a>]}
            >
              <List.Item.Meta title={item.title} description={item.createdAt} />
            </List.Item>
          )}
          locale={{ emptyText: <Empty description="暂无点赞" /> }}
        />
      )
    }
  ]

  return (
    <div className={styles.profile}>
      <Card className={styles.userCard}>
        <div className={styles.userInfo}>
          <Avatar src={user.avatar || undefined} size={80} style={!user.avatar ? { backgroundColor: '#1677ff', fontSize: 32 } : undefined}>
            {!user.avatar && (user.nickname || user.username)?.charAt(0)?.toUpperCase()}
          </Avatar>
          <div className={styles.userMeta}>
            <h2>{user.nickname || user.username}</h2>
            <p>{user.email}</p>
          </div>
        </div>
        <Button danger onClick={handleLogout}>退出登录</Button>
      </Card>

      <Card className={styles.contentCard}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          tabPosition="left"
        />
      </Card>
    </div>
  )
}
