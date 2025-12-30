# 多语言支持与滚动条优化实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标：** 为 Agent Skills Guard 添加中英文双语支持，优化界面滚动体验

**架构：** 使用 i18next + react-i18next 实现国际化，通过 localStorage 持久化语言偏好。调整 App.tsx 布局为 flexbox 结构，隐藏滚动条但保留滚动功能。

**技术栈：** React, TypeScript, i18next, react-i18next, Tailwind CSS

---

## Task 1: 创建 i18n 基础结构

**文件：**
- 创建：`src/i18n/config.ts`
- 创建：`src/i18n/locales/zh.json`
- 创建：`src/i18n/locales/en.json`

**Step 1: 创建 i18n 目录结构**

运行：
```bash
mkdir -p src/i18n/locales
```

**Step 2: 创建 i18n 配置文件**

创建文件 `src/i18n/config.ts`，内容：

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

**Step 3: 创建中文翻译文件**

创建文件 `src/i18n/locales/zh.json`，内容：

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
    "version": "版本",
    "status": "系统状态：",
    "operational": "运行中"
  },
  "scan": {
    "initializing": "初始化技能扫描器...",
    "complete": "扫描完成：{{count}} 个技能已检测",
    "noSkills": "扫描完成：未发现本地技能",
    "error": "扫描错误：初始化失败"
  },
  "skills": {
    "title": "技能数据库",
    "totalEntries": "总条目数",
    "all": "全部",
    "installed": "已安装",
    "available": "可用",
    "loading": "加载技能数据库中",
    "install": "安装",
    "uninstall": "卸载",
    "installing": "安装中",
    "uninstalling": "卸载中",
    "delete": "删除",
    "empty": "[ 空 ]",
    "noSkillsFound": "未发现技能",
    "navigateToRepo": "前往仓库配置以扫描仓库",
    "noDescription": "[未提供描述]",
    "repo": "仓库：",
    "path": "路径：",
    "collapseDetails": "收起详情",
    "expandDetails": "展开详情",
    "fullRepository": "完整仓库",
    "version": "版本",
    "author": "作者",
    "localPath": "本地路径",
    "securityAnalysis": "安全分析：",
    "securityScore": "安全评分：",
    "score": "评分",
    "secure": "安全",
    "lowRisk": "低风险",
    "medRisk": "中风险",
    "highRisk": "高风险",
    "safe": "[安全]",
    "lowRiskLabel": "[低风险]",
    "mediumRiskLabel": "[中等风险]",
    "highRiskInstallNotRecommended": "[高风险 - 不建议安装]",
    "securityIssuesDetected": "检测到安全问题：",
    "installedAt": "安装时间",
    "securityWarning": "安全警告",
    "highRiskSkillDetected": "检测到高风险技能",
    "criticalRisk": "[严重风险]",
    "elevatedRisk": "[风险升高]",
    "detectedIssues": "检测到的问题：",
    "moreIssues": "更多问题",
    "installWarning": "安装此技能可能会危及系统安全。请在继续之前验证源的真实性。",
    "abort": "中止",
    "proceedAnyway": "仍然继续",
    "toast": {
      "installed": "[成功] 技能已安装",
      "installFailed": "[错误] 安装失败",
      "uninstalled": "[成功] 技能已卸载",
      "uninstallFailed": "[错误] 卸载失败",
      "deleted": "[成功] 记录已删除",
      "deleteFailed": "[错误] 删除失败"
    }
  },
  "repositories": {
    "title": "仓库配置",
    "addRepo": "添加仓库",
    "cancel": "取消",
    "newRepository": "新仓库",
    "repoName": "仓库名称：",
    "githubUrl": "GitHub 链接：",
    "confirmAdd": "确认添加",
    "adding": "添加中...",
    "loading": "加载仓库中...",
    "enabled": "已启用",
    "url": "链接：",
    "lastScan": "上次扫描：",
    "scan": "扫描",
    "scanning": "扫描中",
    "noReposFound": "未发现仓库",
    "clickAddRepo": "点击"添加仓库"以配置您的第一个仓库",
    "toast": {
      "added": "仓库已添加 // 扫描技能中...",
      "error": "错误：",
      "foundSkills": "发现 {{count}} 个技能",
      "scanError": "扫描错误："
    }
  },
  "language": {
    "zh": "中",
    "en": "EN"
  }
}
```

**Step 4: 创建英文翻译文件**

创建文件 `src/i18n/locales/en.json`，内容：

```json
{
  "header": {
    "title": "AGENT SKILLS GUARD",
    "subtitle": "SECURE_SKILL_MANAGEMENT_PROTOCOL"
  },
  "nav": {
    "skills": "SKILLS_REGISTRY",
    "repositories": "REPO_CONFIG"
  },
  "footer": {
    "version": "v",
    "status": "SYSTEM_STATUS:",
    "operational": "OPERATIONAL"
  },
  "scan": {
    "initializing": "INITIALIZING_SKILL_SCANNER...",
    "complete": "SCAN_COMPLETE: {{count}} SKILLS_DETECTED",
    "noSkills": "SCAN_COMPLETE: NO_LOCAL_SKILLS_FOUND",
    "error": "SCAN_ERROR: INITIALIZATION_FAILED"
  },
  "skills": {
    "title": "SKILL_DATABASE",
    "totalEntries": "TOTAL_ENTRIES",
    "all": "ALL",
    "installed": "INSTALLED",
    "available": "AVAILABLE",
    "loading": "LOADING_SKILLS_DATABASE",
    "install": "INSTALL",
    "uninstall": "UNINSTALL",
    "installing": "INSTALLING",
    "uninstalling": "UNINSTALLING",
    "delete": "DELETE",
    "empty": "[ EMPTY ]",
    "noSkillsFound": "NO_SKILLS_FOUND",
    "navigateToRepo": "Navigate to REPO_CONFIG to scan repositories",
    "noDescription": "[NO_DESCRIPTION_PROVIDED]",
    "repo": "REPO:",
    "path": "PATH:",
    "collapseDetails": "COLLAPSE_DETAILS",
    "expandDetails": "EXPAND_DETAILS",
    "fullRepository": "FULL_REPOSITORY",
    "version": "VERSION",
    "author": "AUTHOR",
    "localPath": "LOCAL_PATH",
    "securityAnalysis": "SECURITY_ANALYSIS:",
    "securityScore": "SECURITY_SCORE:",
    "score": "SCORE",
    "secure": "SECURE",
    "lowRisk": "LOWRISK",
    "medRisk": "MEDRISK",
    "highRisk": "HIGHRISK",
    "safe": "[SAFE]",
    "lowRiskLabel": "[LOW_RISK]",
    "mediumRiskLabel": "[MEDIUM_RISK]",
    "highRiskInstallNotRecommended": "[HIGH_RISK - INSTALLATION_NOT_RECOMMENDED]",
    "securityIssuesDetected": "SECURITY_ISSUES_DETECTED:",
    "installedAt": "INSTALLED_AT",
    "securityWarning": "SECURITY_WARNING",
    "highRiskSkillDetected": "HIGH_RISK_SKILL_DETECTED",
    "criticalRisk": "[CRITICAL_RISK]",
    "elevatedRisk": "[ELEVATED_RISK]",
    "detectedIssues": "DETECTED_ISSUES:",
    "moreIssues": "MORE_ISSUES",
    "installWarning": "Installing this skill may compromise system security. Verify source authenticity before proceeding.",
    "abort": "ABORT",
    "proceedAnyway": "PROCEED_ANYWAY",
    "toast": {
      "installed": "[SUCCESS] SKILL_INSTALLED",
      "installFailed": "[ERROR] INSTALL_FAILED",
      "uninstalled": "[SUCCESS] SKILL_UNINSTALLED",
      "uninstallFailed": "[ERROR] UNINSTALL_FAILED",
      "deleted": "[SUCCESS] RECORD_DELETED",
      "deleteFailed": "[ERROR] DELETE_FAILED"
    }
  },
  "repositories": {
    "title": "Repository_Config",
    "addRepo": "ADD_REPO",
    "cancel": "CANCEL",
    "newRepository": "NEW_REPOSITORY",
    "repoName": "repo_name:",
    "githubUrl": "github_url:",
    "confirmAdd": "CONFIRM_ADD",
    "adding": "ADDING...",
    "loading": "Loading_Repositories...",
    "enabled": "ENABLED",
    "url": "URL:",
    "lastScan": "LAST_SCAN:",
    "scan": "SCAN",
    "scanning": "SCANNING",
    "noReposFound": "No_Repositories_Found",
    "clickAddRepo": "Click \"ADD_REPO\" to configure your first repository",
    "toast": {
      "added": "REPOSITORY_ADDED // SCANNING_SKILLS...",
      "error": "ERROR:",
      "foundSkills": "FOUND_{{count}}_SKILLS",
      "scanError": "SCAN_ERROR:"
    }
  },
  "language": {
    "zh": "中",
    "en": "EN"
  }
}
```

**Step 5: 提交 i18n 基础结构**

运行：
```bash
git add src/i18n
git commit -m "feat: add i18n configuration and translation files"
```

预期：提交成功

---

## Task 2: 添加滚动条隐藏样式

**文件：**
- 修改：`src/styles/globals.css`

**Step 1: 在 globals.css 末尾添加滚动条隐藏样式**

在 `src/styles/globals.css` 文件末尾（第 326 行之后）添加：

```css
  /* Hide scrollbar but keep scroll functionality */
  .hide-scrollbar {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
  }

  .hide-scrollbar::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
