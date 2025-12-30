# 技能市场重新设计方案

**日期**: 2025-12-30
**状态**: 设计完成，待实现

## 概述

将现有的技能管理页面重构为类似应用商店的双页面模式，提供更清晰的"已安装"和"浏览发现"两种使用场景，并支持大规模技能管理（成千上万个技能）的搜索和筛选需求。

## 设计决策

通过与用户的多轮讨论，确定了以下关键设计决策：

1. **页面结构**: 三个Tab（已安装、技能市场、仓库管理）
2. **导航方式**: Tab切换（保持现有方式，升级功能）
3. **搜索功能**: 基础搜索（技能名称、描述），实时搜索
4. **仓库标识**: 添加 `repository_owner` 字段，从 `repository_url` 解析
5. **筛选器布局**: 单行紧凑布局（搜索框 + 仓库下拉 + 隐藏已安装复选框）

## 页面结构

### 1. 已安装页面（Installed Skills）

**功能定位**: 管理已安装的技能

**UI布局**:

```
已安装
┌────────────────────────────────────────────────┐
│ [🔍 搜索已安装的技能...]                       │
├────────────────────────────────────────────────┤
│ > 已安装 23 个技能                              │
│ 技能卡片列表...                                 │
```

**核心功能**:

- 搜索框：搜索技能名称和描述（实时搜索）
- 统计信息：显示已安装技能数量
- 技能卡片：显示名称、来源标识（@owner）、安全评分、本地路径
- 操作按钮：卸载、删除、打开文件夹

### 2. 技能市场页面（Skills Marketplace）

**功能定位**: 浏览和发现所有可用技能

**UI布局**:

```
技能市场
┌────────────────────────────────────────────────┐
│ [🔍 搜索技能........] [仓库▼] [☐隐藏已安装]  │
├────────────────────────────────────────────────┤
│ > 找到 125 个技能                               │
│ 技能卡片列表...                                 │
```

**控件布局**（单行紧凑）:

- 搜索框：占约60%宽度
- 仓库下拉选择器：占约25%宽度，默认"全部"
- 隐藏已安装复选框：占约15%宽度

**核心功能**:

- 搜索：实时搜索技能名称和描述
- 仓库筛选：下拉菜单选择特定仓库，显示每个仓库的技能数量
  ```
  全部 (1,234)
  anthropics (456)
  superpowers-marketplace (789)
  本地 (23)
  ```
- 安装状态筛选：复选框隐藏已安装技能
- 技能卡片：显示名称、来源标识、安全评分、安装状态
- 操作按钮：安装、卸载、删除

### 3. 仓库管理页面（Repositories）

保持现有功能不变，用于添加、删除、扫描技能仓库。

## 数据结构变更

### Skill接口扩展

**TypeScript**:

```typescript
export interface Skill {
  id: string;
  name: string;
  description?: string;
  repository_url: string;
  repository_owner?: string;  // 新增：仓库所有者，如 "anthropics"
  file_path: string;
  version?: string;
  author?: string;
  installed: boolean;
  installed_at?: string;
  local_path?: string;
  checksum?: string;
  security_score?: number;
  security_issues?: string[];
}
```

**Rust**:

```rust
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub repository_url: String,
    pub repository_owner: Option<String>,  // 新增
    pub file_path: String,
    pub version: Option<String>,
    pub author: Option<String>,
    pub installed: bool,
    pub installed_at: Option<DateTime<Utc>>,
    pub local_path: Option<String>,
    pub checksum: Option<String>,
    pub security_score: Option<i32>,
    pub security_issues: Option<Vec<String>>,
}
```

### 仓库所有者解析逻辑

**前端工具函数** (`src/lib/utils.ts`):

```typescript
// 从repository_url解析仓库所有者
export function parseRepositoryOwner(repositoryUrl: string): string {
  if (repositoryUrl === "local") return "本地";

  // 解析GitHub URL: https://github.com/anthropics/skills
  const match = repositoryUrl.match(/github\.com\/([^\/]+)/);
  return match ? match[1] : "未知";
}

// 格式化显示仓库标识
export function formatRepositoryTag(skill: Skill): string {
  const owner = skill.repository_owner || parseRepositoryOwner(skill.repository_url);
  return owner === "本地" ? "📁 本地" : `@${owner}`;
}
```

