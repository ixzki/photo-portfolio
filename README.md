# Photo Portfolio — 摄影作品集

一个极简风格的个人摄影作品集网站，基于 Next.js 16 构建，支持后台管理，可一键部署到 Vercel。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/photo-portfolio&env=ADMIN_PASSWORD,AUTH_SECRET&envDescription=管理员密码和Cookie签名密钥&envLink=https://github.com/your-username/photo-portfolio#环境变量)

## 特性

- 🎨 极简黑白设计，专注作品展示
- 📱 响应式布局，兼容 4K 显示器、横竖屏及不同窗口比例
- 🖼️ 6 种图片版式：横版全宽、双列并排、竖版居中、自适应换行、拼贴换行、横版拼贴
- 🏠 首页精选区，支持关联项目或单张图片展示
- 🔧 完整后台管理：总览、首页精选、作品管理、站点设置
- 🗄️ Neon Postgres 持久化存储，未配置时自动回退到本地 JSON 文件
- 🚀 一键部署到 Vercel

## 本地开发

```bash
npm install
npm run dev
```

打开 http://localhost:3000，后台管理在 http://localhost:3000/admin。

默认管理员密码：`admin123`（通过 `ADMIN_PASSWORD` 环境变量修改）。

## 项目结构

```
src/
├── app/
│   ├── page.tsx              # 首页精选
│   ├── layout.tsx            # 全局布局
│   ├── about/                # 关于页
│   ├── works/                # 作品列表 + 详情
│   ├── admin/                # 后台管理
│   └── api/                  # API 路由
├── components/               # 复用组件
└── lib/                      # 类型、数据库、认证
data/                         # 本地 JSON 数据（无数据库时使用）
```

## 图片版式

| 版式 | 说明 |
|------|------|
| 横版全宽 | 每张图片占满整行宽度 |
| 双列并排 | 两张图片左右各占 50% |
| 竖版居中 | 竖版图片居中排列 |
| 自适应换行 | 图片自动换行 |
| 拼贴换行 | 首张 60%、其余 40% 拼贴布局 |
| 横版拼贴 | 横版图片纵向堆叠 |

## 部署到 Vercel

1. Fork 本仓库
2. 在 Vercel 中导入，或点击上方的 Deploy 按钮
3. 设置环境变量（见下方）
4. 部署完成

### 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `ADMIN_PASSWORD` | 后台管理员密码 | 是 |
| `AUTH_SECRET` | Cookie 签名密钥（32+ 位随机字符串） | 是 |
| `DATABASE_URL` | Neon Postgres 连接地址 | 否 |

不设置 `DATABASE_URL` 时，数据自动存储到 `data/*.json` 文件。

## License

MIT