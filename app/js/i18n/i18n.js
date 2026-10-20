// ===== MAL 多语言系统 =====
const MAL_I18N = {
  'zh-CN': {
    nav_home: '首页', nav_versions: '版本', nav_mods: '模组', nav_ai: 'AI', nav_settings: '设置',
    home_subtitle: '下一代 Minecraft 启动器 · 全版本支持 · AI 驱动',
    current_version: '当前版本', launch_game: '启动游戏',
    login: '登录', microsoft_login: '微软正版登录',
    offline_placeholder: '离线账号用户名（3-16位字母数字_）',
    current_account: '当前账号：',
    versions_title: '版本管理', versions_desc: '支持所有 Minecraft 版本',
    mods_title: '模组中心', mods_desc: 'Modrinth + CurseForge 双库支持',
    ai_title: 'AI 管理中心', ai_desc: '由 MAL 服务端 AI 自动管理更新与维护',
    settings_title: '设置', settings_desc: '服务端与个性化配置',
    stat_versions: '游戏版本', stat_mods: '官方模组', stat_ai: '智能助手',
    language: '语言',
  },
  'zh-TW': {
    nav_home: '首頁', nav_versions: '版本', nav_mods: '模組', nav_ai: 'AI', nav_settings: '設定',
    home_subtitle: '下一代 Minecraft 啟動器 · 全版本支援 · AI 驅動',
    current_version: '目前版本', launch_game: '啟動遊戲',
    login: '登入', microsoft_login: '微軟正版登入',
    offline_placeholder: '離線帳號使用者名稱（3-16位字母數字_）',
    current_account: '目前帳號：',
    versions_title: '版本管理', versions_desc: '支援所有 Minecraft 版本',
    mods_title: '模組中心', mods_desc: 'Modrinth + CurseForge 雙庫支援',
    ai_title: 'AI 管理中心', ai_desc: '由 MAL 服務端 AI 自動管理更新與維護',
    settings_title: '設定', settings_desc: '服務端與個人化配置',
    stat_versions: '遊戲版本', stat_mods: '官方模組', stat_ai: '智慧助手',
    language: '語言',
  },
  'en': {
    nav_home: 'Home', nav_versions: 'Versions', nav_mods: 'Mods', nav_ai: 'AI', nav_settings: 'Settings',
    home_subtitle: 'Next-gen Minecraft Launcher · All versions · AI-powered',
    current_version: 'Version', launch_game: 'Play',
    login: 'Login', microsoft_login: 'Sign in with Microsoft',
    offline_placeholder: 'Offline username (3-16 letters/digits/_)',
    current_account: 'Account: ',
    versions_title: 'Versions', versions_desc: 'All Minecraft versions supported',
    mods_title: 'Mod Center', mods_desc: 'Modrinth + CurseForge',
    ai_title: 'AI Center', ai_desc: 'Managed automatically by MAL server AI',
    settings_title: 'Settings', settings_desc: 'Server & personalization',
    stat_versions: 'Versions', stat_mods: 'Official Mods', stat_ai: 'AI Assistant',
    language: 'Language',
  }
};

class I18n {
  constructor() {
    this.lang = this.detectLang();
  }
  detectLang() {
    let saved = localStorage.getItem('mal_language');
    if (saved && MAL_I18N[saved]) return saved;
    const l = (navigator.language || 'zh-CN').toLowerCase();
    if (l.startsWith('zh')) {
      if (['tw','hk','mo','hant'].some(c => l.includes(c))) return 'zh-TW';
      return 'zh-CN';
    }
    return 'en';
  }
  setLang(lang) {
    if (!MAL_I18N[lang]) return;
    this.lang = lang;
    localStorage.setItem('mal_language', lang);
    this.apply();
  }
  t(key) {
    return (MAL_I18N[this.lang] && MAL_I18N[this.lang][key]) ||
           (MAL_I18N['zh-CN'][key]) || key;
  }
  apply(root) {
    (root || document).querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.getAttribute('data-i18n'));
    });
    (root || document).querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.setAttribute('placeholder', this.t(el.getAttribute('data-i18n-ph')));
    });
  }
}

let i18n = new I18n();
