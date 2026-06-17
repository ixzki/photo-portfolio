# Photo Portfolio

一个基于 Next.js 的个人摄影作品集网站，支持作品展示、项目详情页和简单后台管理。

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Neon Postgres
- Vercel

## 本地开发

```bash
npm install
npm run dev
```

访问：

- 网站首页：http://localhost:3000
- 后台管理：http://localhost:3000/admin

默认后台密码为 `admin123`，可通过环境变量修改。

## 环境变量

创建 `.env.local`：

```env
ADMIN_PASSWORD=your-password
DATABASE_URL=your-postgres-url
AUTH_SECRET=your-auth-secret
```

说明：

- `ADMIN_PASSWORD`：后台管理员密码
- `DATABASE_URL`：Postgres 数据库连接地址
- `AUTH_SECRET`：后台登录签名密钥

## 部署

项目可部署到 Vercel。

部署后请在 Vercel 项目设置中配置环境变量，并访问 `/setup` 完成初始配置。

## License

MIT
