# CDN 缓存配置建议

## 一、项目路由总览

### 前台页面路由
|      路由       |     说明     | 建议缓存时间 |
| -------------- | ----------- | ----------- |
| `/`            | 首页         | 5分钟        |
| `/blog`        | 博客模式首页 | 5分钟        |
| `/user`        | 用户模式首页 | 5分钟        |
| `/notes`       | 笔记列表     | 5分钟        |
| `/note/`       | 笔记详情     | 10分钟       |
| `/navigation`  | 导航站点     | 10分钟       |
| `/galleries`   | 图库列表     | 10分钟       |
| `/services`    | 服务列表     | 10分钟       |
| `/messages`    | 留言板       | 5分钟        |
| `/promo`       | 官网主题     | 10分钟       |
| `/social-feed` | 朋友圈       | 5分钟        |
| `/docs`        | 文档列表     | 10分钟       |
| `/docs/`       | 文档详情     | 10分钟       |



### 管理后台路由（不缓存）
| 路由 | 说明 |
|------|------|
| `/admins` | 管理首页 |
| `/admins/login` | 登录页 |
| `/admins/dashboard` | 仪表板 |
| `/admins/profile` | 个人资料 |
| `/admins/settings` | 系统设置 |
| `/admins/notes` | 笔记管理 |
| `/admins/sites` | 导航管理 |
| `/admins/galleries` | 图库管理 |
| `/admins/services` | 服务管理 |
| `/admins/social-links` | 社交链接 |
| `/admins/blog-theme` | 博客主题 |
| `/admins/promo-settings` | 官网设置 |
| `/admins/text-settings` | 文本设置 |
| `/admins/social-feed` | 朋友圈管理 |
| `/admins/todos` | 待办事项 |
| `/admins/sticky-notes` | 便签管理 |
| `/admins/other` | 其他设置 |

### API 接口路由（不缓存）
| 路由 | 说明 |
|------|------|
| `/api/auth/*` | 认证接口 |
| `/api/admin/*` | 管理接口 |
| `/api/settings` | 公开设置 |
| `/api/profile` | 公开资料 |
| `/api/social-links` | 社交链接 |
| `/api/sites` | 导航数据 |
| `/api/notes` | 笔记列表 |
| `/api/notes/:id` | 笔记详情 |
| `/api/galleries` | 图库数据 |
| `/api/services` | 服务数据 |
| `/api/messages` | 留言接口 |
| `/api/promo/*` | 官网数据 |
| `/api/social-feed/*` | 朋友圈数据 |
| `/api/captcha` | 验证码 |

---

## 二、缓存规则配置

### 1. 永久缓存资源（365天）

#### Next.js 静态资源（带哈希）
```
路径规则：/_next/static/*
缓存时间：365天
Cache-Control: public, max-age=31536000, immutable
说明：JS/CSS/字体等，文件名含哈希，内容变化时自动失效
```

#### 字体文件
```
后缀：.woff, .woff2, .ttf, .eot, .otf
路径：/promo/fonts/*, /uploads/*.woff2, /uploads/*.ttf
缓存时间：365天
Cache-Control: public, max-age=31536000, immutable
```

#### 网站图标
```
文件：/favicon.svg, /favicon.ico, /*.ico
缓存时间：365天
Cache-Control: public, max-age=31536000
```

### 2. 长期缓存资源（30天）

#### 用户上传图片
```
路径规则：/uploads/*.jpg, /uploads/*.jpeg, /uploads/*.png, /uploads/*.gif, /uploads/*.webp, /uploads/*.svg
缓存时间：30天
Cache-Control: public, max-age=2592000
说明：头像、背景、笔记图片、图库图片等
```

#### 缩略图
```
路径规则：/uploads/*_thumb.jpg
缓存时间：30天
Cache-Control: public, max-age=2592000
说明：朋友圈等模块的压缩缩略图
```

#### 用户上传视频
```
后缀：.mp4, .webm, .ogg, .mov
路径：/uploads/*.mp4, /uploads/*.webm
缓存时间：30天
Cache-Control: public, max-age=2592000
说明：朋友圈视频等
```

#### 文件资源
```
后缀：.md
缓存时间：根据具体情况决定
Cache-Control: public, max-age=2592000
```

### 3. 短期缓存资源（5-10分钟）

#### 前台 HTML 页面
```
路径规则：/, /blog, /user, /notes, /navigation, /galleries, /services, /messages, /promo, /social-feed
缓存时间：5分钟
Cache-Control: public, max-age=300, s-maxage=600
说明：页面内容，CDN 缓存略长于浏览器
```

