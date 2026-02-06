import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Input, Avatar, Dropdown, Button } from 'antd'
import { 
  HomeOutlined, 
  FolderOutlined, 
  TagsOutlined, 
  ClockCircleOutlined,
  UserOutlined,
  SearchOutlined,
  LoginOutlined,
  LogoutOutlined,
  EditOutlined
} from '@ant-design/icons'
import { useUserStore } from '@/store/userStore'
import styles from './MainLayout.module.scss'

const { Header, Content, Footer } = Layout

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: '首页' },
  { key: '/category', icon: <FolderOutlined />, label: '分类' },
  { key: '/tags', icon: <TagsOutlined />, label: '标签' },
  { key: '/archive', icon: <ClockCircleOutlined />, label: '归档' },
  { key: '/about', icon: <UserOutlined />, label: '关于' }
]

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useUserStore()
  const [searchValue, setSearchValue] = useState('')

  const handleSearch = () => {
    if (searchValue.trim()) {
      navigate(`/?keyword=${encodeURIComponent(searchValue.trim())}`)
    }
  }

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
    { key: 'manage', icon: <EditOutlined />, label: '文章管理' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true }
  ]

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'profile') {
      navigate('/profile')
    } else if (key === 'manage') {
      navigate('/manage/articles')
    } else if (key === 'logout') {
      logout()
      navigate('/')
    }
  }

  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo} onClick={() => navigate('/')}>
            <span className={styles.logoText}>My Blog</span>
          </div>
          
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            className={styles.menu}
          />

          <div className={styles.rightSection}>
            <Input.Search
              placeholder="搜索文章"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onSearch={handleSearch}
              className={styles.search}
              allowClear
            />

            {user ? (
              <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
                <Avatar 
                  src={user.avatar} 
                  icon={<UserOutlined />} 
                  className={styles.avatar}
                />
              </Dropdown>
            ) : (
              <Button type="primary" icon={<LoginOutlined />} onClick={() => navigate('/login')}>
                登录
              </Button>
            )}
          </div>
        </div>
      </Header>

      <Content className={styles.content}>
        <div className={styles.contentInner}>
          <Outlet />
        </div>
      </Content>

      <Footer className={styles.footer}>
        <p>© 2026 My Blog. All rights reserved.</p>
      </Footer>
    </Layout>
  )
}
