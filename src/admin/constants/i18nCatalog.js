/**
 * 前台可选语言（与顶栏、localStorage 偏好 code 一致）
 */
export const FRONT_LOCALE_CATALOG = [
  { code: 'zh-CN', label: '简体中文', short: '简中', icon: '🇨🇳' },
  { code: 'zh-TW', label: '繁體中文', short: '繁中', icon: '🇨🇳' },
  { code: 'en', label: 'English', short: 'EN', icon: '🇺🇸' },
  { code: 'ja', label: '日本語', short: 'JA', icon: '🇯🇵' },
  { code: 'ko', label: '한국어', short: 'KO', icon: '🇰🇷' }
]

/** 国际电话区号（后台勾选「允许的区号」） */
export const PHONE_DIAL_PRESETS = [
  { dial: '+86', label: '中国 +86', icon: '🇨🇳' },
  { dial: '+852', label: '中国香港 +852', icon: '🇭🇰' },
  { dial: '+853', label: '中国澳门 +853', icon: '🇲🇴' },
  { dial: '+886', label: '中国台湾 +886', icon: '🇨🇳' },
  { dial: '+65', label: '新加坡 +65', icon: '🇸🇬' },
  { dial: '+81', label: '日本 +81', icon: '🇯🇵' },
  { dial: '+82', label: '韩国 +82', icon: '🇰🇷' },
  { dial: '+1', label: '美国/加拿大 +1', icon: '🇺🇸' },
  { dial: '+44', label: '英国 +44', icon: '🇬🇧' },
  { dial: '+61', label: '澳大利亚 +61', icon: '🇦🇺' },
  { dial: '+971', label: '阿联酋 +971', icon: '🇦🇪' }
]

export const DEFAULT_I18N_BLOCK = {
  /** 前台启用的语言 code 列表（languageSettingsEnabled 为 true 时生效） */
  enabledLocales: ['zh-CN', 'en'],
  /** 默认语言 */
  defaultLocale: 'zh-CN',
  /** 顶栏是否显示语言切换 */
  languageSwitcherEnabled: true,
  /**
   * 语言在前台列表中的排序权重，数值越大越靠前；未配置的语言按内置目录顺序从大到小给默认值
   * @type {Record<string, number>}
   */
  localeSortOrder: {},
  /** 语言显示图标/名称覆盖 */
  localeMetaOverrides: {},
  /** 管理台上传的全量基础语言文件 */
  translationBase: null,
  /** 按语言生成或上传的语言文件 */
  translationFiles: {}
}
