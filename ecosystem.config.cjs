module.exports = {
  apps: [
    {
      name: 'seotool-proxy-server',
      script: './server.js',
      // express-rate-limit is per-worker; for strict global limits use nginx limit_req (infra/nginx/seo.conf).
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,      // Automatically restart on crash
      watch: false,           // Do not watch files in production
      max_memory_restart: '1G', // Restart if memory exceeds 1GB
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
