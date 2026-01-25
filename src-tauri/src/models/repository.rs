use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use anyhow::{Result, anyhow};

/// GitHub 仓库配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Repository {
    pub id: String,
    pub url: String,
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub scan_subdirs: bool,
    pub added_at: DateTime<Utc>,
    pub last_scanned: Option<DateTime<Utc>>,
    // 新增：缓存相关字段
    pub cache_path: Option<String>,
    pub cached_at: Option<DateTime<Utc>>,
    pub cached_commit_sha: Option<String>,
}

impl Repository {
    pub fn new(url: String, name: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            url,
            name,
            description: None,
            enabled: true,
            scan_subdirs: true,
            added_at: Utc::now(),
            last_scanned: None,
            cache_path: None,
            cached_at: None,
            cached_commit_sha: None,
        }
    }

    /// 从 GitHub URL 提取仓库信息
    /// 支持格式: 
    /// - https://github.com/owner/repo
    /// - https://github.com/owner/repo/tree/branch/...
    pub fn from_github_url(url: &str) -> Result<(String, String, Option<String>)> {
        let url_clean = url.trim_end_matches('/');
        let url_clean = url_clean.trim_end_matches(".git");
        
        let parts: Vec<&str> = url_clean.split('/').collect();

        // Find "github.com" index
        let github_idx = parts.iter().position(|&p| p == "github.com");
        
        if let Some(idx) = github_idx {
            if parts.len() > idx + 2 {
                let owner = parts[idx + 1].to_lowercase();
                let repo = parts[idx + 2].to_lowercase();
                
                // Check for tree/{branch}
                let mut branch = None;
                if let Some(tree_idx) = parts.iter().position(|&p| p == "tree") {
                    if parts.len() > tree_idx + 1 {
                        branch = Some(parts[tree_idx + 1].to_string());
                    }
                }
                
                return Ok((owner, repo, branch));
            }
        } else {
             // Fallback for non-standard or direct paths if any (simple split)
             // Assumption: last two parts are owner/repo if not github.com
             if parts.len() >= 2 {
                 let owner = parts[parts.len() - 2].to_lowercase();
                 let repo = parts[parts.len() - 1].to_lowercase();
                 return Ok((owner, repo, None));
             }
        }

        Err(anyhow!("Invalid GitHub URL: {}", url))
    }
}

/// GitHub API 响应 - 目录内容
#[derive(Debug, Clone, Deserialize)]
pub struct GitHubContent {
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub content_type: String,
    pub download_url: Option<String>,
    pub sha: String,
    pub size: u64,
}