**后端解析** (Rust):
在扫描和安装技能时，自动解析并填充 `repository_owner` 字段：

- GitHub仓库：提取用户名/组织名（如 "anthropics"）
- 本地技能：设置为 "local"

## 组件设计

### 组件结构

```
src/components/
├── InstalledSkillsPage.tsx  # 新增：已安装页面
├── MarketplacePage.tsx      # 新增：技能市场页面
├── SkillCard.tsx            # 改进：添加仓库标识徽章
├── RepositoriesPage.tsx     # 保持不变
└── ... (其他组件)
```

### InstalledSkillsPage.tsx（已安装页面）

**状态管理**:

```typescript
const [searchQuery, setSearchQuery] = useState("");
const { data: installedSkills, isLoading } = useInstalledSkills();
```

**筛选逻辑**:

```typescript
const filteredSkills = installedSkills?.filter(skill =>
  !searchQuery ||
  skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  skill.description?.toLowerCase().includes(searchQuery.toLowerCase())
);
```

**UI组件**:

- 搜索框（带图标，实时搜索）
- 统计信息
- 技能卡片列表
- 空状态提示

### MarketplacePage.tsx（技能市场页面）

**状态管理**:

```typescript
const [searchQuery, setSearchQuery] = useState("");
const [selectedRepository, setSelectedRepository] = useState("all");
const [hideInstalled, setHideInstalled] = useState(false);
const { data: allSkills, isLoading } = useSkills();
```

**仓库列表提取**:

```typescript
const repositories = useMemo(() => {
  const owners = new Set(
    allSkills?.map(s => s.repository_owner || "未知") || []
  );
  return ["全部", ...Array.from(owners).sort()];
}, [allSkills]);

// 统计每个仓库的技能数量
const repositoryCounts = useMemo(() => {
  const counts: Record<string, number> = {};
  allSkills?.forEach(skill => {
    const owner = skill.repository_owner || "未知";
    counts[owner] = (counts[owner] || 0) + 1;
  });
  counts["全部"] = allSkills?.length || 0;
  return counts;
}, [allSkills]);
```

**筛选逻辑**:

```typescript
const filteredSkills = useMemo(() => {
  return allSkills?.filter(skill => {
    // 搜索过滤
    const matchesSearch = !searchQuery ||
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // 仓库过滤
    const matchesRepo = selectedRepository === "全部" ||
      skill.repository_owner === selectedRepository;

    // 安装状态过滤
    const matchesInstalled = !hideInstalled || !skill.installed;

    return matchesSearch && matchesRepo && matchesInstalled;
  }) || [];
}, [allSkills, searchQuery, selectedRepository, hideInstalled]);
```

**UI组件**:

- 搜索框（带防抖，300ms）
- 仓库下拉选择器（显示技能数量）
- "隐藏已安装"复选框
- 统计信息
- 技能卡片列表

### SkillCard.tsx（技能卡片组件）

**改进点**:

- 在技能名称旁边添加仓库标识徽章
- 显示格式：`技能名称 @owner`
- 样式区分：
  - 本地技能：灰色徽章，前缀 📁
  - 远程仓库：青色徽章，前缀 @

**示例代码**:

```tsx
<div className="flex items-center gap-3 mb-2">
  <h3 className="text-lg font-bold text-foreground">
    {skill.name}
  </h3>

  {/* 仓库标识徽章 */}
  <span className={`
    status-indicator text-xs font-mono
    ${skill.repository_owner === "local"
      ? "text-muted-foreground border-muted-foreground/30 bg-muted/10"
      : "text-terminal-cyan border-terminal-cyan/30 bg-terminal-cyan/10"
    }
  `}>
    {formatRepositoryTag(skill)}
  </span>

  {/* 安装状态 */}
  {skill.installed && (
    <span className="status-installed">{t('skills.installed')}</span>
  )}
</div>
```

## 性能优化

### 1. 虚拟滚动（Virtualization）

使用 `@tanstack/react-virtual` 库实现虚拟滚动：

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = useRef<HTMLDivElement>(null);

const rowVirtualizer = useVirtualizer({
  count: filteredSkills.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 200, // 估计每个卡片高度
  overscan: 5, // 预渲染5个额外项
});

