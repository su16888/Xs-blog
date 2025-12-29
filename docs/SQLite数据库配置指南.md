# Xs-Blog SQLite 数据库配置指南

---



## 🎯 数据库类型对比

| 特性 | MySQL | SQLite |
|------|-------|--------|
| **安装难度** | 需要安装 MySQL 服务 | 无需安装，自动创建 |
| **配置复杂度** | 需要配置用户、密码、权限 | 仅需指定文件路径 |
| **适用场景** | 生产环境、高并发 | 开发环境、小型应用 |
| **性能** | 高并发性能好 | 适合低并发场景 |
| **备份** | 需要导出SQL | 直接复制文件 |
| **资源占用** | 独立进程，占用内存多 | 嵌入式，占用资源少 |
| **推荐使用** | 生产环境 | 开发/测试/小型部署 |

---

## 🚀 快速开始

### 方式一：新项目使用 SQLite

#### 步骤 1：准备环境

确保您的系统已安装：
- Node.js >= 18.0.0
- npm >= 9.0.0

#### 步骤 2：配置环境变量

编辑 `backend/.env` 文件：

```bash
# 数据库配置
DB_TYPE=sqlite                             # 使用 SQLite 数据库
DB_PATH=./database/xsblog.db               # 数据库文件路径

```


#### 步骤 3：初始化数据库

使用官方 schema 脚本初始化：

```bash
# 创建数据库目录
cd backend
mkdir -p database

# 初始化数据库（包含所有表、索引、初始数据）
sqlite3 database/xsblog.db < ../database/install-sqlite.sql

# 验证
sqlite3 database/xsblog.db ".tables"
```

**包含的内容**：
- ✅ 所有表结构
- ✅ 性能优化索引
- ✅ 默认管理员账号（admin/admin123）
- ✅ 默认分类数据
- ✅ 默认设置

#### 步骤 4：访问系统

- **前台展示**: http://localhost:3000
- **后台管理**: http://localhost:3000/admins
- **默认账号**: `admin` / `admin123`

---

### 方式二：从 MySQL 迁移到 SQLite

#### 步骤 1：备份 MySQL 数据

```bash
# 导出数据
mysqldump -u root -p xsblog888 > backup.sql
```

#### 步骤 2：修改配置

编辑 `backend/.env` 文件：

```bash
# 将数据库类型改为 sqlite
DB_TYPE=sqlite

# 指定数据库文件路径
DB_PATH=./database/xsblog.db

# 注释掉 MySQL 相关配置
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=xsblog888
# DB_USER=root
# DB_PASSWORD=your_password
```

#### 步骤 3：数据迁移

**注意**：SQLite 和 MySQL 的 SQL 语法有差异，建议使用以下方式之一：

**方式 A：手动迁移（推荐小数据量）**

1. 使用 SQLite 启动系统，会自动创建表结构
2. 从 MySQL 导出数据为 CSV 或 JSON
3. 编写脚本导入到 SQLite

**方式 B：使用工具迁移**