```

**Step 2: 提交样式修改**

运行：
```bash
git add src/styles/globals.css
git commit -m "feat: add hide-scrollbar utility class"
```

预期：提交成功

---

## Task 3: 初始化 i18n 并创建语言切换组件

**文件：**
- 修改：`src/main.tsx`
- 创建：`src/components/LanguageSwitcher.tsx`

**Step 1: 在 main.tsx 中初始化 i18n**

在 `src/main.tsx` 的顶部（第 1-2 行之间）添加 i18n 导入：

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n/config"; // 添加这一行
import App from "./App.tsx";
import "./styles/globals.css";
```

**Step 2: 创建语言切换组件**

创建文件 `src/components/LanguageSwitcher.tsx`，内容：

```typescript
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language;

  const toggleLanguage = () => {
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded font-mono text-sm transition-all duration-200 border border-border text-terminal-cyan hover:border-terminal-cyan hover:bg-terminal-cyan/10 hover:text-glow"
      title="Switch Language / 切换语言"
    >
      <Languages className="w-4 h-4" />
      <span className="font-medium">
        {currentLang === 'zh' ? (
          <>
            <span className="text-terminal-cyan">{t('language.zh')}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-muted-foreground">{t('language.en')}</span>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">{t('language.zh')}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-terminal-cyan">{t('language.en')}</span>
          </>
        )}
      </span>
    </button>
  );
}
```

