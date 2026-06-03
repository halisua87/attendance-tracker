# 上下班打卡记录应用

一款简洁、美观的上下班时间记录应用，帮助您记录和统计每日工作时长。

## ✨ 功能特性

- 📅 **每日打卡**：支持上班和下班打卡，记录准确的工作时间
- ⏰ **手动输入**：支持手动输入打卡时间，灵活调整
- 📊 **数据统计**：按周、按月统计工作时长，可视化图表展示
- 📈 **图表展示**：直观的柱状图显示每日工作时长
- ✏️ **编辑记录**：支持修改和删除历史打卡记录
- 📱 **响应式设计**：适配各种屏幕尺寸
- 💾 **数据持久化**：本地存储，数据安全可靠

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173/ 查看应用

### 构建生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录下

## 🛠️ 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS 3
- **图表**: Recharts
- **图标**: Lucide React
- **状态管理**: React Context + localStorage

## 📁 项目结构

```
src/
├── components/        # 组件目录
│   ├── Header.tsx     # 统计头部组件
│   ├── CheckInArea.tsx # 打卡区域组件
│   ├── FilterBar.tsx  # 筛选栏组件
│   ├── RecordList.tsx # 记录列表组件
│   ├── RecordItem.tsx # 记录项组件
│   ├── EditModal.tsx  # 编辑弹窗组件
│   ├── ImportModal.tsx # 导入弹窗组件
│   └── ConfirmModal.tsx # 确认弹窗组件
├── hooks/             # 自定义 Hooks
│   └── useRecords.ts  # 记录管理 Hook
├── utils/             # 工具函数
│   └── time.ts        # 时间处理工具
├── types/             # 类型定义
│   └── index.ts       # 类型声明
├── App.tsx            # 主应用组件
├── main.tsx           # 应用入口
└── index.css          # 全局样式
```

## 📖 使用说明

### 打卡操作

1. 点击「上班打卡」按钮记录上班时间
2. 点击「下班打卡」按钮记录下班时间
3. 使用「手动输入」可以自定义打卡时间

### 查看统计

- 默认显示本周统计数据
- 可切换按周/按月查看
- 图表展示每日工作时长

### 筛选记录

- 支持按周筛选
- 支持按月筛选
- 支持自定义日期范围筛选

### 编辑记录

- 点击记录右侧的编辑按钮
- 修改日期和时间后保存

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
