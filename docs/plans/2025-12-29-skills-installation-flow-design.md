# Skills Installation Flow with Auto-Scan & Security Enhancement

**Date**: 2025-12-29
**Author**: Bruce
**Status**: Approved

## Overview

This design enhances the Agent Skills Guard application with automatic skill discovery, comprehensive security scanning using patterns from `patterns.py`, local skills import, and comprehensive loading feedback for all async operations.

## Design Approach

**Selected Approach**: Progressive Enhancement (Approach A)

Build on existing Tauri + React architecture by adding automatic triggers and enhancing scanning capabilities. This approach minimizes refactoring while delivering all requirements incrementally.

## Architecture & Data Flow

### Repository Addition Flow

1. User adds GitHub URL → Save to database → **Auto-trigger scan** (new)
2. Scan fetches repository file tree → Discover SKILL.md files → Download each skill
3. For each skill: Download content → **Run enhanced security scan** → Save metadata + security score
4. Update UI with loading states throughout

### App Startup Flow (new)

1. App launches → Check `~/.claude/skills/` directory
2. Discover any existing SKILL.md files not in database
3. Import each one → Scan for security → Mark as "installed" in database
4. Display in skills list with proper security scores

### Installation Flow (enhanced)

1. User clicks install → Verify security score ≥ 50
2. Download skill (may already be cached from scan)
3. Write to `~/.claude/skills/{skill-name}/SKILL.md`
4. Update database with installed status and local path

All async operations (repo scan, security scan, local import) will show loading spinners with descriptive status messages.

## Component Details

### 1. Auto-Scan on Repository Addition

**Frontend Changes** (`src/hooks/useRepositories.ts`):

Modify `useAddRepository` to automatically trigger scanning after successful addition:

```typescript
export function useAddRepository() {
  const queryClient = useQueryClient();
  const scanMutation = useScanRepository();

  return useMutation({
    mutationFn: ({ url, name }: { url: string; name: string }) =>
      api.addRepository(url, name),
    onSuccess: (repoId) => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      // Auto-trigger scan immediately
      scanMutation.mutate(repoId);
    },
  });
}
```

**UI Feedback** (`src/components/RepositoriesPage.tsx`):

Show loading state during add + scan:
- "Adding repository..." (during save)
- "Scanning for skills..." (during auto-scan)
- Toast notification: "Found X skills in repository"

**Backend Enhancement** (`src-tauri/src/services/github.rs`):

- Use GitHub Trees API to recursively discover all `**/SKILL.md` files in one request
- Avoid rate limiting by batching requests
- Download and scan up to 5 skills concurrently to speed up discovery

### 2. Enhanced Security Rules (Porting patterns.py to Rust)

**New Rules Structure** (`src-tauri/src/security/rules.rs`):

Port all 25+ patterns from `patterns.py` into Rust:

```rust
pub struct PatternRule {
    id: &'static str,
    name: &'static str,
    pattern: Regex,
    severity: Severity,
    category: Category,
    weight: i32,
    description: &'static str,
    hard_trigger: bool, // Critical patterns that block installation
}

pub enum Category {
    Destructive,      // rm -rf /, dd, mkfs
    RemoteExec,       // curl|sh, wget|sh
    CmdInjection,     // eval(), exec(), os.system()
    Network,          // curl POST, netcat, urllib
    Privilege,        // sudo, chmod 777, sudoers
    Secrets,          // API keys, passwords, AWS keys
    Persistence,      // crontab, SSH keys
}
```

**Pattern Examples**:
- `RM_RF_ROOT`: `r'rm\s+(-[a-zA-Z]*)*\s*-r[a-zA-Z]*\s+(-[a-zA-Z]*\s+)*/($|\s|;|\|)'`
- `CURL_PIPE_SH`: `r'curl\s+[^|]*\|\s*(ba)?sh'`
- `PRIVATE_KEY`: `r'-----BEGIN\s+(RSA|OPENSSH|EC|DSA)?\s*PRIVATE KEY-----'`

**Hard Triggers**: Patterns with `hard_trigger: true` will completely block installation regardless of score.

### 3. Local Skills Discovery on Startup

**App Initialization** (`src-tauri/src/main.rs`):

