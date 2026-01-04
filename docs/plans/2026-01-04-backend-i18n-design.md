# Rust 后端国际化设计方案

**日期**: 2026-01-04
**状态**: 已确认
**目标**: 为 Tauri 后端实现中英文双语支持，消除硬编码的中文字符串

## 背景

当前项目前端已通过 `i18next + react-i18next` 实现了完整的中英文国际化，但后端（Rust/Tauri）中存在大量硬编码的中文字符串，包括：

- 安全扫描报告的建议信息（`scanner.rs`）
- 错误消息和日志
- 数据库操作提示
- 其他用户可见的文本

这导致用户切换到英文时，后端返回的消息仍然是中文，影响用户体验。

## 核心设计决策

### 1. 语言同步方式：命令参数传递

**选择方案**: 每次调用 Tauri 命令时，前端传递 `locale` 参数（"zh" 或 "en"）

**优点**:
- 简单直接，无需额外状态管理
- 每次调用都使用最新语言设置
- 无同步问题

**实现**:
```rust
// 修改前
#[tauri::command]
pub async fn scan_skill_archive(
    archive_path: String,
) -> Result<SecurityReport, String>

// 修改后
#[tauri::command]
pub async fn scan_skill_archive(
    archive_path: String,
    locale: String,  // 新增
) -> Result<SecurityReport, String>
```

### 2. i18n 库选择：rust-i18n

**选择方案**: 使用 `rust-i18n` crate

**优点**:
- 编译时类型安全
- 支持 YAML/JSON 翻译文件
- 简单的宏 API：`t!("key", locale = "en")`
- 支持变量插值
- 性能优秀（编译时嵌入）

**使用示例**:
```rust
use rust_i18n::t;

// 简单翻译
let message = t!("security.scan_failed", locale = &locale);

// 带变量
let message = t!(
    "security.file_scan_error",
    locale = &locale,
    file = file_name,
    line = line_number
);
```

### 3. 翻译文件组织：按模块分文件

**文件结构**:
```
src-tauri/
├── locales/
│   ├── zh/
│   │   ├── security.yml    # 安全扫描模块
│   │   ├── skills.yml      # 技能管理模块
│   │   ├── database.yml    # 数据库操作
│   │   └── common.yml      # 通用消息
│   └── en/
│       ├── security.yml
│       ├── skills.yml
│       ├── database.yml
│       └── common.yml
├── src/
│   ├── i18n.rs             # i18n 初始化
│   └── ...
└── Cargo.toml
```

**翻译 Key 命名规范**:
- 点号分隔的层级结构：`模块.子模块.具体消息`
- 示例：`security.recommendations.destructive_operation`

## 翻译文件内容示例

### security.yml（核心模块）

```yaml
# locales/zh/security.yml
blocked_message: "⛔ 检测到严重安全威胁，已阻止安装！"
score_warning_severe: "⚠️ 此 skill 存在严重安全风险，建议不要安装"
score_warning_medium: "⚠️ 此 skill 存在中等安全风险，请谨慎使用"
no_issues: "✅ 未发现明显安全问题"

# 格式化字符串
file_location: "文件: %{file}, 行 %{line}"
hard_trigger_issue: "%{rule_name} (文件: %{file}, 行 %{line}): %{description}"

# 分类建议
recommendations:
  destructive: "包含破坏性操作（如删除文件），存在极高风险"
  remote_exec: "包含远程代码执行，存在极高风险"
  cmd_injection: "包含命令注入风险，请检查代码逻辑"
  network: "包含网络请求操作，请确认目标地址可信"
  secrets: "检测到敏感信息泄露风险（密钥、密码等）"
  persistence: "包含持久化操作（如 crontab），请谨慎"
  privilege: "包含权限提升操作，请确认必要性"
  sensitive_file: "包含敏感文件访问操作（如密钥、配置文件），请确认必要性"
```