**Step 3: 提交更改**

运行：
```bash
git add src/main.tsx src/components/LanguageSwitcher.tsx
git commit -m "feat: initialize i18n and create language switcher component"
```

预期：提交成功

---

## Task 4: 修改 App.tsx 布局和集成翻译

**文件：**
- 修改：`src/App.tsx`

**Step 1: 添加导入语句**

在 `src/App.tsx` 的导入部分（第 6 行之后）添加：

```typescript
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
```

**Step 2: 修改 AppContent 组件开头，添加 useTranslation hook**

在 `AppContent` 函数内部第一行（第 14 行之后）添加：

```typescript
const { t } = useTranslation();
```

**Step 3: 修改扫描消息以使用翻译**

替换第 20-34 行的扫描消息：

```typescript
// 原来的代码
setLocalScanMessage("INITIALIZING_SKILL_SCANNER...");
// 替换为
setLocalScanMessage(t('scan.initializing'));

// 原来的代码（第 28 行）
setLocalScanMessage(`SCAN_COMPLETE: ${skills.length} SKILLS_DETECTED`);
// 替换为
setLocalScanMessage(t('scan.complete', { count: skills.length }));

// 原来的代码（第 30 行）
setLocalScanMessage("SCAN_COMPLETE: NO_LOCAL_SKILLS_FOUND");
// 替换为
setLocalScanMessage(t('scan.noSkills'));

// 原来的代码（第 34 行）
setLocalScanMessage("SCAN_ERROR: INITIALIZATION_FAILED");
// 替换为
setLocalScanMessage(t('scan.error'));
```

**Step 4: 修改外层容器布局**

将第 46 行的容器 div 替换为：

```typescript
<div className="h-screen flex flex-col overflow-hidden bg-background relative">
```

**Step 5: 修改 Header 为固定且添加语言切换器**

将第 66-90 行的 Header 替换为：

```typescript
{/* Header */}
<header className="flex-shrink-0 border-b border-border bg-card/50 backdrop-blur-sm z-40">
  <div className="container mx-auto px-6 py-6">
    <div className="flex items-center justify-between">
      {/* Left: ASCII Logo and Title */}
      <div className="flex items-center gap-4">
        <div className="text-terminal-cyan font-mono text-2xl leading-none select-none">
          <pre className="text-xs leading-tight">
{`╔═══╗
║ ◎ ║
╚═══╝`}
          </pre>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-terminal-cyan text-glow tracking-wider">
            {t('header.title')}
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-1 tracking-wide">
            <span className="text-terminal-green">&gt;</span> {t('header.subtitle')}
          </p>
        </div>
      </div>

      {/* Right: Language Switcher */}
      <LanguageSwitcher />
    </div>
  </div>
</header>
```

