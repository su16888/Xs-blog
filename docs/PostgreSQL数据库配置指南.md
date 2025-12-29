# Xs-Blog PostgreSQL 数据库配置指南
---


## 📋 环境要求

### PostgreSQL 版本
- **PostgreSQL 12+** (推荐 14+)
- PostgreSQL 11 也可使用，但部分功能受限

### 系统要求
- **内存**：建议 2GB 以上
- **存储**：建议 10GB 以上可用空间
- **操作系统**：Linux/Windows/macOS

---

## 🛠️ 安装和配置

### Ubuntu/Debian 安装

```bash
# 安装 PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# 启动并设置开机自启
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 切换到 postgres 用户
sudo -i -u postgres
```

### CentOS/RHEL 安装

```bash
# 安装 PostgreSQL 仓库
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# 安装 PostgreSQL
sudo dnf install -y postgresql14-server postgresql14

# 初始化数据库
sudo /usr/pgsql-14/bin/postgresql-14-setup initdb

# 启动并设置开机自启
sudo systemctl start postgresql-14
sudo systemctl enable postgresql-14

# 切换到 postgres 用户
sudo -i -u postgres
```

### Windows 安装

1. 从 [PostgreSQL 官网](https://www.postgresql.org/download/windows/) 下载安装包
2. 运行安装程序，按照向导完成安装
3. 记住设置的超级用户密码（默认为 postgres）
4. 确保 PostgreSQL 服务已启动

---

## 🗄️ 数据库创建

### 创建数据库和用户

```sql
-- 连接到 PostgreSQL
psql -U postgres

-- 创建数据库（支持中文）
CREATE DATABASE xsblog WITH ENCODING 'UTF8'
    LC_COLLATE='zh_CN.UTF-8'
    LC_CTYPE='zh_CN.UTF-8';

-- 如果系统没有中文 locale，使用：
CREATE DATABASE xsblog WITH ENCODING 'UTF8';

-- 创建专用用户（推荐）
CREATE USER xsblog_user WITH PASSWORD 'your_strong_password';

-- 授权
GRANT ALL PRIVILEGES ON DATABASE xsblog TO xsblog_user;

-- 退出
\q
```

### 测试连接

```bash
# 使用新用户连接测试
psql -U xsblog_user -d xsblog -W
```

---

## ⚙️ 配置优化

### postgresql.conf 配置

```ini
# 连接配置
listen_addresses = '*'          # 生产环境建议绑定具体IP
port = 5432                     # 默认端口
max_connections = 200           # 最大连接数

# 内存配置（根据服务器内存调整）
shared_buffers = 256MB          # 系统内存的25%
effective_cache_size = 1GB      # 系统内存的75%
work_mem = 4MB                  # 单个查询可用内存
maintenance_work_mem = 64MB     # 维护操作内存

# 检查点配置
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# 日志配置
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'all'           # 生产环境建议改为 'mod' 或 'ddl'

# 时区设置
timezone = 'Asia/Shanghai'
```

### pg_hba.conf 配置（连接认证）

```conf
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# 本地连接
local   all             all                                     md5

# IPv4 本地连接
host    all             all             127.0.0.1/32            md5

# IPv6 本地连接
host    all             all             ::1/128                 md5

# 允许特定IP段连接（根据实际需要调整）
host    all             xsblog_user     10.0.0.0/8              md5
host    all             xsblog_user     192.168.0.0/16         md5

# 如果需要远程连接（生产环境谨慎使用）
# host    all             all             0.0.0.0/0               md5
```

---

## 🔧 Xs-Blog 配置

### 后端配置 (backend/.env)

```bash
# 数据库类型
DB_TYPE=postgres

# 连接配置
DB_HOST=localhost              # 数据库服务器地址
DB_PORT=5432                   # 数据库端口
DB_NAME=xsblog                 # 数据库名
DB_USER=xsblog_user            # 数据库用户
DB_PASSWORD=your_strong_password  # 数据库密码

# PostgreSQL 特有配置（可选）
# 如果需要 SSL 连接，请取消注释
# DB_SSL=true
# DB_SSL_MODE=require

# 应用配置保持不变
PORT=3001
NODE_ENV=production
JWT_SECRET=your_32_character_random_secret
AUTH_CODE=your_auth_code
UPLOAD_PATH=./uploads
CORS_ORIGIN=
```

### 数据库导入

```bash
# 导入数据库结构
psql -U xsblog_user -d xsblog -f database/install-pgsql.sql

# 验证导入
psql -U xsblog_user -d xsblog -c "\dt"
```

---

## 🛡️ 安全配置

### 基础安全措施

1. **修改默认 postgres 用户密码**
```sql
ALTER USER postgres PASSWORD 'very_strong_password';
```

2. **创建最小权限用户**
```sql
-- 只读用户（用于备份或报表）
CREATE USER readonly_user WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE xsblog TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
```

3. **限制网络访问**
```bash
# 修改 pg_hba.conf，只允许特定IP访问
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

### SSL/TLS 配置

```bash
# 生成自签名证书（测试环境）
sudo openssl req -new -x509 -days 365 -nodes -text \
  -out /var/lib/postgresql/14/main/server.crt \
  -keyout /var/lib/postgresql/14/main/server.key \
  -subj "/CN=your_domain.com"

# 设置权限
sudo chown postgres:postgres /var/lib/postgresql/14/main/server.*
sudo chmod 600 /var/lib/postgresql/14/main/server.key
```

```ini
# postgresql.conf 中启用 SSL
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
```

---

## 📊 性能优化

### 索引优化

```sql
-- 创建复合索引（根据查询模式）
CREATE INDEX idx_notes_published_created ON notes(is_published, created_at);
CREATE INDEX idx_users_status_created ON users(status, created_at);

-- 分析查询计划
EXPLAIN ANALYZE SELECT * FROM notes WHERE is_published = true ORDER BY created_at DESC;
```

### 连接池配置（后端）

```javascript
// config/database.js 中的 Sequelize 配置
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',

  // 连接池配置
  pool: {
    max: 20,        // 最大连接数
    min: 5,         // 最小连接数
    acquire: 30000, // 获取连接超时时间
    idle: 10000     // 连接空闲超时时间
  },

  // PostgreSQL 特有配置
  dialectOptions: {
    // SSL 配置
    ssl: process.env.DB_SSL ? {
      rejectUnauthorized: false
    } : false,

    // 时区
    timezone: 'Asia/Shanghai'
  },

  // 查询日志（开发环境）
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});
```

---

## 🔍 监控和维护

### 基础监控查询

```sql
-- 查看数据库大小
SELECT pg_size_pretty(pg_database_size('xsblog'));

