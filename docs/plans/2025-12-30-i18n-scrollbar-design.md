# 多语言支持与滚动条优化设计方案

**日期：** 2025-12-30
**状态：** 已批准

## 概述

为 Agent Skills Guard 应用添加中英文双语支持，并优化界面滚动体验。

## 需求

1. **滚动条优化**：Header/Nav 保持固定，Main 内容区域独立滚动且隐藏滚动条
2. **多语言支持**：默认中文，支持切换英文
3. **语言切换器**：放在 Header 右上角，简洁的语言代码切换按钮（"中/EN"）
4. **翻译范围**：所有界面文本，保持终端风格的中英混合

## 技术方案

### 方案选择：i18next + react-i18next

**优势：**
- 依赖已安装（package.json 中已有）
- 成熟的国际化解决方案
- 支持语言切换、持久化、类型安全
- 配置简单，代码组织清晰

## 架构设计

### 文件结构

```
src/
├── i18n/
│   ├── config.ts          # i18next 配置和初始化
│   ├── locales/
│   │   ├── zh.json        # 中文翻译
│   │   └── en.json        # 英文翻译
│   └── types.ts           # 翻译键的类型定义（可选）
├── components/
│   ├── LanguageSwitcher.tsx  # 语言切换组件
│   ├── App.tsx            # 修改：引入 i18n
│   ├── SkillsPage.tsx     # 修改：使用翻译
│   └── RepositoriesPage.tsx  # 修改：使用翻译
└── main.tsx               # 修改：在根部初始化 i18n
```

### 初始化流程

1. 在 `main.tsx` 中导入 i18n 配置（确保在渲染前初始化）
2. i18next 配置默认语言为 `zh`（中文）
3. 从 localStorage 读取用户之前选择的语言
4. 使用 localStorage 进行跨会话持久化

## 详细设计

### 1. i18n 配置

**文件：** `src/i18n/config.ts`

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh from './locales/zh.json';
import en from './locales/en.json';

// 从 localStorage 获取保存的语言，默认中文
const savedLanguage = localStorage.getItem('language') || 'zh';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en }
    },
    lng: savedLanguage,
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false // React 已经处理了 XSS
    }
  });

export default i18n;
```

### 2. 翻译文件结构

**中文翻译示例** (`locales/zh.json`)：
```json
{
  "header": {
    "title": "智能体技能守卫",
    "subtitle": "安全技能管理协议"
  },
  "nav": {
    "skills": "技能注册表",
    "repositories": "仓库配置"
  },
  "footer": {
    "status": "系统状态：",
    "operational": "运行中"
  },
  "scan": {
    "initializing": "初始化技能扫描器...",
    "complete": "扫描完成：{{count}} 个技能已检测",
    "noSkills": "扫描完成：未发现本地技能",
    "error": "扫描错误：初始化失败"
  }
}
```

**英文翻译** (`locales/en.json`)：保持相同的键结构，值为英文。

**翻译键命名规范：**
- 使用点分层级：`section.subsection.key`
- 保持结构清晰，易于维护

### 3. 语言切换组件

**文件：** `src/components/LanguageSwitcher.tsx`

**设计要点：**
- 简洁的文本按钮，显示当前语言和可切换语言
- 点击切换语言，保存到 localStorage
- 使用终端风格样式

**核心逻辑：**
```typescript
const { i18n } = useTranslation();
const currentLang = i18n.language;

const toggleLanguage = () => {
  const newLang = currentLang === 'zh' ? 'en' : 'zh';
  i18n.changeLanguage(newLang);
  localStorage.setItem('language', newLang);
};
```

**样式设计：**
- `font-mono` 字体匹配终端风格
- `text-terminal-cyan` 颜色主题
- 悬停时添加发光效果
- 当前语言高亮显示

### 4. 组件中使用翻译

**使用示例：**
```typescript
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('header.title')}</h1>
      <p>{t('scan.complete', { count: 5 })}</p>
    </div>
  );
}
```

### 5. 滚动条处理方案

**全局样式** (`src/styles/globals.css`)：
```css
/* 隐藏滚动条但保留滚动功能 */
.hide-scrollbar {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.hide-scrollbar::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}
```

**布局调整** (`App.tsx`)：
```tsx
<div className="h-screen flex flex-col overflow-hidden">
  {/* 扫描通知 - 固定在顶部 */}
  {showScanAnimation && <ScanBanner />}

  {/* Header - 固定 */}
  <header className="flex-shrink-0 border-b ...">
    <div className="flex items-center justify-between">
      <div>{/* Logo 和标题 */}</div>
      <LanguageSwitcher />  {/* 右上角 */}
    </div>
  </header>

  {/* Navigation - 固定 */}
  <nav className="flex-shrink-0 border-b ...">
    {/* Nav 内容 */}
  </nav>

  {/* Main - 可滚动区域 */}
  <main className="flex-1 overflow-y-auto hide-scrollbar">
    <div className="container mx-auto px-6 py-8">
      {/* 页面内容 */}
    </div>
  </main>

  {/* Footer - 固定在底部 */}
  <footer className="flex-shrink-0 border-t ...">
    {/* Footer 内容 */}
  </footer>
</div>
```

**关键改动：**
- 外层容器：`h-screen flex flex-col overflow-hidden`
- Header/Nav/Footer：`flex-shrink-0`（不收缩）
- Main：`flex-1 overflow-y-auto hide-scrollbar`

## 实现步骤

### 第一步：设置 i18n 基础
1. 创建 `src/i18n/` 目录结构
2. 编写 i18n 配置文件
3. 创建中英文翻译文件
4. 在 `main.tsx` 中导入 i18n 配置

### 第二步：修改布局和滚动
1. 在 `globals.css` 添加 `hide-scrollbar` 样式
2. 修改 `App.tsx` 布局结构
3. 测试滚动效果

### 第三步：创建语言切换组件
1. 创建 `LanguageSwitcher.tsx`
2. 实现切换逻辑和持久化
3. 集成到 Header

### 第四步：替换文本为翻译键
1. 修改 `App.tsx`
2. 修改 `SkillsPage.tsx`
3. 修改 `RepositoriesPage.tsx`
4. 完善翻译文件

## 测试要点

- 切换语言后所有文本是否正确更新
- 刷新页面后语言选择是否保持
- 滚动条是否完全隐藏但功能正常
- Header/Nav/Footer 是否保持固定
- 中英文文本长度差异是否影响布局

## 注意事项

- 某些组件可能有自己的滚动容器，需要单独处理
- 确保所有异步加载的文本也使用翻译
- 翻译文本长度差异可能影响布局，需要测试

## 未来扩展

- 添加更多语言支持
- 根据系统语言自动设置默认语言
- 使用 Tauri Store 替代 localStorage
