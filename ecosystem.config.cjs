module.exports = {
  apps: [
    {
      name: 'seotool-proxy-server',
      script: './server.js',
      instances: 'max',       // Run across all available CPU cores
      exec_mode: 'cluster',   // Cluster mode for high availability
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