// 只在技能数量超过100时启用虚拟滚动
const shouldVirtualize = filteredSkills.length > 100;
```

**优势**:

- 即使有10,000个技能，也只渲染可见区域的~20个DOM节点
- 滚动性能保持流畅
- 内存占用大幅降低

### 2. 搜索和筛选优化

**防抖处理**:

```typescript
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const [searchInput, setSearchInput] = useState("");
const searchQuery = useDebouncedValue(searchInput, 300);
```

**缓存优化**:

```typescript
// 使用 useMemo 缓存筛选结果
const filteredSkills = useMemo(() => {
  // 筛选逻辑
}, [allSkills, searchQuery, selectedRepository, hideInstalled]);

// 使用 useMemo 缓存仓库列表
const repositories = useMemo(() => {
  // 提取逻辑
}, [allSkills]);
```

### 3. 数据加载策略

- **已安装页面**：只加载已安装技能（通过 `useInstalledSkills()` hook）
- **技能市场页面**：加载所有技能，使用React Query缓存
- **React Query配置**：
  ```typescript
  const { data: allSkills } = useQuery({
    queryKey: ["skills"],
    queryFn: api.getSkills,
    staleTime: 5 * 60 * 1000, // 5分钟内数据视为新鲜
    cacheTime: 10 * 60 * 1000, // 10分钟缓存时间
  });
  ```

### 4. 用户体验增强

**加载状态**:

```tsx
{isLoading ? (
  <div className="grid gap-4">
    {[1, 2, 3].map(i => (
      <SkeletonCard key={i} />
    ))}
  </div>
) : (
  // 技能列表
)}
```

**空状态**:

```tsx
{filteredSkills.length === 0 && !isLoading && (
  <EmptyState
    icon={<Search />}
    title="未找到匹配的技能"
    description={
      searchQuery
        ? `没有找到包含"${searchQuery}"的技能`
        : "当前筛选条件下没有技能"
    }
    action={
      <button onClick={() => {
        setSearchQuery("");
        setSelectedRepository("全部");
        setHideInstalled(false);
      }}>
        清除筛选
      </button>
    }
  />
)}
```

**搜索高亮**（可选优化）:

```typescript
function highlightMatch(text: string, query: string) {
  if (!query) return text;

  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}
```

## 数据库迁移

### SQLite迁移脚本

```sql
-- 1. 添加 repository_owner 列（如果不存在）
ALTER TABLE skills ADD COLUMN repository_owner TEXT;

-- 2. 为现有记录填充 repository_owner
UPDATE skills
SET repository_owner = CASE
  WHEN repository_url = 'local' THEN 'local'
  ELSE substr(
    repository_url,
    instr(repository_url, 'github.com/') + 11,
    instr(
      substr(repository_url, instr(repository_url, 'github.com/') + 11),
      '/'
    ) - 1
  )