```yaml
# locales/en/security.yml
blocked_message: "⛔ Severe security threat detected, installation blocked!"
score_warning_severe: "⚠️ This skill poses severe security risks, installation not recommended"
score_warning_medium: "⚠️ This skill poses moderate security risks, use with caution"
no_issues: "✅ No obvious security issues found"

file_location: "File: %{file}, Line: %{line}"
hard_trigger_issue: "%{rule_name} (File: %{file}, Line: %{line}): %{description}"

recommendations:
  destructive: "Contains destructive operations (e.g., file deletion), extremely high risk"
  remote_exec: "Contains remote code execution, extremely high risk"
  cmd_injection: "Contains command injection risk, please review code logic"
  network: "Contains network requests, verify target addresses are trusted"
  secrets: "Sensitive information leakage risk detected (keys, passwords, etc.)"
  persistence: "Contains persistence operations (e.g., crontab), use with caution"
  privilege: "Contains privilege escalation operations, verify necessity"
  sensitive_file: "Contains sensitive file access (e.g., keys, config files), verify necessity"
```

### common.yml（通用模块）

```yaml
# locales/zh/common.yml
errors:
  file_not_found: "文件未找到: %{path}"
  directory_not_exist: "目录不存在: %{path}"
  read_failed: "读取文件失败 '%{path}': %{error}"
  scan_failed: "扫描失败 '%{path}': %{error}"
```

## 实施范围

### 需要修改的后端文件（12 个）

根据 Grep 扫描结果，以下文件包含硬编码中文：

1. **src-tauri/src/security/scanner.rs** ⭐ 最重要
   - `generate_recommendations()` - 所有安全建议
   - `scan_directory()` - 格式化字符串
   - `scan_file()` - 格式化字符串

2. **src-tauri/src/commands/security.rs**
   - `scan_all_installed_skills` - 添加 locale 参数
   - `get_scan_results` - 添加 locale 参数
   - `scan_skill_archive` - 添加 locale 参数

3. **其他需要检查的文件**:
   - `services/skill_manager.rs`
   - `services/database.rs`
   - `services/github.rs`
   - `models/security.rs`
   - `security/rules.rs`
   - `models/skill.rs`
   - `models/repository.rs`
   - `security/mod.rs`
   - `lib.rs`
   - `commands/mod.rs`

### 前端调整

所有调用后端 Tauri 命令的地方都需要传递 `locale` 参数：

```typescript
// src/lib/api.ts 或组件中
import { invoke } from '@tauri-apps/api/core';
import i18n from './i18n/config';

const locale = i18n.language;

const result = await invoke('scan_skill_archive', {
  archivePath: path,
  locale: locale  // 新增参数
});
```

**受影响的前端文件**（根据 Grep 结果）:
- `src/components/MarketplacePage.tsx`
- `src/components/OverviewPage.tsx`
- `src/lib/api.ts`
- `src/components/SecurityDashboard.tsx`

## 技术细节

### Cargo.toml 依赖

```toml
[dependencies]
rust-i18n = "3"

[build-dependencies]
rust-i18n = "3"
```

### build.rs 配置

```rust
fn main() {
    rust_i18n::i18n!("locales");
    tauri_build::build()
}
```

### i18n 初始化

```rust
// src-tauri/src/i18n.rs
rust_i18n::i18n!("locales", fallback = "zh");
```

## 实施优先级

### 阶段 1：核心安全扫描模块
1. 添加 rust-i18n 依赖
2. 创建翻译文件结构
3. 重构 `scanner.rs`
4. 修改 `commands/security.rs` 的命令签名
5. 更新前端调用

### 阶段 2：其他模块
6. 重构其余 10 个文件
7. 完善所有翻译

### 阶段 3：测试和完善
8. 用户手动测试验证
9. 根据反馈调整

## 不需要考虑的事项

- ❌ 向后兼容性（项目未正式发布）
- ❌ 详细的自动化测试策略（用户手动测试）
- ❌ 测试代码双语化（可保持硬编码中文或统一用 "zh"）

## 验证清单

- [ ] 切换语言后，安全扫描报告显示对应语言
- [ ] 错误消息正确显示中英文
- [ ] 所有硬编码中文已移除
- [ ] 前端调用正常工作

## 参考资料

- rust-i18n: https://github.com/longbridgeapp/rust-i18n
- 前端 i18n 实现: `src/i18n/config.ts`
- 前端翻译文件: `src/i18n/locales/zh.json`, `src/i18n/locales/en.json`
