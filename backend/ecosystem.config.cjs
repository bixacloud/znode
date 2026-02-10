module.exports = {
  apps: [
    {
      name: 'znode-backend',
      script: 'dist/index.js',
      cwd: '/home/znode-demo/htdocs/demo.znode.app/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
    },
  ],
};
