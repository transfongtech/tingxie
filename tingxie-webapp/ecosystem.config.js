module.exports = {
  apps: [
    {
      name: 'tingxie-webapp',
      script: 'npm',
      args: 'run start',
      cwd: '/Users/tianluhuang/Library/CloudStorage/OneDrive-TransfongVentures/Documents/Downloads/Antigravity/Tingxie Practice/tingxie-webapp',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true,
      autorestart: true
    }
  ]
};