#### 笔记详情页
```
路径规则：/note/*
缓存时间：10分钟
Cache-Control: public, max-age=600
说明：单篇笔记内容
```

#### 笔记详情页
```
路径规则：/docs/*
缓存时间：10分钟
Cache-Control: public, max-age=600
说明：单篇文档内容
```

#### Next.js 数据文件
```
路径规则：/_next/data/*
缓存时间：5分钟
Cache-Control: public, max-age=300
说明：Next.js 页面预取数据
```

### 4. 不缓存资源

#### 管理后台
```
路径规则：/admins/*
缓存时间：不缓存
Cache-Control: no-cache, no-store, must-revalidate
说明：管理页面需要实时数据和权限验证
```

#### API 接口
```
路径规则：/api/*
缓存时间：不缓存
Cache-Control: no-cache, no-store, must-revalidate
说明：所有后端 API 请求
```

#### 健康检查
```
路径规则：/health
缓存时间：不缓存
说明：服务健康检查
```

---

## 三、按文件类型缓存汇总

|  文件类型   |                 后缀                  |              缓存时间              |            Cache-Control            |
| ---------- | ------------------------------------ | --------------------------------- | ----------------------------------- |
| JavaScript | .js                                  | 365天（_next/static）/ 7天（其他） | public, max-age=31536000, immutable |
| CSS        | .css                                 | 365天（_next/static）/ 7天（其他） | public, max-age=31536000, immutable |
| 字体        | .woff, .woff2, .ttf, .eot, .otf      | 365天                             | public, max-age=31536000, immutable |
| 图片        | .jpg, .jpeg, .png, .gif, .webp, .svg | 30天                              | public, max-age=2592000             |
| 图标        | .ico                                 | 365天                             | public, max-age=31536000            |
| 视频        | .mp4, .webm, .ogg, .mov              | 30天                              | public, max-age=2592000             |
| JSON       | .json                                | 不缓存（API）/ 1小时（静态）        | no-cache 或 max-age=3600             |
| HTML       | 无后缀                                | 5-10分钟                          | public, max-age=300                 |
| 文件        | .md                                  | 5-10分钟 / 长期                    | public, max-age=?                   |
---

## 四、上传目录结构说明

```
/uploads/
├── avatar-*.png          # 用户头像
├── background-*.jpg      # 背景图片
├── favicon-*.png         # 网站图标
├── font-*.ttf/*.woff2    # 自定义字体
├── icon-*.svg            # 图标文件
├── blog-theme/           # 博客主题资源
├── notes/                # 笔记附件图片
├── profile/              # 个人资料图片
├── settings/             # 系统设置图片
├── sites/                # 导航站点图标
├── shop/                 # 服务相关图片
├── social-feed/          # 朋友圈媒体
│   ├── *.jpg/png         # 原图
│   ├── *_thumb.jpg       # 缩略图
│   └── *.mp4             # 视频
├── official/             # 官网主题图片
└── imagesall/            # 图库图片
    └── {gallery_id}/     # 按图册ID分组
```

---

## 五、CDN 配置要点

### 1. 回源配置
- 保留源站 Cache-Control 响应头
- 启用 Gzip/Brotli 压缩
- 启用 HTTP/2 或 HTTP/3
- 回源 Host 头设置为源站域名

### 2. 缓存键设置

#### 忽略的查询参数（不影响缓存）
```
utm_source, utm_medium, utm_campaign, utm_term, utm_content
fbclid, gclid, msclkid
_ga, _gid, _gl
timestamp, _t, t
```

#### 保留的查询参数（影响缓存键）
```
v, version（版本控制）
id, slug（内容标识）
page, limit（分页参数）
category, tag（筛选参数）
```

### 3. 缓存条件
- 仅缓存 GET/HEAD 请求
- 排除带 Cookie 的请求（登录用户）
- 排除带 Authorization 头的请求
- 仅缓存状态码 200 的响应
- 不缓存带 Set-Cookie 的响应

### 4. 缓存刷新策略

|    场景    |              刷新路径               |
| --------- | ---------------------------------- |
| 发布新版本 | `/_next/data/*`、`/_next/static/*` |
| 更新笔记   | `/notes`、`/note/[id]`、`/`         |
| 更新导航   | `/navigation`、`/`                 |
| 更新图库   | `/galleries`、`/`                  |
| 更新服务   | `/services`、`/`                   |
| 更新朋友圈 | `/social-feed`                     |
| 更新官网   | `/promo`                           |
| 更新文档   | `/docs`、`/docs/*`                 |
| 全站更新   | `/*`（排除 /uploads）               |

