# 部署指南

## 🚀 一键部署

### Vercel（推荐）

1. 访问 https://vercel.com
2. 用 GitHub 账号登录
3. 点击「New Project」
4. 选择您的仓库
5. 点击「Deploy」

### Netlify

1. 访问 https://netlify.com
2. 用 GitHub 账号登录
3. 点击「Add new site」→「Import an existing project」
4. 选择您的仓库
5. 点击「Deploy」

### Cloudflare Pages

1. 访问 https://pages.cloudflare.com
2. 用 GitHub 账号登录
3. 点击「Create a project」
4. 选择您的仓库
5. 点击「Save and Deploy」

## 📦 手动部署

### 构建项目

```bash
npm run build
```

构建产物在 `dist/` 目录下。

### 上传到服务器

将 `dist/` 目录下的文件上传到您的静态文件服务器。

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 🔧 环境变量

目前项目不需要环境变量。

## 📱 PWA 支持

应用支持安装为桌面应用：

1. 在 Chrome 中打开应用
2. 点击地址栏右侧的安装图标
3. 点击「安装」

## 🔄 更新部署

每次提交代码到 GitHub 后，部署平台会自动重新构建和部署。
