/**
 * PM2 进程管理配置文件（优化版）
 * 用于生产环境部署，自动重启和内存管理
 *
 * 使用方法:
 * 1. 安装 PM2: npm install -g pm2
 * 2. 启动应用: pm2 start ecosystem.config.js
 * 3. 查看状态: pm2 status
 * 4. 查看日志: pm2 logs xs-blog-frontend
 * 5. 重启应用: pm2 restart xs-blog-frontend
 * 6. 停止应用: pm2 stop xs-blog-frontend
 */

module.exports = {
  apps: [
    {
      name: 'xs-blog-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: './',

      // 实例配置
      instances: 1, // 单实例模式，避免多实例占用过多内存
      exec_mode: 'fork', // fork 模式，不使用 cluster

      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Node.js 参数 - 内存优化
      node_args: [
        '--max-old-space-size=2048',      // 最大堆内存 2GB
        '--max-semi-space-size=64',       // 新生代内存 64MB
        '--optimize-for-size',            // 优化内存占用
        '--gc-interval=100',              // GC 间隔
      ],

      // 内存限制 - 超过后自动重启
      max_memory_restart: '1800M', // 1.8GB 时重启，留有缓冲

      // 自动重启配置
      autorestart: true,
      max_restarts: 5,            // 最多重启5次
      min_uptime: '10s',
      restart_delay: 5000,        // 重启间隔5秒

      // 监听文件变化（生产环境建议关闭）
      watch: false,

      // 日志配置
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // 进程管理
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Cron 重启（可选，每天凌晨 X 点重启）
      // cron_restart: '0 X * * *',

      // 异常处理
      exp_backoff_restart_delay: 100,
    }
  ]
};