```rust
#[tauri::command]
async fn scan_local_skills(
    db: State<'_, Arc<Database>>,
    scanner: State<'_, SecurityScanner>,
) -> Result<Vec<Skill>, String> {
    let skills_dir = PathBuf::from(home_dir())
        .join(".claude")
        .join("skills");

    if !skills_dir.exists() {
        return Ok(vec![]);
    }

    // Find all SKILL.md files recursively
    // For each skill: parse metadata, scan security, save to DB
    // Mark as installed=true with local_path set
}
```

**Frontend Integration** (`src/App.tsx`):

```typescript
useEffect(() => {
  const initLocalSkills = async () => {
    setLocalScanLoading(true);
    try {
      await api.scanLocalSkills();
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    } finally {
      setLocalScanLoading(false);
    }
  };
  initLocalSkills();
}, []);
```

**UI Feedback**: Show notification banner: "Importing local skills..." with auto-dismiss on completion.

**De-duplication**: Check skill checksum to avoid duplicating skills already tracked from repositories.

### 4. Loading States & User Feedback

**Comprehensive Loading Coverage**:

**Repository Operations**:
- Add repository: "Adding..." → "Scanning repository..." → Toast: "Found X skills"
- Manual scan: Button disabled with spinner, text: "Scanning..."
- Delete repository: Confirmation → "Deleting..." state

**Skills Operations**:
- Install skill: "Downloading..." → "Analyzing security..." → "Installing..." → Success toast
- Uninstall skill: "Uninstalling..." → Success toast
- Initial load: Skeleton loader while fetching

**Startup Operations**:
- Local skills scan: Non-blocking banner "🔍 Scanning local skills..."

**Implementation Pattern**:

```typescript
const { isPending } = mutation;

<button disabled={isPending}>
  {isPending ? <Spinner /> : <Icon />}
  {isPending ? "Installing..." : "Install"}
</button>
```

### 5. Error Handling & Edge Cases

**Network Failures**:
- Rate limiting: "Rate limit exceeded. Try again in X minutes"
- Repository not found: "Cannot access repository. Check URL"
- Download failures: Retry 3 times with exponential backoff

**Security Scan Failures**:
- Hard trigger blocking: Modal dialog "⛔ Critical security issue detected. Installation blocked."
- Low score: Disable install button with tooltip "Security score too low (X/100)"
- Scan errors: Default to score=0 and block (fail-safe)

**Local Skills Import**:
- Corrupted files: Skip with warning log
- Missing frontmatter: Import with placeholder metadata
- Duplicates: Match by checksum, update installed status

**Database Errors**:
- SQLite issues: Error dialog with recovery instructions
- Save failures: Rollback and show retry option

## Testing Strategy

**Security Scanner Testing**:
- Test all 25+ patterns against known malicious samples
- Verify hard triggers block installation correctly
- Validate score calculation matches Python implementation
- Test against legitimate skills for false positive rate

**Integration Testing**:
- Auto-scan flow with mocked GitHub API
- Local import with test skills in temp directory
- Full install flow end-to-end

**UI Testing**:
- Verify loading states appear correctly
- Test error toast display
- Edge cases: empty repos, 100+ skills, corrupted files

**Manual Testing Checklist**:
1. Add repository → verify auto-scan → check loading feedback
2. Review skills → verify security badges
3. Install high-risk skill → verify blocked
4. Install safe skill → verify success
5. Restart app → verify local skills imported

## Implementation Files

**Frontend**:
- `src/hooks/useRepositories.ts` - Auto-scan trigger
- `src/components/RepositoriesPage.tsx` - Loading UI
- `src/components/SkillsPage.tsx` - Security badges
- `src/App.tsx` - Startup local scan

**Backend**:
- `src-tauri/src/security/rules.rs` - Enhanced patterns
- `src-tauri/src/security/scanner.rs` - Pattern matching
- `src-tauri/src/services/github.rs` - Tree API usage
- `src-tauri/src/services/skill_manager.rs` - Local import
- `src-tauri/src/main.rs` - Startup command

## Success Criteria

1. ✅ Adding a repository automatically scans for skills with loading feedback
2. ✅ All 25+ security patterns from patterns.py correctly detect threats
3. ✅ App startup imports and scans local `~/.claude/skills/` directory
4. ✅ Every async operation shows clear loading state
5. ✅ High-risk skills (score < 50 or hard triggers) are blocked from installation
6. ✅ Users see security scores before deciding to install

## Future Enhancements

- Progress bars for repositories with 50+ skills
- Background job queue for concurrent scanning
- Security rule updates without app recompilation
- Skill version tracking and update notifications