---

## 六、源站 Nginx 配置

### 完整配置示例

```nginx
# 定义缓存区域（放在 http 块中）
proxy_cache_path /var/cache/nginx/xsblog levels=1:2 keys_zone=xsblog_cache:100m max_size=1g inactive=7d use_temp_path=off;

server {
    listen 80;
    server_name your-domain.com;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/javascript application/javascript application/json image/svg+xml;

    # ==================== 静态资源缓存 ====================

    # Next.js 静态资源（永久缓存）
    location ^~ /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache xsblog_cache;
        proxy_cache_valid 200 365d;
        proxy_cache_key $scheme$proxy_host$request_uri;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header X-Cache-Status $upstream_cache_status;
    }

    # Next.js 数据文件（短期缓存）
    location ^~ /_next/data/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache xsblog_cache;
        proxy_cache_valid 200 5m;
        proxy_cache_key $scheme$proxy_host$request_uri;
        expires 5m;
        add_header Cache-Control "public, max-age=300";
        add_header X-Cache-Status $upstream_cache_status;
    }

    # 字体文件（永久缓存）
    location ~* \.(woff|woff2|ttf|eot|otf)$ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache xsblog_cache;
        proxy_cache_valid 200 365d;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header Access-Control-Allow-Origin *;
    }

    # 图片文件（长期缓存）
    location ~* \.(jpg|jpeg|png|gif|webp|svg|ico)$ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache xsblog_cache;
        proxy_cache_valid 200 30d;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    # 视频文件（长期缓存）
    location ~* \.(mp4|webm|ogg|mov)$ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache xsblog_cache;
        proxy_cache_valid 200 30d;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    # ==================== 不缓存资源 ====================

    # 管理后台（不缓存）
    location ^~ /admins {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_bypass 1;
        proxy_no_cache 1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
    }

    # API 接口（不缓存）
    location ^~ /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_cache_bypass 1;
        proxy_no_cache 1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";

        # CORS 配置
        add_header Access-Control-Allow-Origin $http_origin;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
        add_header Access-Control-Allow-Credentials true;
    }

    # ==================== 页面缓存 ====================

    # 笔记详情页（10分钟缓存）
    location ~ ^/note/[0-9]+$ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache xsblog_cache;
        proxy_cache_valid 200 10m;
        proxy_cache_key $scheme$proxy_host$request_uri;
        expires 10m;
        add_header Cache-Control "public, max-age=600";
        add_header X-Cache-Status $upstream_cache_status;
    }

    # 前台页面（5分钟缓存）
    location ~ ^/(blog|user|notes|navigation|galleries|services|messages|promo|social-feed)$ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache xsblog_cache;
        proxy_cache_valid 200 5m;
        proxy_cache_key $scheme$proxy_host$request_uri;
        expires 5m;
        add_header Cache-Control "public, max-age=300, s-maxage=600";
        add_header X-Cache-Status $upstream_cache_status;
    }

    # 首页（5分钟缓存）
    location = / {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache xsblog_cache;
        proxy_cache_valid 200 5m;
        proxy_cache_key $scheme$proxy_host$request_uri;
        expires 5m;
        add_header Cache-Control "public, max-age=300, s-maxage=600";
        add_header X-Cache-Status $upstream_cache_status;
    }

    # ==================== 默认处理 ====================

    # 其他所有请求
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
}
```

---

## 七、CDN 厂商配置示例

### 阿里云 CDN

```
缓存配置 → 缓存规则（按优先级从高到低）：

1. 目录：/api/          → 不缓存
2. 目录：/admins/       → 不缓存
3. 目录：/_next/static/ → 31536000秒（1年）
4. 目录：/_next/data/   → 300秒（5分钟）
5. 目录：/uploads/      → 2592000秒（30天）
6. 目录：/promo/fonts/  → 31536000秒（1年）
7. 路径：/note/*        → 600秒（10分钟）
8. 文件后缀：woff;woff2;ttf;eot;otf → 31536000秒
9. 文件后缀：jpg;jpeg;png;gif;webp;svg;ico → 2592000秒
10. 文件后缀：mp4;webm;ogg;mov → 2592000秒
11. 文件后缀：js;css → 604800秒（7天）
12. 首页：/ → 300秒

URL 参数配置：
- 忽略参数：utm_source;utm_medium;utm_campaign;fbclid;gclid;_ga;_gid
- 保留参数：page;id;slug;category;tag
```

