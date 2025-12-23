# 宝塔面板 Nginx 伪静态配置指南

## 📋 概述

本配置适用于在宝塔面板中部署 Xs-Blog 项目（Next.js + Express 前后端分离架构），提供完整的伪静态配置方案。

---

## 🎯 部署方案

### 方案1: Next.js 独立运行（推荐）

**适用情况：** Next.js 通过 `npm start` 或 PM2 运行在 3000 端口，Nginx 只做反向代理

```nginx
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

# 静态资源缓存
location /_next/static {
    proxy_pass http://127.0.0.1:3000;
    proxy_cache_valid 200 60m;
    add_header Cache-Control "public, immutable";
}

# API 路由
location /api {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### 方案2: 静态导出

**适用情况：** 使用 `next export` 导出了静态 HTML 文件

```nginx
location / {
    try_files $uri $uri.html $uri/ /index.html;
}

# API 请求转发到后端
location /api {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### 方案3: 完整配置（前后端分离）⭐ 推荐

**适用情况：** 前端（3000端口）+ 后端（3001端口）同时运行

```nginx
# 前端 Next.js
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

# 后端 API
location /api {
    proxy_pass http://127.0.0.1:3001/api;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# 上传文件目录
location /uploads {
    proxy_pass http://127.0.0.1:3001/uploads;
    add_header Cache-Control "public, max-age=31536000";
}
```

---

## 📝 宝塔面板配置步骤

1. **登录宝塔面板**
2. **进入网站管理** → 找到你的网站 → 点击"设置"
3. **找到"伪静态"选项卡**
4. **选择配置类型** → 选择"自定义"
5. **粘贴配置** → 根据你的部署方式选择上面对应的配置代码
6. **保存配置**
7. **重启 Nginx** → 在"服务"中重启 Nginx 服务

---

## ⚙️ 配置说明

### 关键参数解释

| 参数 | 说明 |
|------|------|
| `proxy_pass` | 反向代理目标地址（本地服务端口） |
| `proxy_http_version 1.1` | 使用 HTTP/1.1 协议 |
| `proxy_set_header Host` | 传递原始 Host 头 |
| `X-Real-IP` | 传递真实客户端 IP |
| `X-Forwarded-For` | 传递代理链路 IP |
| `X-Forwarded-Proto` | 传递协议类型（http/https） |

### 端口说明

- **3000** - Next.js 前端服务端口
- **3001** - Express 后端 API 服务端口
- **80/443** - Nginx 对外服务端口

---

## ❓ 常见问题

### 1. 配置后 502 错误

**原因：** 后端服务未启动或端口不正确

**解决：** 检查 PM2 进程是否运行，确认端口号正确

```bash
pm2 list
netstat -tunlp | grep 3000
netstat -tunlp | grep 3001
```

### 2. API 请求 404

**原因：** API 路由配置不正确

**解决：** 确保 `location /api` 的 `proxy_pass` 地址正确

### 3. 静态资源加载失败

**原因：** 缓存配置问题

**解决：** 清除浏览器缓存，检查 `/_next/static` 路由配置

### 4. WebSocket 连接失败

**原因：** 缺少 Upgrade 头配置

**解决：** 确保包含以下配置：

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

---

## 🚀 性能优化建议

### 1. 启用 Gzip 压缩

在宝塔面板 → 网站设置 → 配置文件中添加：

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
```

### 2. 静态资源缓存

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf)$ {
    proxy_pass http://127.0.0.1:3000;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### 3. 限制请求大小（用于文件上传）

```nginx
client_max_body_size 50M;
```

### 4. 启用缓存（可选）

参考 [Nginx缓存配置指南.md](Nginx缓存配置指南.md) 进行详细配置

---

## 🔒 安全配置建议

### 1. 隐藏 Nginx 版本号

```nginx
server_tokens off;
```

### 2. 防止点击劫持

```nginx
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";
```

### 3. HTTPS 强制跳转

```nginx
if ($scheme != "https") {
    return 301 https://$host$request_uri;
}
```

### 4. 禁止访问敏感目录

```nginx
# 禁止访问 .env、.git 等文件
location ~ /\.(env|git) {
    deny all;
}

# 禁止访问 node_modules
location ~ ^/node_modules/ {
    deny all;
}
```

---

## ✅ 验证配置

配置完成后，使用以下命令验证 Nginx 配置是否正确：

```bash
nginx -t
```

如果显示 `syntax is ok` 和 `test is successful`，说明配置正确。

---

## 📚 相关文档

- [Nginx缓存配置指南.md](./Nginx缓存配置指南.md) - 详细缓存配置方案
- [CDN缓存配置建议.md](./CDN缓存配置建议.md) - CDN缓存优化建议
- [环境变量配置指南.md](./环境变量配置指南.md) - 环境变量配置说明