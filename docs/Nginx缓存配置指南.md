# Nginx 缓存配置指南

## 📋 概述

本文档提供 Nginx 缓存配置方案，用于提升 Xs-Blog 的性能。通过合理配置 Nginx 缓存，可以：

- ✅ 减少后端服务器压力
- ✅ 提升页面加载速度
- ✅ 降低数据库查询次数
- ✅ 节省服务器带宽

---

## 🎯 缓存策略

### 缓存分类

| 类型 | 缓存时长 | 说明 |
|------|---------|------|
| **静态资源** | 30天 | JS、CSS、图片、字体等 |
| **HTML页面** | 不缓存 | 前端页面，始终获取最新 |
| **API接口** | 根据接口类型 | 读多写少的接口缓存5-10分钟 |
| **上传文件** | 30天 | 用户上传的图片、附件等 |

---

## ⚙️ 完整配置

### 1. 基础缓存配置

在 Nginx 配置文件顶部添加缓存路径配置：

```nginx
# /etc/nginx/nginx.conf 或 /www/server/nginx/conf/nginx.conf

http {
    # ... 其他配置 ...

    # ========================================
    # 缓存路径配置
    # ========================================

    # 设置缓存目录
    # levels: 目录层级
    # keys_zone: 缓存区名称和大小（10m可存储约80000个缓存键）
    # max_size: 最大缓存大小
    # inactive: 缓存过期时间（未访问的缓存）
    # use_temp_path: 是否使用临时路径
    proxy_cache_path /var/cache/nginx/xs-blog
                     levels=1:2
                     keys_zone=xs_blog_cache:10m
                     max_size=1g
                     inactive=7d
                     use_temp_path=off;

    # 缓存键配置
    proxy_cache_key "$scheme$request_method$host$request_uri";

    # 缓存有效状态码
    proxy_cache_valid 200 304 10m;
    proxy_cache_valid 404 1m;

    # ... 其他配置 ...
}
```

