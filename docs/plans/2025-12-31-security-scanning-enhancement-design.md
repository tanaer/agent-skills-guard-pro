# 安全扫描功能增强设计文档

**日期**: 2025-12-31
**版本**: 1.0
**状态**: 设计完成，待实施

## 1. 概述

### 1.1 目标
增强 agent-skills-guard 的核心安全扫描功能，参考开源项目 skill-security-scan，实现：
- 更丰富的检测规则库
- 安全扫描作为应用首页
- 安装前强制扫描 + 手动触发扫描
- 简洁的列表视图展示扫描结果
- 更详细的扫描报告

### 1.2 设计原则
- **方案选择**: 渐进式增强（方案 A）
- **技术路线**: 保持 Rust 规则系统，不引入 YAML 配置
- **用户体验**: 简洁实用，安全优先

## 2. 总体架构

### 2.1 三层架构

**Rust 后端层（src-tauri/src）**
- 扫描引擎：扩展 `scanner.rs`
- 规则库：扩展 `rules.rs`
- 报告生成器：保持现有格式，增强详细程度
- Tauri Commands：新增扫描相关 API

**React 前端层（src/components）**
- SecurityDashboard：新首页组件
- SecurityDetailDialog：详情对话框组件
- 改造 MarketplacePage：集成安装门禁

**数据层**
- 使用现有 SQLite 数据库
- 扩展 skills 表字段

### 2.2 数据流
1. 首页加载时从数据库读取上次扫描结果
2. 用户手动触发完整扫描
3. Marketplace 安装时先扫描再决定是否继续
4. 扫描结果持久化到数据库

## 3. 规则库增强

### 3.1 新增规则类别

**文件系统访问（新增类别）**
- 读取敏感文件：`~/.ssh/id_rsa`, `~/.aws/credentials`, `.env`
- 访问系统配置：`/etc/passwd`, `/etc/shadow`
- 权重：60-80 分

### 3.2 增强现有类别

**网络类**
- 增加可疑域名检测（非白名单域名）
- 检测数据外传模式

**命令注入类**
- Node.js: `child_process.exec()`, `vm.runInNewContext()`
- 其他语言的动态执行函数

**敏感泄露类**
- JWT token 检测
- 数据库连接串检测

### 3.3 规则元数据增强

在 `PatternRule` 结构体中新增字段：
```rust
pub struct PatternRule {
    // 现有字段...
    pub confidence: Confidence,    // 高/中/低，表示误报可能性
    pub remediation: &'static str, // 修复建议
    pub cwe_id: Option<&'static str>, // CWE 编号
}

pub enum Confidence {
    High,
    Medium,
    Low,
}
```

### 3.4 规模目标
- 规则总数：从约 20 条扩展到 40-50 条
- 保持 `hard_trigger` 机制
- 所有规则在 Rust 代码中维护

## 4. 首页 SecurityDashboard 设计

### 4.1 组件结构

**文件**: `src/components/SecurityDashboard.tsx`

### 4.2 页面布局

**顶部操作栏**
- "扫描所有 Skills" 按钮（带加载状态）
- 扫描状态指示器（上次扫描时间、总 skills 数）

**过滤和排序栏**
- 风险等级过滤：全部 / 严重 / 高风险 / 中风险 / 低风险 / 安全
- 排序选项：按评分、按名称、按扫描时间
- 搜索框：按 skill 名称搜索

**Skills 列表（表格形式）**
| Skill 名称 | 安全评分 | 风险等级 | 问题数量 | 最后扫描时间 | 操作 |
|-----------|---------|---------|---------|-------------|------|
| skill-a   | 95      | 安全    | 0       | 2025-12-31  | 详情 |
| skill-b   | 65      | 中风险  | C:0,H:2,M:3 | 2025-12-31 | 详情 |

**评分颜色编码**
- 90-100：绿色（安全）
- 70-89：黄色（低风险）
- 50-69：橙色（中风险）
- <50：红色（高风险）

**风险等级徽章**
- 严重：红色徽章
- 高：橙色徽章
- 中：黄色徽章
- 低：蓝色徽章
- 安全：绿色徽章

### 4.3 空状态处理
- 无 skills：提示从 Marketplace 安装
- 未扫描：提示点击"扫描"按钮

## 5. 详情对话框设计

### 5.1 组件结构

**文件**: `src/components/SecurityDetailDialog.tsx`

