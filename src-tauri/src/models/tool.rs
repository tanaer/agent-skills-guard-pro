use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// AI 编码工具定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiTool {
    /// 唯一标识符 (e.g., "claude", "cursor")
    pub id: String,
    /// 显示名称 (e.g., "Claude Code")
    pub name: String,
    /// 基础路径 (e.g., ~/.claude)
    pub base_path: PathBuf,
    /// 技能子目录 (通常是 "skills" 或自定义)
    pub skills_subdir: String,
    /// 是否检测到安装
    pub is_installed: bool,
    /// 图标名称 (用于前端显示)
    pub icon: Option<String>,
}

/// 文件节点（用于目录树）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    /// 文件/文件夹名称
    pub name: String,
    /// 完整路径
    pub path: String,
    /// 是否为目录
    pub is_dir: bool,
    /// 子节点（仅目录有）
    pub children: Option<Vec<FileNode>>,
}

impl AiTool {
    /// 创建新的工具定义
    pub fn new(id: &str, name: &str, base_path: PathBuf, skills_subdir: &str) -> Self {
        let is_installed = base_path.exists();
        Self {
            id: id.to_string(),
            name: name.to_string(),
            base_path,
            skills_subdir: skills_subdir.to_string(),
            is_installed,
            icon: Some(id.to_string()),
        }
    }

    /// 获取技能目录完整路径
    pub fn skills_path(&self) -> PathBuf {
        self.base_path.join(&self.skills_subdir)
    }
}

/// 获取所有支持的 AI 工具列表
pub fn get_all_supported_tools() -> Vec<AiTool> {
    let home = dirs::home_dir().unwrap_or_default();
    
    vec![
        // Claude Code
        AiTool::new("claude", "Claude Code", home.join(".claude"), "skills"),
        // Cursor
        AiTool::new("cursor", "Cursor", home.join(".cursor"), "skills"),
        // Codex (OpenAI)
        AiTool::new("codex", "Codex (OpenAI)", home.join(".codex"), "skills"),
        // GitHub Copilot
        AiTool::new("github-copilot", "GitHub Copilot", home.join(".config").join("github-copilot"), "skills"),
        // Windsurf
        AiTool::new("windsurf", "Windsurf", home.join(".windsurf"), "skills"),
        // Gemini CLI
        AiTool::new("gemini", "Gemini CLI", home.join(".gemini"), "skills"),
        // AWS Kiro
        AiTool::new("kiro", "AWS Kiro", home.join(".kiro"), "skills"),
        // VS Code
        AiTool::new("vscode", "VS Code", home.join(".vscode"), "skills"),
        // Cline
        AiTool::new("cline", "Cline", home.join(".cline"), "skills"),
        // RooCode
        AiTool::new("roo", "RooCode", home.join(".roo"), "skills"),
        // Aider
        AiTool::new("aider", "Aider", home.join(".aider"), "skills"),
        // Augment
        AiTool::new("augment", "Augment", home.join(".augment"), "skills"),
        // Continue
        AiTool::new("continue", "Continue", home.join(".continue"), "skills"),
        // OpenCode
        AiTool::new("opencode", "OpenCode", home.join(".config").join("opencode"), "skills"),
        // Kilo Code
        AiTool::new("kilocode", "Kilo Code", home.join(".kilocode"), "skills"),
        // Zencoder
        AiTool::new("zencoder", "Zencoder", home.join(".zencoder"), "skills"),
        // Zed
        AiTool::new("zed", "Zed", home.join(".zed"), "skills"),
    ]
}
