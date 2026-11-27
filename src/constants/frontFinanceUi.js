/**
 * 前台金融三大列表页（流动性 / 借贷 / AI 量化）共用视觉与交互 token。
 * 在对应 .vue 中 `import { FINANCE_FX as fx } from '...'` 后通过 ` :class="fx.xxx" ` 使用。
 */

export const FINANCE_FX = {
  pageRoot: 'min-h-[calc(100dvh-3.5rem)] bg-[#050505] pb-8 lg:pb-10',
  header: 'relative overflow-hidden border-b border-white/[0.06] bg-[#050505]',
  headerGlowL:
    'absolute -left-1/4 top-0 h-[20rem] w-[20rem] rounded-full bg-lime-400/[0.07] blur-[100px] sm:h-[26rem] sm:w-[26rem]',
  headerGlowR:
    'absolute -right-1/4 bottom-0 h-[16rem] w-[16rem] rounded-full bg-lime-400/[0.05] blur-[90px] sm:h-[22rem] sm:w-[22rem]',
  headerGrad:
    'absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,#050505_55%,#050505_100%)]',
  headerInner:
    'relative mx-auto max-w-7xl px-4 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-8 lg:px-10 lg:pb-10 lg:pt-10',
  breadcrumbNav: 'text-xs text-white/40 sm:text-sm',

  kicker:
    'inline-flex items-center gap-2 rounded-full border border-lime-400/25 bg-lime-400/[0.08] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-lime-200/95 sm:text-[11px] sm:tracking-[0.3em]',
  h1: 'mt-2 text-3xl font-bold tracking-tight text-white sm:mt-3 sm:text-4xl md:text-5xl lg:text-[3.25rem] lg:leading-tight',

  heroSegmentWrap:
    'inline-flex w-full max-w-full rounded-xl border border-white/[0.07] bg-black/40 p-1 shadow-inner shadow-black/20 sm:w-fit',
  heroTab:
    'min-h-[2.75rem] min-w-0 flex-1 rounded-lg px-3 py-2.5 text-center text-sm font-semibold tracking-tight transition focus:outline-none sm:min-h-[3rem] sm:flex-none sm:px-6 sm:py-2.5 sm:text-[15px] md:text-base',
  heroTabOn: 'bg-white/[0.1] text-lime-200 shadow-sm',
  heroTabOff: 'text-white/45 hover:text-white/75',

  mainWrap: 'mx-auto max-w-7xl px-4 py-5 sm:px-8 sm:py-8 lg:px-10 lg:py-10',

  filterRailWrap: 'flex w-full min-w-0 flex-wrap items-center gap-2',
  filterMobileLabel:
    'w-full text-[10px] font-semibold uppercase tracking-wider text-white/35 sm:hidden',
  filterChipWrap:
    'flex w-full min-w-0 max-w-full flex-nowrap gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-black/35 p-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-x-visible [&::-webkit-scrollbar]:hidden',
  filterChip:
    'min-h-[2.5rem] shrink-0 touch-manipulation rounded-lg px-3 py-2 text-xs font-semibold transition focus:outline-none sm:min-h-0 sm:px-4 sm:text-sm',
  filterChipOn: 'bg-white/[0.12] text-white shadow-sm',
  filterChipOff: 'text-white/45 hover:bg-white/[0.05] hover:text-white/75',

  /** 产品 / 市场主表外层（带与币种 Tab 的垂直间距） */
  tableWrapMarket:
    'mt-5 overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.025] sm:mt-6 sm:rounded-2xl lg:mt-6 max-md:-mx-1 max-md:rounded-lg max-md:border-white/[0.06]',
  /** 主表容器（无顶距，用于标题下方的表格区域） */
  tableWrapMarketNoTop:
    'overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.025] sm:rounded-2xl max-md:-mx-1 max-md:rounded-lg max-md:border-white/[0.06]',
  tableHeadRow:
    'border-b border-white/[0.08] text-[10px] font-semibold uppercase tracking-wide text-white/40 sm:text-[11px]',
  tableBodyText: 'text-xs text-white/85 sm:text-sm',

  /** 主按钮（实心青柠） */
  btnPrimary:
    'inline-flex items-center justify-center rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-[#0b0e11] shadow-sm transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40',
  /** 列表主操作（立即挖矿 / 立即租用）：紧凑统一盒，桌面固定高度避免行间视觉参差 */
  btnPrimaryBlock:
    'inline-flex w-full min-h-[2.35rem] touch-manipulation items-center justify-center rounded-lg bg-lime-400 px-3 py-1.5 text-xs font-semibold leading-none text-[#0b0e11] shadow-sm transition hover:bg-lime-300 max-md:w-full md:h-9 md:min-h-0 md:w-auto md:px-3.5 md:py-0',
  /** 表格行 / 弹层内主确认（小尺寸；与 btnTableAction 同盒高，仅填充样式不同） */
  btnPrimarySm:
    'inline-flex min-h-[2.5rem] touch-manipulation items-center justify-center rounded-lg bg-lime-400 px-3.5 py-2 text-xs font-semibold leading-none text-[#0b0e11] transition hover:bg-lime-300 sm:min-h-0',
  /** 线框主操作（青柠边） */
  btnSecondary:
    'inline-flex items-center justify-center rounded-lg border border-lime-400/45 px-4 py-2.5 text-sm font-semibold text-lime-200 transition hover:bg-lime-400/10 touch-manipulation',
  btnSecondaryBlock:
    'inline-flex w-full min-h-[2.35rem] touch-manipulation items-center justify-center rounded-lg border border-lime-400/45 px-3 py-1.5 text-xs font-semibold leading-none text-lime-200 transition hover:bg-lime-400/10 max-md:w-full md:h-9 md:min-h-0 md:w-auto md:px-3.5 md:py-0',
  /** 次级线框（灰边，如「查看说明」） */
  btnMutedOutline:
    'inline-flex w-full min-h-[2.35rem] touch-manipulation items-center justify-center rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium leading-none text-white/70 transition hover:bg-white/10 hover:text-white/85 max-md:w-full md:h-9 md:min-h-0 md:w-auto md:px-3.5 md:py-0',
  /** 表格内 / 弹层内紧凑操作（还款、赎回、提前赎回；与 btnPrimarySm 同 padding，避免操作列高低不一） */
  btnTableAction:
    'inline-flex min-h-[2.5rem] touch-manipulation items-center justify-center rounded-lg border border-lime-400/45 px-3.5 py-2 text-xs font-semibold leading-none text-lime-200 transition hover:bg-lime-400/10 sm:min-h-0',
  /** 与 btnPrimaryBlock 同盒（全宽手机 + md:h-9） */
  btnTableActionBlock:
    'inline-flex w-full min-h-[2.35rem] touch-manipulation items-center justify-center rounded-lg border border-lime-400/45 px-3 py-1.5 text-xs font-semibold leading-none text-lime-200 transition hover:bg-lime-400/10 max-md:w-full md:h-9 md:min-h-0 md:w-auto md:px-3.5 md:py-0',

  btnGhost:
    'rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/10',
  /** 表格行内次要操作（与 btnTableAction 同盒） */
  btnInlineNeutral:
    'inline-flex min-h-[2.5rem] touch-manipulation items-center justify-center rounded-lg border border-white/25 px-3.5 py-2 text-xs font-semibold leading-none text-white/85 transition hover:bg-white/[0.06] sm:min-h-0',
  btnDisabledHint:
    'inline-flex min-h-[2.35rem] items-center justify-center rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium leading-none text-white/40 md:h-9 md:min-h-0 md:px-3.5 md:py-0',

  /** 表单输入 */
  input:
    'min-w-0 rounded-lg border border-white/[0.12] bg-black/40 px-3 py-2.5 text-[15px] text-white placeholder:text-white/30 focus:outline-none',
  inputFlex:
    'min-w-0 flex-1 rounded-lg border border-white/[0.12] bg-black/40 px-3 py-2.5 text-[15px] text-white placeholder:text-white/30 focus:outline-none sm:px-4 sm:py-3',
  /** 表单旁「全部」等小号线框 */
  inputSideBtn:
    'shrink-0 rounded-lg border border-lime-400/45 px-3 py-2.5 text-xs font-semibold text-lime-200 transition hover:bg-lime-400/10 sm:px-4 sm:text-sm',

  /** 记录区卡片 */
  panelRecords: 'overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] sm:rounded-2xl',
  panelRecordsHeader:
    'flex flex-col gap-2 border-b border-white/[0.08] bg-black/30 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3 md:px-5',
  sectionKicker: 'text-[10px] font-semibold uppercase tracking-wide text-white/40 sm:text-[11px]',

  recordTablist2:
    'grid w-full grid-cols-2 gap-0 rounded-lg border border-white/[0.06] bg-black/40 p-0.5 sm:flex sm:w-auto sm:max-w-full sm:shrink-0 sm:overflow-x-auto sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  recordTablist3:
    'grid w-full grid-cols-3 gap-0 rounded-lg border border-white/[0.06] bg-black/40 p-0.5 sm:flex sm:w-auto sm:max-w-full sm:shrink-0 sm:overflow-x-auto sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  recordTablist4:
    'grid w-full grid-cols-4 gap-0 rounded-lg border border-white/[0.06] bg-black/40 p-0.5 sm:flex sm:w-auto sm:max-w-full sm:shrink-0 sm:overflow-x-auto sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  recordTab:
    'min-h-[2.5rem] rounded-md border-b-2 border-transparent px-1 py-2 text-center text-xs font-semibold transition focus:outline-none sm:min-h-0 sm:rounded-none sm:border-transparent sm:px-4 sm:pb-2.5 sm:text-left sm:text-sm sm:text-[15px]',
  recordTabOn:
    'border-b-2 border-lime-400 text-white max-sm:border-transparent max-sm:bg-white/[0.12] max-sm:text-lime-200 sm:bg-transparent',
  recordTabOff: 'border-b-2 border-transparent text-white/45 hover:text-white/75 sm:text-white/45',

  statCard: 'rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-3.5 sm:px-5 sm:py-4',
  statCardLabel: 'text-[11px] font-medium text-white/40',

  /** 不可操作说明块（如不可提前赎回） */
  hintBlock:
    'rounded-lg border border-white/[0.08] bg-black/30 py-2.5 text-center text-sm text-white/40',

  /** 表单内文字链（全额等） */
  linkAccent: 'text-xs font-semibold text-lime-300/95 underline-offset-2 hover:underline'
}