**Step 6: 修改 Navigation 为固定**

将第 93 行的 nav 标签替换为：

```typescript
<nav className="flex-shrink-0 border-b border-border bg-card/30 backdrop-blur-sm z-30">
```

同时修改导航标签文本（第 108 和 127 行）：

```typescript
<span>{t('nav.skills')}</span>

<span>{t('nav.repositories')}</span>
```

**Step 7: 修改 Main 为可滚动区域**

将第 138-147 行的 main 部分替换为：

```typescript
{/* Main Content - Scrollable Area */}
<main className="flex-1 overflow-y-auto hide-scrollbar">
  <div className="container mx-auto px-6 py-8">
    <div
      style={{
        animation: 'fadeIn 0.4s ease-out'
      }}
    >
      {currentTab === "skills" && <SkillsPage />}
      {currentTab === "repositories" && <RepositoriesPage />}
    </div>
  </div>
</main>
```

**Step 8: 修改 Footer 为固定并使用翻译**

将第 150-161 行的 footer 替换为：

```typescript
{/* Footer - Fixed */}
<footer className="flex-shrink-0 border-t border-border bg-card/30 backdrop-blur-sm">
  <div className="container mx-auto px-6 py-3">
    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
      <span className="text-terminal-green">❯</span>
      <span>agent-skills-guard</span>
      <span className="text-terminal-cyan">{t('footer.version')}0.1.0</span>
      <span className="mx-2">•</span>
      <span className="text-terminal-purple">{t('footer.status')}</span>
      <span className="text-terminal-green">{t('footer.operational')}</span>
    </div>
  </div>
</footer>
```

**Step 9: 提交更改**

运行：
```bash
git add src/App.tsx
git commit -m "feat: integrate i18n in App.tsx and update layout for scrollbar"
```

预期：提交成功

---

## Task 5: 在 SkillsPage 中集成翻译

**文件：**
- 修改：`src/components/SkillsPage.tsx`

**Step 1: 添加 useTranslation hook**

在第 6 行之后添加导入：

```typescript
import { useTranslation } from "react-i18next";
```

在 `SkillsPage` 函数内部第一行（第 7 行之后）添加：

```typescript
const { t } = useTranslation();
```

**Step 2: 修改安全徽章函数使用翻译**

替换第 26-54 行的 `getSecurityBadge` 函数：

```typescript
const getSecurityBadge = (score?: number) => {
  if (!score) return null;

  if (score >= 90) {
    return (
      <span className="status-indicator text-terminal-green border-terminal-green/30 bg-terminal-green/10">
        {t('skills.secure')}_{score}
      </span>
    );
  } else if (score >= 70) {
    return (
      <span className="status-indicator text-terminal-yellow border-terminal-yellow/30 bg-terminal-yellow/10">
        {t('skills.lowRisk')}_{score}
      </span>
    );
  } else if (score >= 50) {
    return (
      <span className="status-indicator text-terminal-orange border-terminal-orange/30 bg-terminal-orange/10">
        {t('skills.medRisk')}_{score}
      </span>
    );
  } else {
    return (
      <span className="status-indicator text-terminal-red border-terminal-red/30 bg-terminal-red/10">
        {t('skills.highRisk')}_{score}
      </span>
    );
  }
};
```

**Step 3: 修改 Header 部分文本**

替换第 63、66、82、94、106 行的文本：

```typescript
// 第 63 行
<span>{t('skills.title')}</span>

// 第 66 行
<span className="text-terminal-green">&gt;</span> {filteredSkills?.length || 0} {t('skills.totalEntries')}

// 第 82 行
{t('skills.all')} [{skills?.length || 0}]

// 第 94 行
{t('skills.installed')} [{skills?.filter((s) => s.installed).length || 0}]

// 第 106 行
{t('skills.available')} [{skills?.filter((s) => !s.installed).length || 0}]
```

**Step 4: 修改加载和空状态文本**

替换第 115、151-154 行：