### 5.2 对话框布局

**头部信息**
- Skill 名称和版本
- 总体安全评分（大号显示，带颜色）
- 风险等级徽章
- 扫描时间戳

**问题列表（按严重程度分组）**

Critical 问题区块（红色）：
- 规则名称
- 描述文字
- 代码片段（语法高亮）
- 行号
- 置信度指示

High/Medium/Low 问题：
- 结构同 Critical
- 默认可折叠，Critical 默认展开

**建议区域**
- 显示 recommendations 列表
- hard_trigger 问题标注"已阻止安装"

**底部操作**
- 关闭按钮

### 5.3 交互细节
- 对话框宽度：约 800px
- 最大高度：80vh，内容可滚动
- 代码片段限制长度，可展开

## 6. Marketplace 安装门禁

### 6.1 安装流程改造

**原流程**：
1. 下载 skill 到缓存
2. 解压并复制到本地
3. 刷新已安装列表

**新流程**：
1. 下载 skill 到缓存
2. **对下载的 skill 进行安全扫描**
3. **根据扫描结果决定：**
   - 安全（≥70）：直接继续
   - 中风险（50-69）：确认对话框，显示风险摘要
   - 高风险（<50）或 hard_trigger：警告对话框，强烈建议不安装
4. 用户确认后继续安装
5. 刷新已安装列表

### 6.2 技术实现

**新增 Tauri Command**:
```rust
#[tauri::command]
async fn scan_skill_archive(
    archive_path: String
) -> Result<SecurityReport, String>
```

**前端调用流程**:
```typescript
// 下载后扫描
const report = await invoke('scan_skill_archive', { archivePath });

// 根据评分决定
if (report.score >= 70) {
  // 直接安装
} else if (report.score >= 50) {
  // 显示确认对话框
} else {
  // 显示警告对话框
}
```

### 6.3 用户体验
- 扫描显示加载动画（1-2 秒）
- 高风险用红色警告样式
- 提供详细的风险说明

## 7. 数据存储和缓存

### 7.1 数据库扩展

使用现有 `skills` 表，新增字段：

```sql
-- 新增字段
ALTER TABLE skills ADD COLUMN security_level TEXT;  -- Safe/Low/Medium/High/Critical
ALTER TABLE skills ADD COLUMN scanned_at TEXT;      -- 扫描时间戳

-- 现有字段（已满足需求）
-- security_score INTEGER
-- security_issues TEXT  -- JSON 格式
```

### 7.2 迁移函数

```rust
fn migrate_add_security_fields(&self) -> Result<()> {
    let conn = self.conn.lock().unwrap();

    let _ = conn.execute(
        "ALTER TABLE skills ADD COLUMN security_level TEXT",
        [],
    );

    let _ = conn.execute(
        "ALTER TABLE skills ADD COLUMN scanned_at TEXT",
        [],
    );

    Ok(())
}
```

### 7.3 数据操作

**扫描时**：
```rust
// 扫描完成后更新数据库
db.save_skill(&skill)?;  // 更新 security_score, security_level, security_issues, scanned_at
```

**首页加载**：
```rust
// 从数据库读取所有已安装 skills 的扫描结果
let skills = db.get_skills()?;
```

### 7.4 缓存失效策略
- 通过文件 checksum 检测 skill 内容变化
- 内容变化时标记需要重新扫描
- 提供"清除缓存，重新扫描"功能

## 8. API 接口设计

### 8.1 Tauri Commands

**扫描所有已安装 skills**:
```rust
#[tauri::command]
async fn scan_all_installed_skills(
    app_handle: tauri::AppHandle
) -> Result<Vec<SkillScanResult>, String>
```

**扫描单个归档文件（安装门禁）**:
```rust
#[tauri::command]
async fn scan_skill_archive(
    archive_path: String
) -> Result<SecurityReport, String>
```

**获取缓存的扫描结果**:
```rust
#[tauri::command]
async fn get_scan_results(
    app_handle: tauri::AppHandle
) -> Result<Vec<SkillScanResult>, String>
```

### 8.2 数据结构

```rust
#[derive(Serialize, Deserialize)]
pub struct SkillScanResult {
    pub skill_id: String,
    pub skill_name: String,
    pub score: i32,
    pub level: String,  // "Safe" | "Low" | "Medium" | "High" | "Critical"
    pub scanned_at: String,
    pub report: SecurityReport,
}
```