-- 查看表大小
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 查看活动连接
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start
FROM pg_stat_activity
WHERE state = 'active';

-- 查看慢查询
SELECT
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### 备份脚本

```bash
#!/bin/bash
# backup_postgresql.sh

DB_NAME="xsblog"
DB_USER="xsblog_user"
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
pg_dump -U $DB_USER -h localhost -d $DB_NAME \
  --no-password --format=custom --compress=9 \
  --file="$BACKUP_DIR/xsblog_$DATE.backup"

# 保留最近7天的备份
find $BACKUP_DIR -name "xsblog_*.backup" -mtime +7 -delete

echo "Backup completed: xsblog_$DATE.backup"
```

### 定期维护

```bash
#!/bin/bash
# maintenance_postgresql.sh

DB_NAME="xsblog"
DB_USER="xsblog_user"

# 更新统计信息
psql -U $DB_USER -d $DB_NAME -c "ANALYZE;"

# 清理死元组
psql -U $DB_USER -d $DB_NAME -c "VACUUM;"

# 重建索引（必要时）
psql -U $DB_USER -d $DB_NAME -c "REINDEX DATABASE $DB_NAME;"

echo "Maintenance completed"
```

---

## 🔧 故障排查

### 常见问题

1. **连接被拒绝**
```bash
# 检查服务状态
sudo systemctl status postgresql

# 检查端口监听
sudo netstat -tlnp | grep 5432

# 查看日志
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

2. **权限不足**
```sql
-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE xsblog TO xsblog_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO xsblog_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO xsblog_user;
```

3. **连接数过多**
```sql
-- 查看当前连接数
SELECT count(*) FROM pg_stat_activity;

-- 查看最大连接数配置
SHOW max_connections;

-- 终止空闲连接
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND query_start < now() - interval '1 hour';
```

### 数据类型映射

| PostgreSQL | Sequelize | 说明 |
|-----------|-----------|------|
| INTEGER | INTEGER | 整数 |
| BIGINT | BIGINT | 大整数 |
| VARCHAR | STRING | 字符串 |
| TEXT | TEXT | 长文本 |
| BOOLEAN | BOOLEAN | 布尔值 |
| TIMESTAMP | DATE | 时间戳 |
| JSONB | JSON | JSON数据（推荐） |
| ARRAY | ARRAY | 数组类型 |
| UUID | UUID | UUID类型 |

---

## 🚀 迁移指南

### 从 MySQL 迁移到 PostgreSQL

1. **导出 MySQL 数据**
```bash
mysqldump -u root -p --single-transaction xsblog888 > mysql_data.sql
```

2. **数据转换**（需要根据实际情况调整）
```sql
-- PostgreSQL 特有的数据类型转换
-- MySQL: TINYINT(1) -> PostgreSQL: BOOLEAN
-- MySQL: DATETIME -> PostgreSQL: TIMESTAMP
-- MySQL: JSON -> PostgreSQL: JSONB (性能更好)
```

3. **导入 PostgreSQL**
```bash
# 可能需要使用迁移工具或自定义脚本
# 常用工具：pgloader, ora2pg 等
```
