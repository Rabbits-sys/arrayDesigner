# 浮力工业发布「麦克风阵列构型设计平台」v0.1.0

用三维交互与本地仿真，助力工程师与研究者快速完成麦克风阵列构型设计与 MVDR 波束形成验证。

—— 浮力工业（Buoyancy Industries）今日宣布，开源发布「麦克风阵列构型设计平台」v0.1.0。该工具将阵列三维交互编辑、三维可视化与 MVDR（Minimum Variance Distortionless Response）仿真整合到同一界面，开箱即用、完全本地运行，无需上传任何数据。

## 为什么选择它
- 一站式：阵列构型编辑、可视化、波束形成仿真与方向图展示集于一体。
- 全本地：后端计算基于 FastAPI + NumPy，前端采用 React + Three.js + Plotly，数据不出本地。
- 上手快：无需复杂部署，即可在 Windows 下数分钟内完成启动。
- 开源友好：MIT 许可，便于二次开发与科研教学使用。

## 核心功能亮点
- 三维交互式阵列编辑：支持麦克风坐标增删改，可拖拽与表单编辑并存。
- 三维可视化：基于 Three.js 实时展示阵列空间布局。
- MVDR 波束形成仿真：在后端计算权重与方向图响应。
- 多视角结果展示：提供二维极坐标图与三维方向图，两者模块高度统一，便于对比分析。
- 操作体验优化：左侧编辑面板支持内部滚动；方向图模块支持“一键复位视角”。

## 技术栈与开源信息
- 前端：React + TypeScript + Three.js + Plotly.js
- 后端：Python + FastAPI + NumPy
- 运行环境：Node.js 18+，Python 3.11+
- 许可协议：MIT License（© 2025 Xiaoyun Jing）
- 版本：v0.1.0（前端与后端当前版本一致）

> 经过核对：
> - 前端脚本包含 `dev`、`build`、`preview`，构建命令为 `npm run build`，预览监听 `127.0.0.1:5173`。
> - 后端提供健康检查 `GET /api/health` 与仿真接口 `POST /api/mvdr/beampattern`。
> - 仓库附带 MIT License。

## 快速开始（Windows / 本地）

- 后端（推荐在仓库根目录或 backend 目录执行）

```cmd
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

- 前端（新开一个终端窗口）

```cmd
cd frontend
npm install
set VITE_API_BASE_URL=http://127.0.0.1:8000
npm run build
npm run preview
```

- 打开浏览器访问：http://127.0.0.1:5173

> 说明：如遇端口占用，可将上述命令中的端口改为未占用值；前端需后端可用以访问仿真功能。

## 面向开发者的接口概览
- 健康检查：`GET /api/health`
- MVDR 方向图：`POST /api/mvdr/beampattern`
  - 主要入参（节选）：
    - `positions`: 麦克风坐标数组（单位 m，形状 M×3）
    - `freq_hz`: 频率（Hz）
    - `look_az_deg` / `look_el_deg`: 目标方位（度）
    - `az_*` / `el_*`: 扫描网格范围与步长
    - `c`: 声速（默认 343 m/s）、`diag_loading`: 对角加载
  - 主要出参：
    - `az_deg`、`el_deg`：角度网格
    - `response_db`：归一化后的方向图（dB，地板默认 -60 dB）

## 适用场景
- 声学阵列教学与实验课演示
- 研究原型验证、参数敏感性分析
- 工程项目早期方案比较与可视化汇报

## 路线图（部分）
- 更多算法：Delay-and-Sum、Superdirective 等
- 宽带/多频点分析与加速
- 滤波器/权重导出，阵列方案导入与共享
- 国际化与可插拔绘图主题
- 更完善的单元测试与性能优化

## 媒体素材
- 界面截图（仓库内）：`img/index.jpeg`

## 获取与反馈
- 源代码与文档：GitHub - Rabbits-sys/arrayDesigner
- 许可：MIT（保留原作者署名与许可文件）
- 业务合作与咨询：请通过仓库 Issue 或企业联系渠道与我们沟通

—— 浮力工业 | Buoyancy Industries

