import { Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'
import ArticleDetail from './pages/ArticleDetail'
import Category from './pages/Category'
import Tags from './pages/Tags'
import Archive from './pages/Archive'
import About from './pages/About'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import ArticleManage from './pages/ArticleManage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="article/:id" element={<ArticleDetail />} />
        <Route path="category" element={<Category />} />
        <Route path="category/:name" element={<Category />} />
        <Route path="tags" element={<Tags />} />
        <Route path="tags/:name" element={<Tags />} />
        <Route path="archive" element={<Archive />} />
        <Route path="about" element={<About />} />
        <Route path="profile" element={<Profile />} />
        <Route path="manage/articles" element={<ArticleManage />} />
      </Route>
    </Routes>
  )
}

export default App
