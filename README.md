<div align="center">

# Xs-blog - 现代化个人主页系统

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-3.5.0-blue)](https://github.com/su16888/Xs-blog)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![MySQL Version](https://img.shields.io/badge/mysql-%3E%3D5.6-orange)](https://www.mysql.com/)
[![SQLite Version](https://img.shields.io/badge/sqlite-%3E%3D3.0-blue)](https://www.sqlite.org/)
[![PostgreSQL Version](https://img.shields.io/badge/postgresql-%3E%3D12-blue)](https://www.postgresql.org/)

[快速部署](docs/快速部署指南.md) | [功能特性](docs/功能特性.md) | [详细部署指南](docs/部署指南.md) | [常见问题](docs/常见问题解决方案.md)

</div>

---

## 📖 项目简介

**Xs-blog V3.5.0** 是一个现代化的全栈个人主页系统，采用前后端分离架构，提供完整的个人品牌展示、内容管理和社交链接功能。支持多种部署模式，从个人博客到企业官网，满足不同场景需求。

### 🌟 为什么选择 Xs-blog？

- **🚀 现代化技术栈**：基于 Next.js 16 + Express 5 构建的现代化全栈应用
- **🎨 多主题模式**：个人主页、博客模式、官网主题、朋友圈主题自由切换
- **📱 响应式设计**：完美适配PC、WAP、PAD三端
- **🛠️ 功能丰富**：笔记、图库、服务业务、留言、待办等 10+ 功能模块
- **💾 多数据库支持**：MySQL、SQLite、PostgreSQL 三数据库支持，灵活部署

---

## 🎯 核心特性

|    功能模块     |                     主要特性                      |     备注     |
| --------------- | ------------------------------------------------- | ----------- |
| **🚩 首页样式** | 可个人主页/博客模式任意切换                         | /           |
| **📝 笔记模块** | Markdown 编辑、分类标签、密码保护、网盘资源、摘要显示 | /           |
| **📋 便签模块**  | 便签分类、颜色标记、快速记录、关键词搜索              | 仅后台使用   |
| **🖼️ 图库模块** | 图册分类、密码保护、图片预览、批量上传                | /           |
| **🛍️ 服务模块** | 服务展示、分类管理、规格配置、下单按钮、推荐标记       | 不含支付接口 |
| **🧭 导航模块** | 网站导航、分类展示、推荐功能                         | /           |
| **📱 社交动态**  | 动态发布、图片/视频展示、支持iframe嵌入、抖音视频分享  | 可独立展示   |
| **💬 留言模块** | 分类管理、验证码、邮件通知、IP频率限制                | /           |
| **✅ 待办事项** | 进度管理、工时统计、智能提醒、时间记录、项目管控       | 仅后台使用   |
| **🏢 官网主题** | 企业官网模板、中英文双语、团队成员、合作伙伴展示       | 可独立展示   |
| **📚 文档中心**  | Markdown 文档展示、自动生成目录、全文搜索            | 可独立展示   |
| **☁️S3云存储**  | 可兼容S3协议存储方式（支持市面上主流的对象储存）       | /           |
| **📊 数据统计** | 仪表盘访问趋势、模块统计、IP排行、实时监控            | /           |

---

## 🏗️ 技术架构

### 前端技术栈
- **框架**: Next.js 16.0.7 (React 19.2.1)
- **UI 组件**: Tailwind CSS 3.4.18 + Framer Motion 12.23.24
- **状态管理**: React Context + 本地存储
- **Markdown**: react-markdown + remark-gfm + rehype-katex + rehype-mermaid
- **数学公式**: KaTeX 0.16.27
- **图像处理**: Sharp 0.34.5 + react-easy-crop
- **HTTP 客户端**: Axios 1.13.2
- **类型检查**: TypeScript 5.9.3

### 后端技术栈
- **框架**: Express 5.2.1 (Node.js)
- **数据库**: MySQL 5.6+ / SQLite 3 / PostgreSQL 12+
- **ORM**: Sequelize 6.37.7
- **身份验证**: JWT + bcryptjs
- **安全防护**: Helmet + CORS + Express-rate-limit
- **文件上传**: Multer + Sharp (图像处理)
- **邮件服务**: Nodemailer 7.0.11
- **验证码**: SVG-captcha
- **云存储**: AWS S3 SDK + S3兼容存储服务
- **缓存**: Node-cache (内存缓存)

### 数据库设计
- **33张核心数据表**，支持完整业务逻辑
- **外键约束**保证数据完整性
- **组合索引**优化查询性能
- **支持数据迁移**和版本控制

---

## 🚀 快速部署

### 环境要求

**基础环境**
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **PM2** >= 5.0.0 

**数据库 (三选一)**
- **MySQL** >= 5.6 (推荐)
- **SQLite** >= 3.0 (轻量使用)
- **PostgreSQL** >= 12 (高强度)

### 第 1 步：获取源码

```bash
# 克隆仓库
git clone https://github.com/su16888/Xs-blog.git
cd Xs-blog/

# 或下载解压后进入目录
cd Xs-blog
```

### 第 2 步：初始化数据库

#### MySQL 方式 (推荐)

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE xsblog888 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 导入数据库结构
mysql -u root -p xsblog888 < ../database/install.sql
```

#### SQLite 方式 (轻量)

```bash
# 复制 SQLite 数据库文件
cp ../database/install-sqlite.sql ./database/

# 初始化数据库
sqlite3 database/xsblog.db < database/install-sqlite.sql
```

#### PostgreSQL 方式 (最佳)

```bash
# 连接到 PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE xsblog WITH ENCODING 'UTF8';

# 创建用户并授权
CREATE USER xsblog_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE xsblog TO xsblog_user;

# 退出
\q

# 导入数据库结构
psql -U xsblog_user -d xsblog -f ../database/install-pgsql.sql
```

### 第 3 步：配置后端

```bash
cd backend

# 安装依赖
npm install --production
```

**配置环境变量** (`backend/.env`)：

```bash
# 数据库配置 (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=xsblog888
DB_USER=root
DB_PASSWORD=你的MySQL密码

# 数据库配置 (SQLite，三选一)
DB_TYPE=sqlite
DB_PATH=./database/xsblog.db

# 数据库配置 (PostgreSQL，三选一)
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=xsblog
DB_USER=xsblog_user
DB_PASSWORD=your_PostgreSQL_password

# 应用配置
PORT=3001
NODE_ENV=production

# JWT 密钥 (必须修改，至少32位)
JWT_SECRET=请运行命令生成随机密钥

# CORS 配置 (前后端同服务器留空)
CORS_ORIGIN=

# 文件上传路径
UPLOAD_PATH=./uploads

# 邮件配置 (可选)
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=你的邮箱
SMTP_PASS=邮箱密码

# 授权配置（必填）
AUTH_CODE=向作者免费索要授权码

```

**生成随机密钥**：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 第 4 步：配置前端

```bash
cd frontend

# 安装依赖
npm install --production
```

**配置环境变量** (`frontend/.env.production`)：

```bash
# 端口配置
PORT=3000
```

**API 地址配置（重要）**
修改文件：`frontend/public/config.js`

根据您的部署方式选择配置：

**【方式一】Nginx 反向代理模式**
```javascript
API_URL: '/api',
```

适用场景：前端和后端通过 Nginx 统一入口访问（隐藏端口）

Nginx 配置示例：
```nginx
server {
  listen 80;
  server_name yourdomain.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
  }

  location /api {
    proxy_pass http://127.0.0.1:3001;
  }
}
```

**【方式二】前后端分离模式（跨域/跨服务器）**
```javascript
API_URL: 'http://192.168.1.100:3001/api',
// 或
API_URL: 'https://api.yourdomain.com/api',
```

适用场景：前端和后端部署在不同服务器或不同域名
注意：需要在后端 .env 文件中配置 CORS_ORIGIN 允许前端域名

**【方式三】同服务器直连模式**
```javascript
API_URL: 'http://localhost:3001/api',
// 或
API_URL: 'http://你的服务器IP:3001/api',
```

适用场景：前后端部署在同一服务器，通过不同端口访问

**【方式四】自动检测模式（推荐新手使用）**
```javascript
API_URL: '',
BACKEND_PORT: '3001',
```

适用场景：前后端部署在同一服务器，端口不同
工作原理：自动使用当前访问的域名/IP + 后端端口

例如：
- 访问 http://123.4.5.6:3000 → 自动调用 http://123.4.5.6:3001/api
- 访问 http://example.com:3000 → 自动调用 http://example.com:3001/api

> ⚠️ **注意**：修改 config.js 后不需要重新构建，刷新浏览器即可生效！

**ico图标替换** `frontend/public/favicon.ico`

### 第 5 步：启动服务


```bash
# 安装 PM2
npm install -g pm2

# 启动后端
cd backend
pm2 start ecosystem.config.js

# 启动前端
cd frontend
pm2 start ecosystem.config.js

# 保存配置 (开机自启)
pm2 save
pm2 startup
```

### 第 6 步：访问系统

- **前台首页**: http://你的服务器IP:3000
- **管理后台**: http://你的服务器IP:3000/admins/login

**默认管理员账号**：
- 用户名: `admin`
- 密码: `admin123`

> ⚠️ **安全提示**：首次登录后请立即修改默认密码！

---

## 📚 部署文档


### 🥔 宝塔面板部署

1. 安装 Node.js 18+ 和 MySQL 5.6+
2. 创建网站并设置反向代理
3. 上传源码到网站目录
4. 按照快速部署步骤操作

### 🚀 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # 前端代理
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🔧 配置说明

### 后端环境变量

|     变量名     |           说明            |        默认值         |   是否必填    |
| ------------- | ------------------------ | -------------------- | ------------ |
| `DB_TYPE`     | 数据库类型 (mysql/sqlite/postgres) | mysql                | 是           |
| `DB_HOST`     | 数据库主机                | localhost            | MySQL/PostgreSQL        |
| `DB_PORT`     | 数据库端口                | 3306                 | MySQL/PostgreSQL        |
| `DB_NAME`     | 数据库名                  | xsblog888            | MySQL/PostgreSQL        |
| `DB_USER`     | 数据库用户                | root                 | MySQL/PostgreSQL        |
| `DB_PASSWORD` | 数据库密码                | -                    | MySQL/PostgreSQL (必填) |
| `DB_PATH`     | SQLite 数据库路径         | ./database/xsblog.db | SQLite       |
| `JWT_SECRET`  | JWT 加密密钥              | -                    | 必填 (≥32位) |
| `PORT`        | 后端端口                  | 3001                 | 否           |
| `CORS_ORIGIN` | 前端地址                  | 空 (自动检测)          | 否           |
| `AUTH_CODE `  | 授权码                    | 联系作者获取           | 是           |
| `UPLOAD_PATH` | 文件上传路径               | ./uploads            | 是           |


### 前端环境变量

| 变量名 | 说明 | 默认值 | 是否必填 |
| --- | --- | --- | --- |
| `PORT` | 前端端口 | 3000 | 否 |
| `NEXT_PUBLIC_API_URL` | API 完整地址 | 空 (自动检测) | 否 |
| `NEXT_PUBLIC_BACKEND_PORT` | 后端端口 | 3001 | 否 |

---



## ⚡ 性能优化

- **前端优化**
  - Next.js 16 智能代码分割
  - 图片懒加载和 WebP 格式支持
  - React 19 并发特性优化
  - Service Worker 离线缓存

- **后端优化**
  - 数据库连接池
  - API 响应压缩
  - 图片处理和缓存

- **数据库优化**
  - 33个组合索引
  - 查询性能提升 80%+
  - 分页查询优化

---

## 🔒 安全特性

- **前端安全**
  - CSP 内容安全策略
  - XSS 攻击防护
  - 敏感信息加密存储

- **后端安全**
  - JWT 身份验证
  - bcrypt 密码加密
  - SQL 注入防护
  - CORS 跨域控制
  - 请求频率限制
  - 安全头设置 (Helmet)

- **数据安全**
  - 数据库备份功能
  - 完整性校验


---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 开发规范

- 代码风格：使用 ESLint + Prettier
- 提交信息：遵循 [Conventional Commits](https://www.conventionalcommits.org/)
- 分支命名：`feature/功能名`、`bugfix/问题描述`、`hotfix/紧急修复`

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 开源协议发布。

---

## 🙏 致谢

感谢以下开源项目和社区：

- [Next.js](https://nextjs.org/) - React 全栈框架
- [Express](https://expressjs.com/) - Node.js Web 框架
- [Tailwind CSS](https://tailwindcss.com/) - 原子化 CSS 框架
- [Sequelize](https://sequelize.org/) - Node.js ORM
- [React](https://reactjs.org/) - 用户界面库

---

## 📞 技术支持

- **问题反馈**: [GitHub Issues](https://github.com/su16888/Xs-blog/issues)
- **功能建议**: [GitHub Discussions](https://github.com/su16888/Xs-blog/discussions)

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=su16888/Xs-blog&type=Date)](https://star-history.com/#su16888/Xs-blog&Date)

---

<div align="center">

**🎉 感谢使用 Xs-blog！如果觉得有用，请给我们一个 Star！**

Made with 💗 by [Arran](https://github.com/su16888)

</div>