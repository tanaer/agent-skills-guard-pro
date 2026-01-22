pub mod security;

use crate::models::{Repository, Skill, FeaturedRepositoriesConfig};
use crate::services::{Database, GitHubService, SkillManager, ProxyConfig, ProxyService};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::Manager;
use tauri::State;
use tokio::sync::Mutex;

pub struct AppState {
    pub db: Arc<Database>,
    pub skill_manager: Arc<Mutex<SkillManager>>,
    pub github: Arc<GitHubService>,
    /// 共享的 HTTP 客户端，已配置代理
    pub http_client: Arc<reqwest::Client>,
}

/// 添加仓库
#[tauri::command]
pub async fn add_repository(
    state: State<'_, AppState>,
    url: String,
    name: String,
) -> Result<String, String> {
    let repo = Repository::new(url, name);
    let repo_id = repo.id.clone();
    state.db.add_repository(&repo)
        .map_err(|e| e.to_string())?;
    Ok(repo_id)
}

/// 获取所有仓库
#[tauri::command]
pub async fn get_repositories(
    state: State<'_, AppState>,
) -> Result<Vec<Repository>, String> {
    state.db.get_repositories()
        .map_err(|e| e.to_string())
}

/// 删除仓库（同时删除未安装的技能和清理缓存）
#[tauri::command]
pub async fn delete_repository(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<(), String> {
    // 1. 获取仓库信息
    let repo = state.db.get_repository(&repo_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "仓库不存在".to_string())?;

    let repository_url = repo.url.clone();
    let cache_path = repo.cache_path.clone();

    // 2. 删除未安装的技能（使用事务）
    let deleted_skills_count = state.db.delete_uninstalled_skills_by_repository_url(&repository_url)
        .map_err(|e| e.to_string())?;

    log::info!("删除仓库 {} 的 {} 个未安装技能", repo.name, deleted_skills_count);

    // 3. 清理缓存目录（失败不中断）
    if let Some(cache_path_str) = cache_path {
        let cache_path_buf = std::path::PathBuf::from(&cache_path_str);
        if cache_path_buf.exists() {
            match std::fs::remove_dir_all(&cache_path_buf) {
                Ok(_) => log::info!("成功删除缓存目录: {:?}", cache_path_buf),
                Err(e) => log::warn!("删除缓存目录失败，但不影响仓库删除: {:?}, 错误: {}", cache_path_buf, e),
            }
        } else {
            log::info!("缓存目录不存在，跳过清理: {:?}", cache_path_buf);
        }
    }

    // 4. 删除仓库记录
    state.db.delete_repository(&repo_id)
        .map_err(|e| e.to_string())?;

    log::info!("成功删除仓库: {}", repo.name);
    Ok(())
}

/// 扫描仓库中的 skills
#[tauri::command]
pub async fn scan_repository(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<Vec<Skill>, String> {
    use chrono::Utc;

    // 获取仓库信息
    let repo = state.db.get_repository(&repo_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "仓库不存在".to_string())?;

    let (owner, repo_name) = Repository::from_github_url(&repo.url)
        .map_err(|e| e.to_string())?;

    // 确定缓存基础目录
    let cache_base_dir = dirs::cache_dir()
        .ok_or("无法获取缓存目录".to_string())?
        .join("agent-skills-guard")
        .join("repositories");

    let mut skills = if let Some(cache_path) = &repo.cache_path {
        // 使用缓存扫描(0次API请求)
        log::info!("使用本地缓存扫描仓库: {}", repo.name);

        let cache_path_buf = std::path::PathBuf::from(cache_path);
        if cache_path_buf.exists() && cache_path_buf.is_dir() {
            state.github.scan_cached_repository(&cache_path_buf, &repo.url, repo.scan_subdirs)
                .map_err(|e| format!("扫描缓存失败: {}", e))?
        } else {
            // 缓存路径不存在，重新下载
            log::warn!("缓存路径不存在，重新下载: {:?}", cache_path_buf);
            let (extract_dir, commit_sha) = state.github
                .download_repository_archive(&owner, &repo_name, &cache_base_dir)
                .await
                .map_err(|e| format!("下载仓库压缩包失败: {}", e))?;

            // 更新数据库缓存信息
            state.db.update_repository_cache(
                &repo_id,
                &extract_dir.to_string_lossy(),
                Utc::now(),
                Some(&commit_sha),
            ).map_err(|e| e.to_string())?;

            state.github.scan_cached_repository(&extract_dir, &repo.url, repo.scan_subdirs)
                .map_err(|e| format!("扫描缓存失败: {}", e))?
        }
    } else {
        // 首次扫描: 下载压缩包并缓存(1次API请求)
        log::info!("首次扫描，下载仓库压缩包: {}", repo.name);

        let (extract_dir, commit_sha) = state.github
            .download_repository_archive(&owner, &repo_name, &cache_base_dir)
            .await
            .map_err(|e| format!("下载仓库压缩包失败: {}", e))?;

        // 更新数据库缓存信息
        state.db.update_repository_cache(
            &repo_id,
            &extract_dir.to_string_lossy(),
            Utc::now(),
            Some(&commit_sha),
        ).map_err(|e| e.to_string())?;

        // 扫描本地缓存
        state.github.scan_cached_repository(&extract_dir, &repo.url, repo.scan_subdirs)
            .map_err(|e| format!("扫描缓存失败: {}", e))?
    };

    // 第一步：对扫描结果按名称去重（同一仓库内同名技能只保留一个）
    // 优先保留 file_path 最短的（通常是主目录而非 .claude/.codex 等子目录）
    let mut seen_names: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    let mut deduped_skills: Vec<Skill> = Vec::new();
    
    // 先按 file_path 长度排序，短路径优先
    skills.sort_by(|a, b| a.file_path.len().cmp(&b.file_path.len()));
    let original_count = skills.len();
    
    for skill in skills {
        if let Some(&existing_idx) = seen_names.get(&skill.name) {
            log::info!("跳过重复技能 '{}' (已存在更短路径版本): {}", skill.name, skill.file_path);
            // 如果现有技能未安装但新扫描的有安装信息，更新现有技能
            if !deduped_skills[existing_idx].installed && skill.installed {
                deduped_skills[existing_idx].installed = skill.installed;
                deduped_skills[existing_idx].installed_at = skill.installed_at;
                deduped_skills[existing_idx].local_path = skill.local_path.clone();
                deduped_skills[existing_idx].local_paths = skill.local_paths.clone();
            }
        } else {
            seen_names.insert(skill.name.clone(), deduped_skills.len());
            deduped_skills.push(skill);
        }
    }
    
    log::info!("扫描到 {} 个技能，去重后剩余 {} 个", original_count, deduped_skills.len());
    let mut skills = deduped_skills;

    // 第二步：迁移旧 ID 的数据并删除旧记录
    if let Ok(existing_skills) = state.db.get_skills() {
        // 筛选出属于当前仓库的现有技能（通过标准化 URL 匹配）
        let repo_skills: Vec<&Skill> = existing_skills.iter().filter(|s| {
            if let Ok((s_owner, s_repo)) = Repository::from_github_url(&s.repository_url) {
                s_owner.eq_ignore_ascii_case(&owner) && s_repo.eq_ignore_ascii_case(&repo_name)
            } else {
                false
            }
        }).collect();

        // 收集需要删除的旧技能 ID（同名但不同 ID 的旧记录）
        let mut ids_to_delete: Vec<String> = Vec::new();
        
        for skill in &mut skills {
            // 查找所有同名但 ID 不同的旧技能
            for old_skill in repo_skills.iter().filter(|s| s.name == skill.name && s.id != skill.id) {
                log::info!("发现遗留的同名技能，正在迁移数据: {} -> {}", old_skill.id, skill.id);
                
                // 迁移安装状态
                if old_skill.installed && !skill.installed {
                    skill.installed = true;
                    skill.installed_at = old_skill.installed_at;
                    skill.local_path = old_skill.local_path.clone();
                    skill.local_paths = old_skill.local_paths.clone();
                    skill.installed_commit_sha = old_skill.installed_commit_sha.clone();
                }
                
                // 迁移安全扫描数据
                if old_skill.security_score.is_some() && skill.security_score.is_none() {
                    skill.security_score = old_skill.security_score;
                    skill.security_issues = old_skill.security_issues.clone();
                    skill.security_level = old_skill.security_level.clone();
                    skill.scanned_at = old_skill.scanned_at;
                }
                
                ids_to_delete.push(old_skill.id.clone());
            }
        }
        
        // 删除旧技能记录
        for id in ids_to_delete {
            if let Err(e) = state.db.delete_skill(&id) {
                log::error!("删除遗留技能失败 {}: {}", id, e);
            }
        }
    }

    // 保存到数据库
    for skill in &skills {
        // 验证 file_path 不为空（注意："." 表示根目录，是有效路径）
        if skill.file_path.trim().is_empty() {
            log::warn!("跳过无效技能记录：名称={}, 路径为空", skill.name);
            continue;
        }

        state.db.save_skill(skill)
            .map_err(|e| e.to_string())?;
    }

    Ok(skills)
}

/// 获取所有 skills
#[tauri::command]
pub async fn get_skills(
    state: State<'_, AppState>,
) -> Result<Vec<Skill>, String> {
    let manager = state.skill_manager.lock().await;
    manager.get_all_skills()
        .map_err(|e| e.to_string())
}

/// 获取已安装的 skills
#[tauri::command]
pub async fn get_installed_skills(
    state: State<'_, AppState>,
) -> Result<Vec<Skill>, String> {
    let manager = state.skill_manager.lock().await;
    manager.get_installed_skills()
        .map_err(|e| e.to_string())
}

/// 安装 skill
#[tauri::command]
pub async fn install_skill(
    state: State<'_, AppState>,
    skill_id: String,
    install_path: Option<String>,
) -> Result<(), String> {
    let manager = state.skill_manager.lock().await;
    manager.install_skill(&skill_id, install_path).await
        .map_err(|e| e.to_string())
}

/// 准备安装技能：下载并扫描，但不标记为已安装
#[tauri::command]
pub async fn prepare_skill_installation(
    state: State<'_, AppState>,
    skill_id: String,
    locale: String,
) -> Result<crate::models::security::SecurityReport, String> {
    let manager = state.skill_manager.lock().await;
    manager.prepare_skill_installation(&skill_id, &locale).await
        .map_err(|e| e.to_string())
}

/// 确认安装技能：标记为已安装
#[tauri::command]
pub async fn confirm_skill_installation(
    state: State<'_, AppState>,
    skill_id: String,
    install_path: Option<String>,
) -> Result<(), String> {
    let manager = state.skill_manager.lock().await;
    manager.confirm_skill_installation(&skill_id, install_path)
        .map_err(|e| e.to_string())
}

/// 取消安装技能：删除已下载的文件
#[tauri::command]
pub async fn cancel_skill_installation(
    state: State<'_, AppState>,
    skill_id: String,
) -> Result<(), String> {
    let manager = state.skill_manager.lock().await;
    manager.cancel_skill_installation(&skill_id)
        .map_err(|e| e.to_string())
}

/// 卸载 skill
#[tauri::command]
pub async fn uninstall_skill(
    state: State<'_, AppState>,
    skill_id: String,
) -> Result<(), String> {
    let manager = state.skill_manager.lock().await;
    manager.uninstall_skill(&skill_id)
        .map_err(|e| e.to_string())
}

/// 卸载特定路径的技能
#[tauri::command]
pub async fn uninstall_skill_path(
    state: State<'_, AppState>,
    skill_id: String,
    path: String,
) -> Result<(), String> {
    let manager = state.skill_manager.lock().await;
    manager.uninstall_skill_path(&skill_id, &path)
        .map_err(|e| e.to_string())
}

/// 删除 skill 记录
#[tauri::command]
pub async fn delete_skill(
    state: State<'_, AppState>,
    skill_id: String,
) -> Result<(), String> {
    state.db.delete_skill(&skill_id)
        .map_err(|e| e.to_string())
}

/// 扫描本地技能目录并导入未追踪的技能
#[tauri::command]
pub async fn scan_local_skills(
    state: State<'_, AppState>,
) -> Result<Vec<Skill>, String> {
    let manager = state.skill_manager.lock().await;
    manager.scan_local_skills()
        .map_err(|e| e.to_string())
}

/// 清理指定仓库的缓存
#[tauri::command]
pub async fn clear_repository_cache(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<(), String> {
    let repo = state.db.get_repository(&repo_id)
        .map_err(|e| e.to_string())?
        .ok_or("仓库不存在")?;

    if let Some(cache_path) = &repo.cache_path {
        let cache_path_buf = std::path::PathBuf::from(cache_path);

        // 验证缓存路径是否在预期的缓存目录中
        let expected_cache_base = dirs::cache_dir()
            .ok_or("无法获取缓存目录".to_string())?
            .join("agent-skills-guard")
            .join("repositories");

        // 删除整个仓库缓存目录（包括archive.zip和extracted/）
        if let Some(parent) = cache_path_buf.parent() {
            // 安全检查：确保路径在预期的缓存目录中
            if !parent.starts_with(&expected_cache_base) {
                return Err("缓存路径无效".to_string());
            }

            // 先清除数据库中的缓存信息
            state.db.clear_repository_cache_metadata(&repo_id)
                .map_err(|e| e.to_string())?;

            // 然后删除文件（即使失败也不影响数据库一致性）
            if parent.exists() {
                if let Err(e) = std::fs::remove_dir_all(parent) {
                    log::warn!("删除缓存目录失败，但数据库已清理: {:?}，错误: {}", parent, e);
                    // 不返回错误，因为数据库已经一致
                } else {
                    log::info!("已删除缓存目录: {:?}", parent);
                }
            }
        }
    }

    Ok(())
}

/// 刷新仓库缓存（清理后重新扫描）
#[tauri::command]
pub async fn refresh_repository_cache(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<Vec<Skill>, String> {
    // 先清理缓存
    clear_repository_cache(state.clone(), repo_id.clone()).await?;

    // 重新扫描（会自动下载新版本）
    scan_repository(state, repo_id).await
}

/// 一键清除所有仓库缓存（但保留仓库记录）
#[tauri::command]
pub async fn clear_all_repository_caches(
    state: State<'_, AppState>,
) -> Result<ClearAllCachesResult, String> {
    let repos = state.db.get_repositories()
        .map_err(|e| e.to_string())?;

    let mut cleared_count = 0;
    let mut failed_count = 0;
    let mut total_size_freed: u64 = 0;

    // 获取缓存基础目录
    let cache_base_dir = dirs::cache_dir()
        .ok_or("无法获取缓存目录".to_string())?
        .join("agent-skills-guard")
        .join("repositories");

    if !cache_base_dir.exists() {
        // 缓存目录不存在，无需清理
        return Ok(ClearAllCachesResult {
            total_repositories: repos.len(),
            cleared_count: 0,
            failed_count: 0,
            total_size_freed: 0,
        });
    }

    for repo in &repos {
        if let Some(cache_path) = &repo.cache_path {
            let cache_path_buf = std::path::PathBuf::from(cache_path);

            if let Some(parent) = cache_path_buf.parent() {
                // 安全检查：确保路径在预期的缓存目录中
                if !parent.starts_with(&cache_base_dir) {
                    log::warn!("跳过无效的缓存路径: {:?}", parent);
                    failed_count += 1;
                    continue;
                }

                // 计算目录大小（在删除前）
                if parent.exists() {
                    if let Ok(size) = dir_size(parent) {
                        total_size_freed += size;
                    }
                }

                // 清除数据库中的缓存信息
                if let Err(e) = state.db.clear_repository_cache_metadata(&repo.id) {
                    log::warn!("清除仓库 {} 的缓存元数据失败: {}", repo.name, e);
                    failed_count += 1;
                    continue;
                }

                // 删除文件
                if parent.exists() {
                    if let Err(e) = std::fs::remove_dir_all(parent) {
                        log::warn!("删除缓存目录失败: {:?}，错误: {}", parent, e);
                        failed_count += 1;
                    } else {
                        log::info!("已删除缓存目录: {:?}", parent);
                        cleared_count += 1;
                    }
                } else {
                    // 数据库中有记录但文件不存在，只清理元数据
                    cleared_count += 1;
                }
            }
        }
    }

    log::info!("清除所有缓存完成: 成功 {}, 失败 {}, 释放 {} 字节",
        cleared_count, failed_count, total_size_freed);

    Ok(ClearAllCachesResult {
        total_repositories: repos.len(),
        cleared_count,
        failed_count,
        total_size_freed,
    })
}

/// 获取缓存统计信息
#[tauri::command]
pub async fn get_cache_stats(
    state: State<'_, AppState>,
) -> Result<CacheStats, String> {
    let repos = state.db.get_repositories()
        .map_err(|e| e.to_string())?;

    let mut total_cached = 0;
    let mut total_size: u64 = 0;

    for repo in &repos {
        if let Some(cache_path) = &repo.cache_path {
            if let Some(parent) = std::path::PathBuf::from(cache_path).parent() {
                if parent.exists() {
                    total_cached += 1;

                    // 计算目录大小
                    if let Ok(size) = dir_size(parent) {
                        total_size += size;
                    }
                }
            }
        }
    }

    Ok(CacheStats {
        total_repositories: repos.len(),
        cached_repositories: total_cached,
        total_size_bytes: total_size,
    })
}

/// 计算目录大小
fn dir_size(path: &std::path::Path) -> Result<u64, std::io::Error> {
    use walkdir::WalkDir;

    let mut size = 0;

    for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            size += entry.metadata()?.len();
        }
    }

    Ok(size)
}

/// 缓存统计信息
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheStats {
    pub total_repositories: usize,
    pub cached_repositories: usize,
    pub total_size_bytes: u64,
}

/// 清除所有缓存的结果
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClearAllCachesResult {
    pub total_repositories: usize,
    pub cleared_count: usize,
    pub failed_count: usize,
    pub total_size_freed: u64,
}

/// 打开技能目录
#[tauri::command]
pub async fn open_skill_directory(local_path: String) -> Result<(), String> {
    use std::process::Command;

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&local_path)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&local_path)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&local_path)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }

    Ok(())
}

