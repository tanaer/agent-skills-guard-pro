fn main() {
    // 初始化 i18n（必须在 tauri_build 之前）
    rust_i18n::i18n!("locales");

    tauri_build::build()
}