### 2. Server 配置

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # 日志配置
    access_log /var/log/nginx/xs-blog-access.log;
    error_log /var/log/nginx/xs-blog-error.log;

    # ========================================
    # 前端静态资源（Next.js）
    # ========================================
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 不缓存 HTML 页面
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # ========================================
    # Next.js 静态资源缓存（_next 目录）
    # ========================================
    location ^~ /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $http_host;

        # 长期缓存（这些文件带版本号，可以长期缓存）
        expires 365d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # ========================================
    # 后端 API 代理
    # ========================================
    location ^~ /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # API 默认不缓存（动态内容）
        add_header Cache-Control "no-cache";

        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # ========================================
    # API 缓存配置（可选）
    # 仅缓存读操作（GET请求），不缓存写操作
    # ========================================

    # 缓存公开笔记列表（5分钟）
    location = /api/public/notes {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # 启用缓存（仅 GET 请求）
        proxy_cache xs_blog_cache;
        proxy_cache_methods GET;
        proxy_cache_valid 200 5m;

        # 根据查询参数缓存
        proxy_cache_key "$scheme$request_method$host$request_uri";

        # 添加缓存状态头（用于调试）
        add_header X-Cache-Status $upstream_cache_status;

        # 缓存锁（防止缓存雪崩）
        proxy_cache_lock on;
        proxy_cache_lock_timeout 5s;

        # 使用旧缓存（后端更新时）
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;

        # 后台更新缓存
        proxy_cache_background_update on;
    }

    # 缓存配置文件接口（10分钟，很少变化）
    location = /api/public/settings {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $http_host;

        proxy_cache xs_blog_cache;
        proxy_cache_methods GET;
        proxy_cache_valid 200 10m;
        add_header X-Cache-Status $upstream_cache_status;
        proxy_cache_use_stale error timeout updating;
    }

    # 缓存个人资料接口（10分钟）
    location = /api/public/profile {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $http_host;

        proxy_cache xs_blog_cache;
        proxy_cache_methods GET;
        proxy_cache_valid 200 10m;
        add_header X-Cache-Status $upstream_cache_status;
        proxy_cache_use_stale error timeout updating;
    }

    # 缓存导航站点列表（10分钟）
    location = /api/public/sites {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $http_host;

        proxy_cache xs_blog_cache;
        proxy_cache_methods GET;
        proxy_cache_valid 200 10m;
        add_header X-Cache-Status $upstream_cache_status;
        proxy_cache_use_stale error timeout updating;
    }

    # ========================================
    # 上传文件缓存（uploads 目录）
    # ========================================
    location ^~ /uploads/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $http_host;

        # 长期缓存上传的文件
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # ========================================
    # 图片优化（可选）
    # ========================================
    location ~* \.(jpg|jpeg|png|gif|ico|svg|webp)$ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $http_host;

        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;

        # Gzip 压缩
        gzip on;
        gzip_vary on;
        gzip_types image/svg+xml;
    }

    # ========================================
    # 字体文件缓存
    # ========================================
    location ~* \.(woff|woff2|ttf|otf|eot)$ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $http_host;

        expires 365d;
        add_header Cache-Control "public, immutable";
        access_log off;

        # 允许跨域请求字体
        add_header Access-Control-Allow-Origin *;
    }
}
```

---

## 🔄 缓存清除

### 1. 手动清除缓存

```bash
# 清除所有缓存
rm -rf /var/cache/nginx/xs-blog/*

# 重载 Nginx 配置
nginx -s reload
```

### 2. 使用 Nginx 模块清除（需要编译模块）

```bash
# 安装 ngx_cache_purge 模块
# 详见：https://github.com/FRiCKLE/ngx_cache_purge
```

### 3. 设置缓存清除接口（推荐）

在 Nginx 配置中添加：

```nginx
# 缓存清除接口（仅允许本地访问）
location ~ /purge(/.*) {
    allow 127.0.0.1;
    deny all;

    proxy_cache_purge xs_blog_cache $scheme$request_method$host$1;
}
```

使用方法：

```bash
# 清除特定 URL 的缓存
curl -X PURGE http://127.0.0.1/purge/api/public/notes
```

---

## 📊 缓存监控

### 1. 查看缓存状态

在响应头中查看 `X-Cache-Status`：

- `MISS`: 缓存未命中，从后端获取
- `HIT`: 缓存命中
- `EXPIRED`: 缓存过期
- `STALE`: 使用旧缓存
- `UPDATING`: 正在更新缓存
- `REVALIDATED`: 已重新验证
- `BYPASS`: 绕过缓存

### 2. 查看缓存大小

```bash
# 查看缓存目录大小
du -sh /var/cache/nginx/xs-blog

# 查看缓存文件数量
find /var/cache/nginx/xs-blog -type f | wc -l
```

### 3. 监控缓存命中率

在 Nginx 日志中添加缓存状态：

```nginx
log_format cache_log '$remote_addr - $remote_user [$time_local] '
                     '"$request" $status $body_bytes_sent '
                     '"$http_referer" "$http_user_agent" '
                     'Cache:$upstream_cache_status';

access_log /var/log/nginx/cache.log cache_log;
```

分析命中率：

```bash
# 统计缓存命中率
grep "Cache:HIT" /var/log/nginx/cache.log | wc -l
grep "Cache:MISS" /var/log/nginx/cache.log | wc -l
```

---

## ⚠️ 注意事项

### 1. 不要缓存的内容

- ❌ 登录/认证接口（/api/auth/*）
- ❌ 写操作接口（POST/PUT/DELETE）
- ❌ 管理后台接口（/api/admin/*）
- ❌ 动态HTML页面
- ❌ 包含用户信息的接口

### 2. 缓存失效策略

当后端数据更新时，需要清除相关缓存：

**方案 A：手动清除**
```bash
rm -rf /var/cache/nginx/xs-blog/*
```

**方案 B：设置短缓存时间**
```nginx
proxy_cache_valid 200 5m;  # 5分钟后自动失效
```

**方案 C：版本号策略**
```
# 给 API 添加版本号
/api/v1/notes?v=20251124
```

### 3. 缓存大小控制

定期检查缓存大小，避免占满磁盘：

```bash
# 定时任务清理旧缓存
0 3 * * * find /var/cache/nginx/xs-blog -type f -mtime +7 -delete
```

---

## 🚀 性能优化建议

### 1. Gzip 压缩

```nginx
# 启用 Gzip 压缩
gzip on;
gzip_vary on;
gzip_comp_level 6;
gzip_buffers 16 8k;
gzip_http_version 1.1;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
```

### 2. HTTP/2 支持

```nginx
# 启用 HTTP/2（需要 HTTPS）
listen 443 ssl http2;
```

### 3. 连接优化

```nginx
# 保持连接
keepalive_timeout 65;
keepalive_requests 100;

# 上游连接池
upstream backend {
    server 127.0.0.1:3001;
    keepalive 32;
}
```

---

## 📚 相关文档

- [宝塔面板Nginx伪静态配置.md](宝塔面板Nginx伪静态配置.md) - 伪静态规则配置
- [环境变量配置指南.md](环境变量配置指南.md) - 环境变量配置