END
WHERE repository_owner IS NULL;
```

### Rust迁移代码

```rust
impl Database {
    pub fn migrate_add_repository_owner(&self) -> Result<()> {
        // 添加列
        self.conn.execute(
            "ALTER TABLE skills ADD COLUMN repository_owner TEXT",
            [],
        ).ok(); // 忽略错误（列可能已存在）

        // 填充数据
        self.conn.execute(
            r#"
            UPDATE skills
            SET repository_owner = CASE
              WHEN repository_url = 'local' THEN 'local'
              ELSE substr(
                repository_url,
                instr(repository_url, 'github.com/') + 11,
                instr(
                  substr(repository_url, instr(repository_url, 'github.com/') + 11),
                  '/'
                ) - 1
              )
            END
            WHERE repository_owner IS NULL
            "#,
            [],
        )?;

        Ok(())
    }
}
```

## 实施步骤

### 阶段1：数据层（后端）

1. ✅ 更新Rust Skill模型，添加 `repository_owner` 字段
2. ✅ 实现数据库迁移脚本
3. ✅ 更新扫描逻辑，自动填充 `repository_owner`
4. ✅ 更新安装逻辑，自动填充 `repository_owner`
5. ✅ 测试现有API确保向后兼容

**修改文件**:

- `src-tauri/src/models.rs`
- `src-tauri/src/services/database.rs`
- `src-tauri/src/services/skill_manager.rs`

### 阶段2：核心组件（前端）

1. ✅ 更新TypeScript Skill接口
2. ✅ 创建工具函数文件 `src/lib/utils.ts`
3. ✅ 创建 `InstalledSkillsPage.tsx`
4. ✅ 创建 `MarketplacePage.tsx`
5. ✅ 更新 `SkillCard.tsx` 添加仓库标识徽章
6. ✅ 更新 `App.tsx` 的Tab导航

**新增文件**:

- `src/lib/utils.ts`
- `src/components/InstalledSkillsPage.tsx`
- `src/components/MarketplacePage.tsx`

**修改文件**:

- `src/types/index.ts`
- `src/components/SkillCard.tsx`
- `src/App.tsx`

### 阶段3：搜索和筛选

1. ✅ 实现搜索功能（带防抖）
2. ✅ 实现仓库筛选下拉菜单
3. ✅ 实现"隐藏已安装"复选框
4. ✅ 添加筛选逻辑和状态管理
5. ✅ 添加统计信息显示

**新增Hook**:

- `src/hooks/useDebouncedValue.ts`

### 阶段4：性能优化

1. ✅ 安装虚拟滚动库 `@tanstack/react-virtual`
2. ✅ 集成虚拟滚动（当技能数 > 100时）
3. ✅ 优化筛选性能（useMemo）
4. ✅ 添加加载状态和骨架屏
5. ✅ 测试大数据量性能（模拟10,000个技能）

**新增依赖**:

```bash
pnpm add @tanstack/react-virtual
```

### 阶段5：国际化

1. ✅ 添加中英文翻译键值
2. ✅ 更新所有UI文本使用 `t()` 函数

**修改文件**:

- `src/i18n/locales/zh.json`
- `src/i18n/locales/en.json`

## 测试计划

### 单元测试

**工具函数测试**:

```typescript
describe('parseRepositoryOwner', () => {
  it('should parse GitHub URL correctly', () => {
    expect(parseRepositoryOwner('https://github.com/anthropics/skills'))
      .toBe('anthropics');
  });

  it('should handle local skills', () => {
    expect(parseRepositoryOwner('local')).toBe('本地');
  });

  it('should handle invalid URLs', () => {
    expect(parseRepositoryOwner('https://example.com')).toBe('未知');
  });
});
```

**筛选逻辑测试**:

```typescript
describe('Marketplace filtering', () => {
  it('should filter by search query', () => {
    // 测试搜索过滤
  });

  it('should filter by repository', () => {
    // 测试仓库过滤
  });

  it('should filter by installation status', () => {
    // 测试安装状态过滤
  });

  it('should combine multiple filters', () => {
    // 测试组合过滤
  });
});
```

### 集成测试

1. **数据库迁移测试**:

   - 迁移脚本成功执行
   - 现有数据正确填充 `repository_owner`
   - 新记录自动填充该字段
2. **API测试**:

   - 所有技能返回正确的 `repository_owner` 值
   - 本地技能正确标记为 "local"
   - GitHub技能正确解析所有者名称
3. **UI交互测试**:

   - Tab切换正常工作
   - 搜索功能正常
   - 筛选器正常工作
   - 状态在页面切换时保持

### 性能测试

1. **大数据量测试**:

   - 模拟10,000个技能
   - 测试页面加载时间（< 2秒）
   - 测试搜索响应时间（< 300ms）
   - 测试虚拟滚动流畅度（60fps）
2. **内存测试**:

   - 虚拟滚动前后内存占用对比
   - 长时间使用后的内存稳定性

## 风险和挑战

### 技术风险

1. **数据库迁移风险**:

   - **风险**: 现有数据迁移可能失败
   - **缓解**: 在迁移前备份数据库，提供回滚方案
2. **性能风险**:

   - **风险**: 虚拟滚动可能在某些情况下出现闪烁
   - **缓解**: 充分测试，调整 `estimateSize` 和 `overscan` 参数
3. **向后兼容性**:

   - **风险**: 新字段可能影响现有功能
   - **缓解**: `repository_owner` 设为可选字段，旧代码仍能正常工作

### 用户体验风险

1. **学习曲线**:

   - **风险**: 用户需要适应新的页面结构
   - **缓解**: 新设计符合应用商店模式，用户已有心智模型
2. **筛选器复杂度**:

   - **风险**: 多个筛选条件可能让用户困惑
   - **缓解**: 提供"清除筛选"按钮，默认状态简单明了
     ## 总结