- 使用 [pgloader](https://pgloader.io/) 等数据库迁移工具
- 使用 [sqlalchemy](https://www.sqlalchemy.org/) 编写迁移脚本

---

## 📖 详细配置说明

### 环境变量配置

#### backend/.env

```bash
# ========================================
# SQLite 数据库配置
# ========================================

# 数据库类型（必须设置为 sqlite）
DB_TYPE=sqlite

# 数据库文件路径（可选）
# 相对路径：相对于 backend 目录
# 绝对路径：完整的文件系统路径
DB_PATH=./database/xsblog.db

# 以下配置在使用 SQLite 时不需要
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=xsblog888
# DB_USER=root
# DB_PASSWORD=your_password
```

### 数据库文件路径说明

| 路径类型 | 示例 | 说明 |
|---------|------|------|
| **相对路径** | `./database/xsblog.db` | 相对于 backend 目录 |
| **相对路径** | `../data/blog.db` | 上级目录的 data 文件夹 |
| **绝对路径** | `/var/data/xsblog.db` | Linux 系统绝对路径 |
| **绝对路径** | `D:\data\xsblog.db` | Windows 系统绝对路径 |
| **内存数据库** | `:memory:` | 数据存储在内存中（重启后丢失） |

**推荐配置**：
```bash
# 使用绝对路径
DB_PATH=/var/www/xsblog/database/xsblog.db
```

---

## 🔧 常见问题

### 1. 安装 sqlite3 失败？

**错误信息**：
```
gyp ERR! find VS could not find Visual Studio
```

**解决方案**：

**方案 A：安装构建工具（Windows）**
```bash
# 使用管理员权限运行
npm install --global windows-build-tools
```

**方案 B：使用预编译版本**
```bash
npm install sqlite3 --build-from-source=false
```

**方案 C：使用 MySQL 替代**

如果安装困难，建议使用 MySQL 数据库。

---

### 2. 数据库文件在哪里？

**默认位置**：`backend/database/xsblog.db`

**查看方法**：
```bash
# 查看文件是否存在
ls backend/database/

# 查看文件大小
ls -lh backend/database/xsblog.db
```

---

### 3. 如何备份 SQLite 数据库？

**方法 1：直接复制文件（最简单）**
```bash
# 备份
cp backend/database/xsblog.db backend/database/xsblog.db.backup

# 恢复
cp backend/database/xsblog.db.backup backend/database/xsblog.db
```

**方法 2：使用 SQLite 命令行工具**
```bash
# 备份
sqlite3 backend/database/xsblog.db ".backup backup.db"

# 导出为 SQL
sqlite3 backend/database/xsblog.db .dump > backup.sql

# 从 SQL 恢复
sqlite3 backend/database/xsblog.db < backup.sql
```

---

### 4. SQLite 性能够用吗？

**性能特点**：
- ✅ **读取性能**：对于小型网站，性能完全够用
- ✅ **写入性能**：适合低并发写入场景
- ⚠️ **并发限制**：不适合高并发写入场景
- ⚠️ **数据量**：建议数据库文件 < 1GB

**推荐场景**：
- ✅ 个人博客、作品展示站
- ✅ 内部工具、管理系统
- ✅ 开发和测试环境
- ❌ 高并发商业网站
- ❌ 大数据量应用

---

### 5. 如何查看 SQLite 数据库内容？

**方法 1：使用 SQLite 命令行**
```bash
# 打开数据库
sqlite3 backend/database/xsblog.db

# 查看所有表
.tables

# 查看表结构
.schema users

# 查询数据
SELECT * FROM users;

# 退出
.quit
```

**方法 2：使用图形化工具**
- [DB Browser for SQLite](https://sqlitebrowser.org/) - 免费开源
- [SQLiteStudio](https://sqlitestudio.pl/) - 功能强大
- [Navicat](https://www.navicat.com/) - 商业软件
- [DBeaver](https://dbeaver.io/) - 免费开源

---

### 6. 从 SQLite 切换回 MySQL？

编辑 `backend/.env` 文件：

```bash
# 改回 MySQL
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=xsblog888
DB_USER=root
DB_PASSWORD=your_password

# 注释掉 SQLite 配置
# DB_PATH=./database/xsblog.db
```

重启后端服务即可。

---


## 📊 性能优化建议

### 1. 定期清理和优化

```bash
# 进入 SQLite 命令行
sqlite3 backend/database/xsblog.db

# 分析查询计划
EXPLAIN QUERY PLAN SELECT * FROM users;

# 优化数据库
VACUUM;

# 重建索引
REINDEX;

# 分析统计信息
ANALYZE;
```

### 2. 合理使用索引

SQLite 会自动为主键创建索引，对于频繁查询的字段，可以手动添加索引：

```sql
-- 为用户名添加索引
CREATE INDEX idx_users_username ON users(username);

-- 为文章创建时间添加索引
CREATE INDEX idx_posts_created_at ON posts(created_at);
```

### 3. 定期备份

建议每天备份一次数据库文件：

```bash
# 创建备份脚本 backup-sqlite.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp backend/database/xsblog.db "backups/xsblog_$DATE.db"

# 保留最近 7 天的备份
find backups/ -name "xsblog_*.db" -mtime +7 -delete
```

---

## 🔒 安全建议

1. **设置文件权限**（Linux/Mac）
```bash
# 限制数据库文件访问权限
chmod 600 backend/database/xsblog.db
chmod 700 backend/database/
```

2. **定期备份**
```bash
# 定时备份（crontab）
0 2 * * * /path/to/backup-sqlite.sh
```

3. **不要将数据库文件提交到版本控制**
```bash
# .gitignore
backend/database/*.db
backend/database/*.db-*
```

4. **加密敏感数据**

SQLite 本身不支持加密，敏感数据应该在应用层加密。

---


## 🎯 总结

### SQLite 的优势

- ✅ **零配置**：无需安装数据库服务
- ✅ **便携性**：数据库就是一个文件
- ✅ **轻量级**：资源占用少
- ✅ **简单备份**：直接复制文件
- ✅ **开发友好**：快速搭建开发环境

### 何时使用 SQLite

|          场景           | 推荐数据库 |
| ---------------------- | ---------- |
| 快速部署体验 Xs-Blog     | SQLite ✅ |
| 个人博客（日访问 < 500） | SQLite ✅ |


### 从 SQLite 迁移到 MySQL

当您的网站流量增长，建议迁移到 MySQL：
1. 使用数据导出工具
2. 修改 `.env` 配置
3. 导入数据到 MySQL
4. 重启服务