/// 获取默认的用户目录安装路径
#[tauri::command]
pub async fn get_default_install_path() -> Result<String, String> {
    let user_path = dirs::home_dir()
        .ok_or("无法获取用户主目录")?
        .join(".claude")
        .join("skills");

    Ok(user_path.to_string_lossy().to_string())
}

/// 打开文件夹选择器，让用户选择自定义安装路径
#[tauri::command]
pub async fn select_custom_install_path(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let folder_path = app.dialog()
        .file()
        .set_title("选择技能安装目录")
        .blocking_pick_folder();

    if let Some(file_path) = folder_path {
        // 转换为 PathBuf
        let path = std::path::PathBuf::from(file_path.to_string());

        // 验证路径可写
        let test_file = path.join(".write_test");
        match std::fs::write(&test_file, "test") {
            Ok(_) => {
                let _ = std::fs::remove_file(&test_file);
                Ok(Some(path.to_string_lossy().to_string()))
            }
            Err(_) => Err("选择的目录不可写，请检查权限".to_string())
        }
    } else {
        Ok(None)
    }
}

const FEATURED_REPOSITORIES_REMOTE_URL: &str =
    "https://raw.githubusercontent.com/tanaer/agent-skills-guard-pro/main/featured-repositories.yaml";
const DEFAULT_FEATURED_REPOSITORIES_YAML: &str = include_str!("../../../featured-repositories.yaml");