```typescript
// 第 115 行
<p className="text-sm font-mono text-terminal-cyan terminal-cursor">{t('skills.loading')}</p>

// 第 151-154 行
<div className="text-terminal-cyan font-mono text-2xl mb-4">{t('skills.empty')}</div>
<p className="text-sm text-muted-foreground font-mono">{t('skills.noSkillsFound')}</p>
<p className="text-xs text-muted-foreground font-mono mt-2">
  <span className="text-terminal-green">&gt;</span> {t('skills.navigateToRepo')}
</p>
```

**Step 5: 修改 Toast 消息**

替换第 126-127、132-133、138-139 行：

```typescript
// 第 126-127 行
onSuccess: () => showToast(t('skills.toast.installed')),
onError: (error: any) => showToast(`${t('skills.toast.installFailed')}: ${error.message || error}`),

// 第 132-133 行
onSuccess: () => showToast(t('skills.toast.uninstalled')),
onError: (error: any) => showToast(`${t('skills.toast.uninstallFailed')}: ${error.message || error}`),

// 第 138-139 行
onSuccess: () => showToast(t('skills.toast.deleted')),
onError: (error: any) => showToast(`${t('skills.toast.deleteFailed')}: ${error.message || error}`),
```

**Step 6: 修改 SkillCard 组件**

在 `SkillCard` 函数内部第一行添加：

```typescript
const { t } = useTranslation();
```

替换以下行的文本：

```typescript
// 第 236 行
<span className="status-installed">{t('skills.installed')}</span>

// 第 238 行
<span className="status-installing">{t('skills.installing')}</span>

// 第 246-248 行
<span className="font-mono text-xs text-muted-foreground">
  {t('skills.score')}: <span className="text-terminal-cyan">{skill.security_score}/100</span>
</span>

// 第 264 行
{isUninstalling ? (
  <Loader2 className="w-4 h-4 animate-spin" />
) : (
  t('skills.uninstall')
)}

// 第 274-281 行
{isInstalling ? (
  <>
    <Loader2 className="w-4 h-4 animate-spin" />
    {t('skills.installing')}
  </>
) : (
  <>
    <Download className="w-4 h-4" />
    {t('skills.install')}
  </>
)}

// 第 299 行
{skill.description || t('skills.noDescription')}

// 第 305 行
<span className="text-terminal-green">{t('skills.repo')}</span>{" "}

// 第 309 行
<span className="text-terminal-purple">{t('skills.path')}</span> {skill.file_path}

// 第 321 行
{t('skills.collapseDetails')}

// 第 326 行
{t('skills.expandDetails')}

// 第 337-340 行
<DetailItem label={t('skills.fullRepository')} value={skill.repository_url} />
{skill.version && <DetailItem label={t('skills.version')} value={skill.version} />}
{skill.author && <DetailItem label={t('skills.author')} value={skill.author} />}
{skill.local_path && <DetailItem label={t('skills.localPath')} value={skill.local_path} />}

// 第 344、346-350 行
<p className="text-terminal-cyan mb-1">{t('skills.securityAnalysis')}</p>
<p className="text-muted-foreground">
  {skill.security_score}/100 {" "}
  {skill.security_score >= 90 && t('skills.safe')}
  {skill.security_score >= 70 && skill.security_score < 90 && t('skills.lowRiskLabel')}
  {skill.security_score >= 50 && skill.security_score < 70 && t('skills.mediumRiskLabel')}
  {skill.security_score < 50 && t('skills.highRiskInstallNotRecommended')}
</p>

// 第 357 行
<p className="text-terminal-red mb-2">{t('skills.securityIssuesDetected')}</p>

// 第 370 行
<DetailItem
  label={t('skills.installedAt')}
  value={new Date(skill.installed_at).toLocaleString('zh-CN')}
/>

// 第 389-393 行
<h3 className="text-xl font-bold text-terminal-orange mb-2 tracking-wider uppercase">
  {t('skills.securityWarning')}
</h3>
<p className="text-sm text-muted-foreground font-mono">
  {t('skills.highRiskSkillDetected')}
</p>

// 第 400、402-404 行
<p className="text-xs font-mono text-terminal-orange mb-1">{t('skills.securityScore')}</p>
<p className="text-sm font-mono text-foreground">
  {skill.security_score}/100
  {skill.security_score < 50 && ` ${t('skills.criticalRisk')}`}
  {skill.security_score >= 50 && skill.security_score < 70 && ` ${t('skills.elevatedRisk')}`}
</p>

// 第 411 行
<p className="text-xs font-mono text-terminal-red mb-2">{t('skills.detectedIssues')}</p>

// 第 420 行
<li className="text-muted-foreground italic">
  ... +{skill.security_issues.length - 5} {t('skills.moreIssues')}
</li>

// 第 428-430 行
<span className="text-terminal-orange">[!]</span> {t('skills.installWarning')}

// 第 437 行
{t('skills.abort')}

// 第 442 行
{t('skills.proceedAnyway')}
```