### 腾讯云 CDN

```
缓存配置 → 节点缓存配置：

路径缓存规则：
- /api/* → 不缓存
- /admins/* → 不缓存
- /_next/static/* → 31536000秒
- /_next/data/* → 300秒
- /uploads/* → 2592000秒
- /note/* → 600秒
- / → 300秒

文件类型缓存规则：
- woff;woff2;ttf;eot;otf → 31536000秒
- jpg;jpeg;png;gif;webp;svg;ico → 2592000秒
- mp4;webm;ogg;mov → 2592000秒
- js;css → 604800秒

缓存键规则配置：
- 全路径缓存：开启
- 忽略参数：utm_source;utm_medium;utm_campaign;fbclid;_ga;_gid
```

### Cloudflare

```
Page Rules（按优先级）：

1. *your-domain.com/api/*
   → Cache Level: Bypass

2. *your-domain.com/admins/*
   → Cache Level: Bypass

3. *your-domain.com/_next/static/*
   → Cache Level: Cache Everything
   → Edge Cache TTL: 1 year
   → Browser Cache TTL: 1 year

4. *your-domain.com/uploads/*
   → Cache Level: Cache Everything
   → Edge Cache TTL: 1 month
   → Browser Cache TTL: 1 month

5. *your-domain.com/note/*
   → Cache Level: Standard
   → Edge Cache TTL: 10 minutes

6. *your-domain.com/*
   → Cache Level: Standard
   → Edge Cache TTL: 5 minutes

Cache Rules（新版）：
- 静态资源：Cache Everything + 长TTL
- API/管理：Bypass Cache
- 页面：Standard + 短TTL
```

### 又拍云 CDN

```
缓存配置：

目录缓存规则：
- /api/ → 不缓存
- /admins/ → 不缓存
- /_next/static/ → 31536000秒
- /uploads/ → 2592000秒

后缀缓存规则：
- woff|woff2|ttf|eot|otf → 31536000秒
- jpg|jpeg|png|gif|webp|svg|ico → 2592000秒
- mp4|webm|ogg|mov → 2592000秒
- js|css → 604800秒

参数跟随：
- 关闭（忽略所有参数）或
- 保留指定参数：page,id,slug
```

---

## 八、验证与监控

### 1. 缓存命中检查

```bash
# 检查静态资源缓存
curl -I https://your-domain.com/_next/static/chunks/main.js

# 期望响应头
Cache-Control: public, max-age=31536000, immutable
X-Cache: HIT
Age: 3600

# 检查图片缓存
curl -I https://your-domain.com/uploads/avatar-xxx.png

# 期望响应头
Cache-Control: public, max-age=2592000
X-Cache: HIT

# 检查 API 不缓存
curl -I https://your-domain.com/api/settings

# 期望响应头
Cache-Control: no-cache, no-store, must-revalidate
X-Cache: BYPASS 或无此头
```

### 2. 性能指标目标

| 指标 | 目标值 |
|------|--------|
| 整体缓存命中率 | > 85% |
| 静态资源命中率 | > 95% |
| 回源带宽占比 | < 15% |
| 首字节时间 (TTFB) | < 200ms |

### 3. 监控建议

- 监控 CDN 流量和命中率趋势
- 设置回源带宽异常告警
- 定期检查缓存配置有效性
- 监控 4xx/5xx 错误率

---

## 九、注意事项

### 1. 安全相关
- `/api/*` 和 `/admins/*` 必须不缓存
- 不缓存包含敏感信息的响应
- 不缓存带 Set-Cookie 的响应
- 不缓存带 Authorization 头的请求

### 2. 更新策略
- 静态资源使用哈希文件名，自动更新
- HTML 页面短缓存，快速更新
- 紧急情况可手动刷新 CDN 缓存
- 发布新版本后刷新 `/_next/data/*`

### 3. 成本优化
- 合理设置缓存时间，减少回源
- 启用智能压缩，降低流量
- 冷门资源可设置较短缓存
- 大文件（视频）考虑分片缓存

### 4. 用户体验
- 首次访问可能较慢（未命中缓存）
- 后续访问显著加速
- 全球用户访问速度趋于一致
- 缩略图功能可大幅提升图片加载速度


**部署注意**：
- `uploads/` 目录需要从源站同步或挂载共享存储
- `logs/` 和 `backups/` 目录需要写入权限