### 8.3 前端调用示例

```typescript
// 扫描所有 skills
const results = await invoke<SkillScanResult[]>('scan_all_installed_skills');

// 扫描单个归档文件
const report = await invoke<SecurityReport>('scan_skill_archive', {
  archivePath: '/path/to/skill.zip'
});

// 获取缓存结果
const cachedResults = await invoke<SkillScanResult[]>('get_scan_results');
```

## 9. 错误处理

### 9.1 扫描失败场景

**文件读取失败**
- 处理：跳过该 skill，记录错误，继续其他
- UI：显示"扫描失败"，提供重试按钮

**规则编译失败**
- 处理：编译时 panic（开发阶段避免）
- 测试：单元测试覆盖所有规则

**数据库写入失败**
- 处理：Toast 提示用户
- UI：显示警告，建议检查存储空间

### 9.2 安装门禁特殊情况

**扫描超时**（> 30 秒）
- 处理：超时视为"未知风险"
- UI：询问用户是否继续

**归档文件不完整**
- 处理：扫描前验证 checksum
- UI：提示重新下载

### 9.3 用户体验细节
- 显示进度："正在扫描 3/10 skills..."
- 长操作显示进度条（> 5 秒）
- 提供"取消扫描"按钮

## 10. 性能优化

### 10.1 扫描性能
- **并行扫描**：使用 `tokio::spawn` 并行处理
- **增量扫描**：通过 checksum 判断是否需重扫
- **规则预编译**：`lazy_static` 确保正则只编译一次
- **预期性能**：单个 skill < 100ms，10 个约 1 秒

### 10.2 UI 性能
- **虚拟列表**：skills > 100 个时使用虚拟滚动
- **前端过滤排序**：内存操作，无需后端请求
- **延迟加载详情**：对话框打开时才渲染

## 11. 测试策略

### 11.1 后端单元测试（Rust）
- 规则匹配测试：所有规则的正向/反向用例
- 评分计算测试：不同风险组合的评分
- 数据库操作测试：CRUD 正确性

### 11.2 集成测试
- 端到端扫描流程
- 安装门禁流程（高/中/低风险模拟）

### 11.3 前端测试（可选）
- 组件渲染测试
- 交互测试（过滤、排序、详情）

### 11.4 测试数据
- 参考 skill-security-scan 的 `tests/skills/`
- 创建安全/高风险/恶意三类测试用例

## 12. 实施路线

### 12.1 阶段划分

**阶段 1：规则库增强**
- 扩展 rules.rs，增加新规则
- 增强 PatternRule 结构体
- 编写规则单元测试

**阶段 2：数据库扩展**
- 添加迁移函数
- 扩展 skills 表字段
- 更新数据库操作逻辑

**阶段 3：后端 API**
- 实现扫描相关 Tauri Commands
- 增强扫描报告生成
- 集成测试

**阶段 4：前端界面**
- 实现 SecurityDashboard 组件
- 实现 SecurityDetailDialog 组件
- 调整 App.tsx 使首页为安全扫描

**阶段 5：安装门禁**
- 改造 MarketplacePage 安装流程
- 实现风险确认对话框
- 端到端测试

**阶段 6：优化和测试**
- 性能优化
- 错误处理完善
- 用户体验优化

### 12.2 预估工作量
- 阶段 1-2：后端基础（2-3 天）
- 阶段 3：后端 API（1-2 天）
- 阶段 4：前端界面（2-3 天）
- 阶段 5：安装门禁（1-2 天）
- 阶段 6：优化测试（1-2 天）

## 13. 参考资料

### 13.1 参考项目
- skill-security-scan: `skill-security-scan/`
  - 规则定义：`config/rules.yaml`
  - 扫描引擎：`src/scanner/`
  - 测试用例：`tests/skills/`

### 13.2 现有代码
- 规则库：`src-tauri/src/security/rules.rs`
- 扫描器：`src-tauri/src/security/scanner.rs`
- 数据库：`src-tauri/src/services/database.rs`
- 前端：`src/App.tsx`, `src/components/MarketplacePage.tsx`

## 14. 未来扩展（暂不实施）

- 导出扫描报告（JSON/HTML）
- 白名单管理系统
- 规则自定义配置
- 定时后台扫描
- 应用启动时自动扫描
