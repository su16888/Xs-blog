/**
 * PM2 进程管理配置文件（后端）
 * 用于生产环境部署，自动重启和内存管理
 *
 * 使用方法:
 * 1. 安装 PM2: npm install -g pm2
 * 2. 启动应用: pm2 start ecosystem.config.js
 * 3. 查看状态: pm2 status
 * 4. 查看日志: pm2 logs xs-blog-backend
 * 5. 重启应用: pm2 restart xs-blog-backend
 * 6. 停止应用: pm2 stop xs-blog-backend
 */

module.exports = {
  apps: [
    {
      name: 'xs-blog-backend',
      script: 'src/app.js',
      cwd: './',

      // 实例配置
      instances: 1, // 单实例模式
      exec_mode: 'fork', // fork 模式

      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // Node.js 参数 - 内存优化
      node_args: [
        '--max-old-space-size=1024',      // 最大堆内存 1GB
        '--max-semi-space-size=32',       // 新生代内存 32MB
      ],

      // 内存限制 - 超过后自动重启
      max_memory_restart: '800M',

      // ========================================
      // 重启限制配置（重要！）
      // ========================================
      autorestart: true,
      max_restarts: 5,           // 最多重启5次
      min_uptime: '10s',         // 进程至少运行10秒才算正常启动
      restart_delay: 5000,       // 重启间隔5秒

      // 监听文件变化（生产环境建议关闭）
      watch: false,

      // 日志配置
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // 进程管理
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000,

      // 指数退避重启延迟（每次重启失败后延迟时间翻倍）
      exp_backoff_restart_delay: 1000,
    }
  ]
};
