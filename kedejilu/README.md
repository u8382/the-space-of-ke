# 柯的记录

一个用于记录生产安排的小型应用。当前项目包含前端页面与（可选）Node.js 后端（SQLite 存储）。前端与后端的主要功能如下。

## 功能
- 用户注册 / 登录（后端模式下使用 JWT；本地静态模式使用浏览器存储）
- 左侧纵列两个记录类型：`复合记录`、`贵金属出入库记录`
- 右侧显示所选类型的记录，支持添加、编辑、删除
- 每条记录包含：日期、名称、数量、备注
- 支持 CSV 导入 / 导出 和 打印视图

## 使用模式说明
- 静态前端模式：直接打开 `index.html`，数据保存在浏览器 `localStorage`（仅单机可见）。页面默认提供 `admin/123456` 示例账号（仅本地演示）。
- 后端持久化模式（推荐多人使用）：运行本目录内的 Node.js 服务，数据将保存到 SQLite（`data.sqlite`），支持多用户与跨浏览器访问。

## 前端（快速试用）
1. 在浏览器中打开 `index.html`（推荐 Chrome/Edge）。
2. 登录或注册新用户。

## 导出 / 导入 CSV
- 在主界面右侧控制区点击 **导出 CSV** 可将当前用户、当前类型的记录导出为 CSV；如果在日期过滤器设置了日期，仅会导出该日期的记录。
- 点击 **导入 CSV** 并选择 CSV 文件（第一行可包含标题），CSV 每行应为：日期, 名称, 数量, 备注（备注可选）。系统会忽略缺少必要字段的行并导入有效行。

示例 CSV：

```
日期,名称,数量,备注
2025-12-24,复合料A,100,早班
2025-12-24,贵金属B,2,入库
```

导入后数据在静态模式下保存在浏览器 `localStorage` 中；在后端模式下数据会写入服务器 SQLite 数据库。

## 打印视图
- 点击 **打印视图** 将打开浏览器打印对话框，界面会自动隐藏工具按钮、侧栏和控件，便于打印记录表。

## 后端（Node.js + SQLite） — 快速启动

后端已包含基础实现：注册/登录（JWT）、记录的增删改查、CSV 导入/导出接口。下面是本地运行步骤：

1. 进入项目目录并安装依赖：

```bash
cd kedejilu
npm install
```

2. 复制环境示例并设置 `JWT_SECRET`（Windows PowerShell）：

```powershell
copy .env.example .env
```

3. 启动服务：

```bash
npm start
```

4. 在浏览器打开：

http://localhost:3000/index.html

首次运行会在 SQLite 中创建必要表，并自动创建示例用户 `admin` / 密码 `123456`（建议上线前删除或修改）。

## 后端 API 概览
- `POST /api/register` — 请求体 `{username,password}`，返回 `{token,username}`
- `POST /api/login` — 请求体 `{username,password}`，返回 `{token,username}`
- `GET /api/records?type=TYPE[&date=YYYY-MM-DD]` — 需要 `Authorization: Bearer <token>`，返回记录列表
- `POST /api/records` — 添加记录，需包含 `{type,date,name,qty,note}`
- `PUT /api/records/:id` — 更新记录
- `DELETE /api/records/:id` — 删除记录
- `POST /api/import` — 请求体 `{csv: string, type: string}`，服务器解析并导入
- `GET /api/export?type=TYPE[&date=YYYY-MM-DD]` — 导出 CSV 下载

## 文件说明
- 前端：`index.html`, `style.css`, `app.js`
- 后端：`server.js`, `db.js`, `package.json`, `.env.example`

## 注意与后续建议
- 当前 JWT 存储在前端 `localStorage` 中，生产环境建议使用 HttpOnly cookie 或更严格的会话方案。
- 如果需要，我可以：
	- 添加迁移脚本 `migrations/init.sql` 并提供初始化命令；
	- 添加 Dockerfile / docker-compose；
	- 将 JWT 改为 HttpOnly cookie 并实现刷新令牌；
	- 增加分页、权限控制和导入校验日志。

如需我合并更多文档或添加 Docker 支持，请告诉我。