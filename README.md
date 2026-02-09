# BlogClient

基于 React + TypeScript + Vite 构建的个人博客前端项目。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.3.1 | UI 框架 |
| TypeScript | 5.6.2 | 类型系统 |
| Vite | 5.4.10 | 构建工具 |
| Ant Design | 5.22.0 | UI 组件库 |
| Zustand | 5.0.1 | 状态管理 |
| React Router | 6.28.0 | 路由管理 |
| Axios | 1.7.7 | HTTP 请求 |
| WangEditor | 5.1.23 | 富文本编辑器 |
| highlight.js | 11.11.1 | 代码高亮 |
| Sass | 1.80.6 | CSS 预处理器 |

## 项目结构

```
src/
├── api/                    # API 接口层
│   ├── article.ts          # 文章 API
│   ├── comment.ts          # 评论 API
│   └── user.ts             # 用户 API
├── layouts/                # 布局组件
│   └── MainLayout.tsx
├── pages/                  # 页面组件
│   ├── Home/               # 首页
│   ├── ArticleDetail/      # 文章详情
│   ├── ArticleManage/      # 文章管理
│   ├── Category/           # 分类
│   ├── Tags/               # 标签
│   ├── Archive/            # 归档
│   ├── About/              # 关于
│   ├── Profile/            # 个人中心
│   ├── Login/              # 登录
│   └── Register/           # 注册
├── store/                  # 状态管理
│   └── userStore.ts
├── styles/                 # 全局样式
│   ├── global.scss
│   └── variables.scss
├── utils/                  # 工具函数
│   └── request.ts          # Axios 封装
├── App.tsx                 # 路由配置
└── main.tsx                # 应用入口
```

## 功能特性

- **用户系统**: 登录/注册、个人信息管理、密码修改
- **文章系统**: 列表展示、详情阅读、富文本编辑、CRUD 操作
- **交互功能**: 点赞、收藏、评论（支持嵌套回复）
- **内容展示**: 代码高亮、自动生成目录
- **分类标签**: 分类浏览、标签云、归档时间线
- **权限控制**: 作者/管理员可编辑删除文章

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器 (http://localhost:3000)
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 环境配置

开发环境下 API 请求代理至 `http://localhost:6000`，需确保后端服务已启动。

## 路由说明

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | Home | 首页文章列表 |
| `/article/:id` | ArticleDetail | 文章详情 |
| `/category` | Category | 分类列表 |
| `/tags` | Tags | 标签云 |
| `/archive` | Archive | 归档时间线 |
| `/about` | About | 关于页面 |
| `/profile` | Profile | 个人中心 |
| `/manage/articles` | ArticleManage | 文章管理 |
| `/login` | Login | 登录 |
| `/register` | Register | 注册 |