**Step 7: 提交更改**

运行：
```bash
git add src/components/SkillsPage.tsx
git commit -m "feat: integrate i18n in SkillsPage"
```

预期：提交成功

---

## Task 6: 在 RepositoriesPage 中集成翻译

**文件：**
- 修改：`src/components/RepositoriesPage.tsx`

**Step 1: 添加 useTranslation hook**

在第 8 行之后添加导入：

```typescript
import { useTranslation } from "react-i18next";
```

在 `RepositoriesPage` 函数内部第一行（第 10 行之后）添加：

```typescript
const { t } = useTranslation();
```

**Step 2: 修改 Toast 消息**

替换第 35、38 行：

```typescript
// 第 35 行
showToast(t('repositories.toast.added'));

// 第 38 行
showToast(`${t('repositories.toast.error')} ${error.message || error}`);
```

**Step 3: 修改 Header 文本**

替换第 52、62、67 行：

```typescript
// 第 52 行
{t('repositories.title')}

// 第 62 行
{t('repositories.cancel')}

// 第 67 行
{t('repositories.addRepo')}
```

**Step 4: 修改表单文本**

替换第 85、92、105 行：

```typescript
// 第 85 行
{t('repositories.newRepository')}

// 第 92 行
{t('repositories.repoName')}

// 第 105 行
{t('repositories.githubUrl')}
```

**Step 5: 修改按钮文本**

替换第 126、131、140 行：

```typescript
// 第 126 行
{t('repositories.adding')}

// 第 131 行
{t('repositories.confirmAdd')}

// 第 140 行
{t('repositories.cancel')}
```

**Step 6: 修改加载和仓库列表文本**

替换第 165、189、197、212、231、244、249、272、275 行：

```typescript
// 第 165 行
{t('repositories.loading')}

// 第 189 行
<span className="status-indicator text-terminal-green border-terminal-green/30 bg-terminal-green/10">
  {t('repositories.enabled')}
</span>

// 第 197 行
<span className="text-terminal-green">{t('repositories.url')}</span>{" "}

// 第 212 行
<span className="text-terminal-purple">{t('repositories.lastScan')}</span>{" "}

// 第 231 行
showToast(t('repositories.toast.foundSkills', { count: skills.length }));

// 第 234 行
showToast(`${t('repositories.toast.scanError')} ${error.message || error}`);

// 第 244 行
{t('repositories.scanning')}

// 第 249 行
{t('repositories.scan')}

// 第 272 行
{t('repositories.noReposFound')}

// 第 275 行
{t('repositories.clickAddRepo')}
```

**Step 7: 提交更改**

运行：
```bash
git add src/components/RepositoriesPage.tsx
git commit -m "feat: integrate i18n in RepositoriesPage"
```

预期：提交成功

---

## Task 7: 测试和验证

**Step 1: 启动开发服务器**

运行：
```bash
pnpm dev
```

预期：应用启动成功

**Step 2: 测试滚动条**

- 检查页面是否没有显示滚动条
- 滚动 main 内容区域确认功能正常
- Header 和 Footer 应保持固定

**Step 3: 测试语言切换**

- 点击右上角的语言切换按钮
- 验证所有文本是否正确切换
- 刷新页面确认语言偏好已保存

**Step 4: 测试所有页面**

- 切换到 Skills 页面，验证所有文本
- 切换到 Repositories 页面，验证所有文本
- 测试按钮、Toast 消息等交互元素

**Step 5: 最终提交**

如果测试通过，创建最终提交：

```bash
git add .
git commit -m "feat: complete i18n and scrollbar optimization implementation

- Add Chinese and English language support with i18next
- Implement language switcher in header
- Optimize layout with hidden scrollbar
- Translate all UI text in App, SkillsPage, and RepositoriesPage

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

预期：所有功能正常工作

---

## 完成

实现完成后，应用将具备：
✅ 完整的中英文双语支持
✅ 语言切换器（Header 右上角）
✅ 语言偏好持久化
✅ 优化的滚动体验（隐藏滚动条）
✅ 固定的 Header/Nav/Footer
✅ 所有界面文本支持翻译
