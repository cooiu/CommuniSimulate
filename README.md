# -mworks-simulate-web
制作一款基于mworks和web的通信仿真平台，实现随时对通信系统典型模型的仿真及对mworks代码的执行

# CommuniSimulate - Julia代码交互式编辑器

基于Vue和Flask的Julia代码交互式编辑器，支持Jupyter风格的单元格和变量管理。


### 前端部署

#### 开发环境

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

开发服务器默认在 `http://localhost:3000` 运行。

#### 生产环境 (Docker)

1. 构建前端代码：
```bash
npm run build
```

2. 使用Docker Compose启动前端容器：
```bash
docker-compose -f docker-compose.frontend.yml up -d
```

3. 前端将在 `http://localhost:80` 上运行

### 配置API地址

编辑 `.env.production` 文件，设置后端API地址：
```
VITE_API_BASE_URL=http://你的后端服务器地址:5000
```

## 常见问题

### CORS问题

如果遇到跨域请求问题，请确保后端已正确配置CORS。服务器已默认允许所有源的请求，但如果需要进一步配置，请编辑server.py中的CORS设置。

### 会话持续时间

默认情况下，用户会话保持24小时。如需调整，请修改server.py中的`cleanup_sessions`函数。

## 之前的部署文档

以下是单容器部署的说明（前后端集成在一起）：

### Docker整合部署说明

如果您希望将前后端部署在一个容器中，可以使用原始Dockerfile：

```bash
docker-compose up -d
```

更多信息请参阅原文档。

## Docker部署说明

### 前提条件

- 安装Docker和Docker Compose
- Git（可选，用于克隆仓库）

### 部署步骤

1. 克隆或下载本仓库：

```bash
git clone <仓库地址>
cd CommuniSimulate
```

2. 使用Docker Compose构建并启动服务：

```bash
docker-compose up -d
```

这将构建Docker镜像并在后台启动容器。

3. 访问应用：

打开浏览器访问 `http://localhost:5000`

### 停止服务

```bash
docker-compose down
```

### 查看日志

```bash
docker-compose logs -f
```

## 开发模式运行

如果您想在本地开发环境中运行：

1. 前端开发服务器：

```bash
npm install
npm run dev
```

2. 后端服务器：

```bash
pip install -r requirements.txt
python server.py
```

## Julia包依赖

该系统依赖以下Julia包：

- TyPlot (用于绘图)
- 其他您使用的Julia包

请确保在Julia中安装这些包：

```julia
using Pkg
Pkg.add("TyPlot")
# 添加其他需要的包
```

## 持久化数据

用户会话数据存储在 `./sessions` 目录中。确保该目录有适当的权限。

## 故障排除

如果遇到问题，请尝试：

1. 查看容器日志：`docker-compose logs -f`
2. 重启容器：`docker-compose restart`
3. 重建镜像：`docker-compose build --no-cache`
