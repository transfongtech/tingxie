# Tingxie App 运维文档

## 1. 部署架构
- **运行环境**: macOS (Mac Mini 服务器)
- **Node.js 版本**: 建议 v18+
- **进程管理**: PM2
- **内网穿透**: Cloudflare Tunnel (cloudflared)

## 2. 服务管理命令

### 2.1 启动与停止
所有服务通过主目录下的 `ecosystem.config.js` 进行管理。

```bash
# 进入项目根目录
cd /Users/tianluhuang/Library/CloudStorage/OneDrive-TransfongVentures/Documents/Downloads/Antigravity/

# 启动所有服务 (包括 WebApp 和 Tunnel)
pm2 start ecosystem.config.js

# 重启 Tingxie WebApp
pm2 restart tingxie-webapp

# 查看所有进程状态
pm2 status
```

### 2.2 日志查看
```bash
# 查看实时日志
pm2 logs tingxie-webapp

# 查看特定服务的历史日志
tail -f /Users/tianluhuang/.pm2/logs/tingxie-webapp-out.log
```

## 3. 数据库维护
本应用使用 SQLite 数据库，文件位于 `Tingxie Practice/tingxie-webapp/prisma/dev.db`。

### 3.1 数据库管理界面
可以使用 Prisma Studio 快速可视化操作数据：
```bash
cd "/Users/tianluhuang/Library/CloudStorage/OneDrive-TransfongVentures/Documents/Downloads/Antigravity/Tingxie Practice/tingxie-webapp"
npx prisma studio
```

### 3.2 模式更新 (Migrations)
如果修改了 `schema.prisma` 文件，需要更新数据库：
```bash
npx prisma migrate dev --name init
```

## 4. 数据同步
当需要导入新的词汇表（如新学期的课本内容）时，运行同步脚本：
```bash
cd "/Users/tianluhuang/Library/CloudStorage/OneDrive-TransfongVentures/Documents/Downloads/Antigravity/Tingxie Practice/tingxie-webapp"
npm run sync
```

## 5. 常见问题排查 (Troubleshooting)
1. **服务无法访问**: 
    - 检查 PM2 状态: `pm2 status`。
    - 检查 Cloudflare Tunnel 是否运行: `pm2 logs cloudflared-tunnel`。
    - 检查端口占用: `lsof -i :3000`。
2. **手写识别报错**:
    - 检查 `.env` 文件中的 `GEMINI_API_KEY` 是否有效。
    - 检查网络是否可以访问 Google API 接口。
3. **数据库锁定**:
    - 如果出现 `sqlite busy` 错误，尝试重启 PM2 进程以释放连接。

## 6. 备份建议
- **数据库备份**: 定期复制 `dev.db` 文件到安全的位置。
- **环境变量**: 备份根目录和子目录下的 `.env` 文件，其中包含 API Key 等机密信息。