fn featured_repositories_cache_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    std::fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    Ok(app_dir.join("featured-repositories.yaml"))
}

/// 获取精选仓库列表
#[tauri::command]
pub async fn get_featured_repositories(app: tauri::AppHandle) -> Result<FeaturedRepositoriesConfig, String> {
    // 1) 优先读取 app_data_dir 下的缓存文件（支持在线刷新后持久化）
    let cache_path = featured_repositories_cache_path(&app)?;
    if let Ok(cached_yaml) = std::fs::read_to_string(&cache_path) {
        match serde_yaml::from_str::<FeaturedRepositoriesConfig>(&cached_yaml) {
            Ok(config) => return Ok(config),
            Err(e) => {
                log::warn!(
                    "精选仓库缓存文件解析失败，将回退到内置默认配置: {:?}, 错误: {}",
                    cache_path,
                    e
                );
            }
        }
    }

    // 2) 回退到编译期内置的默认 YAML（用于首次启动/离线/打包环境）
    serde_yaml::from_str::<FeaturedRepositoriesConfig>(DEFAULT_FEATURED_REPOSITORIES_YAML)
        .map_err(|e| format!("Failed to parse default featured repositories: {}", e))
}

/// 刷新精选仓库列表（从 GitHub 下载最新 YAML 并写入 app_data_dir 缓存）
#[tauri::command]
pub async fn refresh_featured_repositories(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<FeaturedRepositoriesConfig, String> {
    use std::io::Write;

    let yaml_content = state.http_client
        .get(FEATURED_REPOSITORIES_REMOTE_URL)
        .header(reqwest::header::USER_AGENT, "agent-skills-guard")
        .send()
        .await
        .map_err(|e| format!("Failed to download featured repositories: {}", e))?
        .error_for_status()
        .map_err(|e| format!("Failed to download featured repositories: {}", e))?
        .text()
        .await
        .map_err(|e| format!("Failed to read featured repositories content: {}", e))?;

    // 先校验解析成功，再落盘
    let config: FeaturedRepositoriesConfig = serde_yaml::from_str(&yaml_content)
        .map_err(|e| format!("Failed to parse downloaded featured repositories: {}", e))?;

    let cache_path = featured_repositories_cache_path(&app)?;
    let cache_dir = cache_path
        .parent()
        .ok_or_else(|| "Failed to get featured repositories cache directory".to_string())?;

    let mut tmp = tempfile::NamedTempFile::new_in(cache_dir)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;
    tmp.write_all(yaml_content.as_bytes())
        .map_err(|e| format!("Failed to write temp file: {}", e))?;
    tmp.flush()
        .map_err(|e| format!("Failed to flush temp file: {}", e))?;

    if cache_path.exists() {
        let _ = std::fs::remove_file(&cache_path);
    }
    tmp.persist(&cache_path)
        .map_err(|e| format!("Failed to persist featured repositories cache: {}", e))?;

    Ok(config)
}

/// 检查仓库是否已添加
#[tauri::command]
pub async fn is_repository_added(
    state: State<'_, AppState>,
    url: String,
) -> Result<bool, String> {
    let repos = state.db.get_repositories()
        .map_err(|e| e.to_string())?;

    Ok(repos.iter().any(|r| r.url == url))
}

/// 检查已安装技能的更新
/// 返回：Vec<(skill_id, latest_commit_sha)>
#[tauri::command]
pub async fn check_skills_updates(
    state: State<'_, AppState>,
) -> Result<Vec<(String, String)>, String> {
    let manager = state.skill_manager.lock().await;
    let installed_skills = manager.get_installed_skills()
        .map_err(|e| e.to_string())?;

    let mut updates = Vec::new();

    for skill in installed_skills {
        // 跳过本地技能
        if skill.repository_url == "local" {
            continue;
        }

        // 解析仓库 URL
        let (owner, repo) = match Repository::from_github_url(&skill.repository_url) {
            Ok(result) => result,
            Err(e) => {
                log::warn!("无法解析仓库 URL {}: {}", skill.repository_url, e);
                continue;
            }
        };

        // 检查更新
        match state.github
            .check_skill_update(
                &owner,
                &repo,
                &skill.file_path,
                skill.installed_commit_sha.as_deref(),
            )
            .await
        {
            Ok(Some(latest_sha)) => {
                log::info!("技能 {} 有更新可用: {}", skill.name, latest_sha);
                updates.push((skill.id.clone(), latest_sha));
            }
            Ok(None) => {
                log::debug!("技能 {} 无更新", skill.name);
            }
            Err(e) => {
                log::warn!("检查技能 {} 更新时出错: {}", skill.name, e);
            }
        }
    }

    log::info!("检查更新完成，发现 {} 个技能有更新", updates.len());
    Ok(updates)
}

/// 准备技能更新
#[tauri::command]
pub async fn prepare_skill_update(
    state: State<'_, AppState>,
    skill_id: String,
    locale: String,
) -> Result<(crate::models::security::SecurityReport, Vec<String>), String> {
    let manager = state.skill_manager.lock().await;
    manager.prepare_skill_update(&skill_id, &locale).await
        .map_err(|e| e.to_string())
}

/// 确认技能更新
#[tauri::command]
pub async fn confirm_skill_update(
    state: State<'_, AppState>,
    skill_id: String,
    force_overwrite: bool,
) -> Result<(), String> {
    let manager = state.skill_manager.lock().await;
    manager.confirm_skill_update(&skill_id, force_overwrite)
        .map_err(|e| e.to_string())
}

/// 取消技能更新
#[tauri::command]
pub async fn cancel_skill_update(
    state: State<'_, AppState>,
    skill_id: String,
) -> Result<(), String> {
    let manager = state.skill_manager.lock().await;
    manager.cancel_skill_update(&skill_id)
        .map_err(|e| e.to_string())
}

/// 检查并自动扫描未扫描的仓库（用于首次启动）
#[tauri::command]
pub async fn auto_scan_unscanned_repositories(
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    // 获取所有未扫描的仓库
    let unscanned_repos = state.db.get_unscanned_repositories()
        .map_err(|e| e.to_string())?;

    if unscanned_repos.is_empty() {
        log::info!("没有需要自动扫描的仓库");
        return Ok(vec![]);
    }

    log::info!("发现 {} 个未扫描的仓库，开始自动扫描...", unscanned_repos.len());

    let mut scanned_repos = Vec::new();

    // 逐个扫描仓库
    for repo_id in unscanned_repos {
        log::info!("自动扫描仓库: {}", repo_id);

        match scan_repository(state.clone(), repo_id.clone()).await {
            Ok(skills) => {
                log::info!("仓库 {} 扫描成功，发现 {} 个技能", repo_id, skills.len());
                scanned_repos.push(repo_id);
            }
            Err(e) => {
                log::warn!("仓库 {} 扫描失败: {}", repo_id, e);
                // 继续扫描下一个仓库，不中断整个流程
            }
        }
    }

    log::info!("自动扫描完成，成功扫描 {} 个仓库", scanned_repos.len());
    Ok(scanned_repos)
}

const PROXY_CONFIG_KEY: &str = "proxy_config";

/// 获取代理配置
#[tauri::command]
pub async fn get_proxy_config(
    state: State<'_, AppState>,
) -> Result<ProxyConfig, String> {
    let config_json = state.db.get_setting(PROXY_CONFIG_KEY)
        .map_err(|e| e.to_string())?;

    match config_json {
        Some(json) => {
            serde_json::from_str(&json)
                .map_err(|e| format!("解析代理配置失败: {}", e))
        }
        None => Ok(ProxyConfig::default())
    }
}

/// 保存代理配置
#[tauri::command]
pub async fn save_proxy_config(
    state: State<'_, AppState>,
    config: ProxyConfig,
) -> Result<(), String> {
    let config_json = serde_json::to_string(&config)
        .map_err(|e| format!("序列化代理配置失败: {}", e))?;

    state.db.set_setting(PROXY_CONFIG_KEY, &config_json)
        .map_err(|e| e.to_string())?;

    log::info!("代理配置已保存: enabled={}, host={}, port={}",
        config.enabled, config.host, config.port);

    Ok(())
}

/// 测试代理连接
#[tauri::command]
pub async fn test_proxy(
    config: ProxyConfig,
) -> Result<(), String> {
    ProxyService::test_proxy(&config)
        .await
        .map_err(|e| e.to_string())
}

/// 翻译文本（使用 Google Translate 免费接口）
#[tauri::command]
pub async fn translate_text(
    state: State<'_, AppState>,
    text: String,
    target_lang: String,
    source_lang: Option<String>,
) -> Result<String, String> {
    use reqwest::header::USER_AGENT;

    if text.trim().is_empty() {
        return Ok(text);
    }

    let source = source_lang.unwrap_or_else(|| "auto".to_string());
    
    // Google Translate 免费公共接口
    let url = format!(
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl={}&tl={}&dt=t&q={}",
        source,
        target_lang,
        urlencoding::encode(&text)
    );

    let response = state.http_client
        .get(&url)
        .header(USER_AGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .send()
        .await
        .map_err(|e| format!("翻译请求失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("翻译 API 返回错误: {}", response.status()));
    }

    let body = response
        .text()
        .await
        .map_err(|e| format!("读取翻译响应失败: {}", e))?;

    // 解析 Google Translate 响应
    // 格式: [[["translated text","original text",null,null,10]],null,"en",...]
    let parsed: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| format!("解析翻译响应失败: {}", e))?;

    // 提取翻译文本
    let mut translated = String::new();
    if let Some(outer_array) = parsed.as_array() {
        if let Some(first) = outer_array.first() {
            if let Some(sentences) = first.as_array() {
                for sentence in sentences {
                    if let Some(arr) = sentence.as_array() {
                        if let Some(text_val) = arr.first() {
                            if let Some(text_str) = text_val.as_str() {
                                translated.push_str(text_str);
                            }
                        }
                    }
                }
            }
        }
    }

    if translated.is_empty() {
        return Err("无法解析翻译结果".to_string());
    }

    log::debug!("翻译成功: {} -> {}", &text[..text.len().min(50)], &translated[..translated.len().min(50)]);
    Ok(translated)
}

// ==================== 工具管理命令 ====================

use crate::models::{AiTool, FileNode, get_all_supported_tools};

/// 获取所有支持的 AI 工具列表（含安装状态检测）
#[tauri::command]
pub async fn get_supported_tools() -> Result<Vec<AiTool>, String> {
    Ok(get_all_supported_tools())
}

/// 获取指定工具的技能目录树结构
#[tauri::command]
pub async fn get_tool_skills_tree(tool_id: String) -> Result<Vec<FileNode>, String> {
    let tools = get_all_supported_tools();
    let tool = tools
        .iter()
        .find(|t| t.id == tool_id)
        .ok_or_else(|| format!("未找到工具: {}", tool_id))?;

    let skills_path = tool.skills_path();
    
    if !skills_path.exists() {
        return Ok(vec![]);
    }

    fn build_tree(path: &std::path::Path) -> Result<Vec<FileNode>, String> {
        let mut nodes = Vec::new();
        
        let entries = std::fs::read_dir(path)
            .map_err(|e| format!("无法读取目录: {}", e))?;
        
        for entry in entries {
            let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
            let file_path = entry.path();
            let file_name = entry.file_name().to_string_lossy().to_string();
            
            // 跳过隐藏文件和目录
            if file_name.starts_with('.') {
                continue;
            }
            
            let is_dir = file_path.is_dir();
            let children = if is_dir {
                Some(build_tree(&file_path)?)
            } else {
                None
            };
            
            nodes.push(FileNode {
                name: file_name,
                path: file_path.to_string_lossy().to_string(),
                is_dir,
                children,
            });
        }
        
        // 排序：目录优先，然后按名称排序
        nodes.sort_by(|a, b| {
            match (a.is_dir, b.is_dir) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            }
        });
        
        Ok(nodes)
    }

    build_tree(&skills_path)
}

/// 读取指定技能文件内容
#[tauri::command]
pub async fn read_skill_file(file_path: String) -> Result<String, String> {
    let path = std::path::Path::new(&file_path);
    
    if !path.exists() {
        return Err("文件不存在".to_string());
    }
    
    if !path.is_file() {
        return Err("路径不是文件".to_string());
    }
    
    std::fs::read_to_string(path)
        .map_err(|e| format!("读取文件失败: {}", e))
}

/// 打开工具的技能文件夹
#[tauri::command]
pub async fn open_tool_folder(tool_id: String) -> Result<(), String> {
    let tools = get_all_supported_tools();
    let tool = tools
        .iter()
        .find(|t| t.id == tool_id)
        .ok_or_else(|| format!("未找到工具: {}", tool_id))?;

    let folder_path = tool.skills_path();
    
    // 如果技能目录不存在，尝试打开基础目录
    let path_to_open = if folder_path.exists() {
        folder_path
    } else if tool.base_path.exists() {
        tool.base_path.clone()
    } else {
        return Err(format!("工具目录不存在: {}", tool.base_path.display()));
    };

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path_to_open)
            .spawn()
            .map_err(|e| format!("打开文件夹失败: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path_to_open)
            .spawn()
            .map_err(|e| format!("打开文件夹失败: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path_to_open)
            .spawn()
            .map_err(|e| format!("打开文件夹失败: {}", e))?;
    }

    Ok(())
}

/// 工具安装路径信息
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ToolInstallPath {
    /// 工具 ID
    pub tool_id: String,
    /// 工具名称
    pub tool_name: String,
    /// 技能安装路径
    pub skills_path: String,
    /// 是否为默认选项
    pub is_default: bool,
}

/// 获取所有已安装工具的技能安装路径
#[tauri::command]
pub async fn get_installed_tool_paths() -> Result<Vec<ToolInstallPath>, String> {
    let tools = get_all_supported_tools();
    let mut paths: Vec<ToolInstallPath> = Vec::new();
    let mut is_first = true;

    for tool in tools {
        if tool.is_installed {
            let skills_path = tool.skills_path();
            paths.push(ToolInstallPath {
                tool_id: tool.id.clone(),
                tool_name: tool.name.clone(),
                skills_path: skills_path.to_string_lossy().to_string(),
                is_default: is_first,
            });
            is_first = false;
        }
    }

    Ok(paths)
}
