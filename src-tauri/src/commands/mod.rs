use crate::models::{Repository, Skill};
use crate::services::{Database, GitHubService, SkillManager};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

pub struct AppState {
    pub db: Arc<Database>,
    pub skill_manager: Arc<Mutex<SkillManager>>,
    pub github: Arc<GitHubService>,
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

/// 删除仓库
#[tauri::command]
pub async fn delete_repository(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<(), String> {
    state.db.delete_repository(&repo_id)
        .map_err(|e| e.to_string())
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

    let skills = if let Some(cache_path) = &repo.cache_path {
        // 使用缓存扫描(0次API请求)
        log::info!("使用本地缓存扫描仓库: {}", repo.name);

        let cache_path_buf = std::path::PathBuf::from(cache_path);
        if cache_path_buf.exists() && cache_path_buf.is_dir() {
            state.github.scan_cached_repository(&cache_path_buf, &repo.url, repo.scan_subdirs)
                .map_err(|e| format!("扫描缓存失败: {}", e))?
        } else {
            // 缓存路径不存在，重新下载
            log::warn!("缓存路径不存在，重新下载: {:?}", cache_path_buf);
            let extract_dir = state.github
                .download_repository_archive(&owner, &repo_name, &cache_base_dir)
                .await
                .map_err(|e| format!("下载仓库压缩包失败: {}", e))?;

            // 更新数据库缓存信息
            state.db.update_repository_cache(
                &repo_id,
                &extract_dir.to_string_lossy(),
                Utc::now(),
                None,  // cached_commit_sha - Task 4修复后需要此参数
            ).map_err(|e| e.to_string())?;

            state.github.scan_cached_repository(&extract_dir, &repo.url, repo.scan_subdirs)
                .map_err(|e| format!("扫描缓存失败: {}", e))?
        }
    } else {
        // 首次扫描: 下载压缩包并缓存(1次API请求)
        log::info!("首次扫描，下载仓库压缩包: {}", repo.name);

        let extract_dir = state.github
            .download_repository_archive(&owner, &repo_name, &cache_base_dir)
            .await
            .map_err(|e| format!("下载仓库压缩包失败: {}", e))?;

        // 更新数据库缓存信息
        state.db.update_repository_cache(
            &repo_id,
            &extract_dir.to_string_lossy(),
            Utc::now(),
            None,  // cached_commit_sha - Task 4修复后需要此参数
        ).map_err(|e| e.to_string())?;

        // 扫描本地缓存
        state.github.scan_cached_repository(&extract_dir, &repo.url, repo.scan_subdirs)
            .map_err(|e| format!("扫描缓存失败: {}", e))?
    };

    // 保存到数据库
    for skill in &skills {
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
) -> Result<(), String> {
    let manager = state.skill_manager.lock().await;
    manager.install_skill(&skill_id).await
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
