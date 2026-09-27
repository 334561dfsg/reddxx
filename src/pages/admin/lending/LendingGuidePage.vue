<script setup>
import { ref } from 'vue'

const activeTab = ref('introduction')

const tabs = [
  { id: 'introduction', label: '产品介绍', icon: '📖' },
  { id: 'terminology', label: '名词解释', icon: '📚' },
  { id: 'admin-guide', label: '管理操作', icon: '⚙️' },
  { id: 'user-guide', label: '用户操作', icon: '👤' },
  { id: 'examples', label: '操作示例', icon: '💡' },
  { id: 'faq', label: '常见问题', icon: '❓' },
  { id: 'risk', label: '风险提示', icon: '⚠️' }
]

const faqList = [
  {
    q: '这是链上抵押借贷吗？',
    a: '不是。当前为平台作为资金方的场内信用借贷：授信、放款、计息与还款均在站内完成；质押资产为站内账户锁定，不是链上合约抵押。'
  },
  {
    q: '借款审核和到账要多久？',
    a: '通过风控与授信校验后，资金一般实时记入借贷账户，不依赖区块链确认时间。具体以实际规则为准。'
  },
  {
    q: '可以提前还款吗？',
    a: '通常支持提前结清；是否收取费用以产品条款为准。演示环境默认无提前还款违约金。'
  },
  {
    q: '利息如何计算？',
    a: '常见口径：应付利息 ≈ 本金 × 年化利率 × 计息天数 / 365。浮动利率产品以页面展示与合同约定为准。'
  },
  {
    q: '逾期违约金如何计算？',
    a: '逾期违约金是额外费用，按应还总额（未还本金 + 已累计利息）× 产品配置的每日违约金比例计收。'
  },
  {
    q: '质押币种跌价会怎样？',
    a: '质押估值按实时币价计算。若待还债务达到产品配置的质押预警比例（例如 85%），应提示补充质押或提前还款；达到逾期处理阈值（例如 95%）后，运营可执行逾期处理。'
  },
  {
    q: '「违约结清」是什么意思？',
    a: '表示订单因严重逾期或触发协议违约条款而由平台按规则结清债权（演示状态）。逾期处理只处理借款时锁定的质押币种。'
  },
  {
    q: '信用评分有什么用？',
    a: '用于核定授信额度、利率档位与风险提示；历史还款与逾期记录会影响评分。'
  },
  {
    q: '可以同时有多笔借款吗？',
    a: '可以，但总占用额度受账户授信与产品上限约束，平台会汇总评估。'
  },
  {
    q: '逾期会怎样？',
    a: '可能产生逾期违约金、信用分下调、限制借款；若质押实时估值不足或债务占比触达阈值，运营可处理质押资产并进入违约结清。'
  }
]
</script>

<template>
  <section class="space-y-5">
    <header>
      <h1 class="text-3xl font-semibold text-slate-900">规则说明</h1>
      <p class="mt-1 text-sm text-slate-500">
        平台信用借贷：对手方为平台，场内授信与记账；质押资产为站内账户锁定并按实时币价估值。
      </p>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white p-4">
      <nav class="flex flex-wrap gap-2">
        <a-button type="text"
          v-for="tab in tabs"
          :key="tab.id"
          html-type="button"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-lg transition',
            activeTab === tab.id
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          ]"
          @click="activeTab = tab.id"
        >
          <span class="mr-1">{{ tab.icon }}</span>
          {{ tab.label }}
        </a-button>
      </nav>
    </article>

    <!-- 产品介绍 -->
    <article v-if="activeTab === 'introduction'" class="space-y-4">
      <div class="rounded-xl border border-slate-200 bg-white p-6">
        <h2 class="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <span class="text-2xl">🏦</span>
          平台信用借贷
        </h2>
        <p class="mt-3 text-sm leading-relaxed text-slate-700">
          用户在授信额度内发起借款，<strong class="text-blue-600">平台作为对手方</strong>提供资金；本息在<strong>站内账户</strong>结算，质押资产从用户站内账户锁定并按实时币价估值，当前产品形态<strong>不依赖链上合约抵押</strong>。
        </p>
        <div class="mt-4 grid gap-3 md:grid-cols-2">
          <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <h3 class="font-semibold text-emerald-900">适用场景</h3>
            <ul class="mt-2 space-y-1 text-sm text-emerald-800">
              <li>• 短期周转、杠杆或流动性需求（在合规与风控允许范围内）</li>
              <li>• 希望流程在线完成、到账可预期</li>
              <li>• 可接受信用评估与计息规则</li>
            </ul>
          </div>
          <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 class="font-semibold text-blue-900">与「链上抵押借贷」的区别</h3>
            <ul class="mt-2 space-y-1 text-sm text-blue-800">
              <li>• 质押发生在站内账户，不进入链上合约</li>
              <li>• 风险与定价主要来自平台授信、质押实时估值与合同条款</li>
              <li>• 运营端关注额度、逾期、质押估值与账务一致性</li>
            </ul>
          </div>
        </div>
      </div>
    </article>

    <!-- 名词解释 -->
    <article v-if="activeTab === 'terminology'" class="space-y-3">
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="text-lg font-semibold text-slate-900">授信额度</h3>
        <p class="mt-2 text-sm text-slate-700">
          平台核定的可借上限，随信用与风控策略变化；与「授信中心」配置及用户占用情况联动。
        </p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="text-lg font-semibold text-slate-900">年化利率 (APR)</h3>
        <p class="mt-2 text-sm text-slate-700">
          按年报价的利率；演示以固定年化为主，利息通常按日摊销。
        </p>
        <p class="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          例：年化 8.5%，10,000 USDT 借 30 天 ≈ 10,000 × 8.5% × 30/365。
        </p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="text-lg font-semibold text-slate-900">总债务</h3>
        <p class="mt-2 text-sm text-slate-700">未偿本金与应计利息等合计，用于订单与还款展示。</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="text-lg font-semibold text-slate-900">逾期罚息 / 违约金</h3>
        <p class="mt-2 text-sm text-slate-700">
          未按期偿还时额外计收；常见口径为应还总额（未还本金 + 已累计利息）× 每日违约金比例，具体费率以产品与合同为准。
        </p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="text-lg font-semibold text-slate-900">质押风险预警比例</h3>
        <p class="mt-2 text-sm text-slate-700">
          质押估值按实时币价计算；当待还债务达到质押实时估值的预警比例（如 85%）时，系统应提示用户补充质押或提前还款。
        </p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="text-lg font-semibold text-slate-900">逾期处理阈值</h3>
        <p class="mt-2 text-sm text-slate-700">
          若债务占比继续上升并达到处理阈值（如 95%），运营可在订单管理中处理质押资产。
        </p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="text-lg font-semibold text-slate-900">违约结清（订单状态）</h3>
        <p class="mt-2 text-sm text-slate-700">
          表示严重违约情形下的债权结清状态（演示标签）。逾期处理只处理借款时锁定的质押币种；若质押价值高于应还债务，差额退回用户借款时的质押账户。
        </p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="text-lg font-semibold text-slate-900">信用评分</h3>
        <p class="mt-2 text-sm text-slate-700">
          结合历史借还、逾期、账户行为等综合评估，影响额度与利率。
        </p>
      </div>
    </article>

    <!-- 管理操作 -->
    <article v-if="activeTab === 'admin-guide'" class="space-y-4">
      <div class="rounded-xl border border-purple-200 bg-purple-50 p-6">
        <h2 class="text-xl font-semibold text-purple-900">运营侧要点</h2>
        <ul class="mt-3 space-y-2 text-sm text-purple-900">
          <li>• <strong>产品管理：</strong>借出币种、额度区间、年化利率、逾期违约金、质押预警比例、逾期处理阈值、期限与状态。</li>
          <li>• <strong>订单管理：</strong>审核、查看总债务、质押实时估值与债务占比；先预警，再对达到处理阈值的风险订单处理质押资产。</li>
          <li>• <strong>还款记录：</strong>跨订单查看还款流水；自动还款只使用借出币种账户资金，不直接扣质押物。</li>
          <li>• <strong>授信中心：</strong>总额度、分币种上限与评分卡，驱动前台可借能力。</li>
        </ul>
      </div>
    </article>

    <!-- 用户操作 -->
    <article v-if="activeTab === 'user-guide'" class="space-y-4">
      <div class="rounded-xl border border-slate-200 bg-white p-6">
        <h2 class="text-xl font-semibold text-slate-900">用户侧流程（概念）</h2>
        <ol class="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>登录后进入借贷列表，选择产品及金额、期限。</li>
          <li>提交申请；若需人工审核，等待结果。</li>
          <li>通过后资金进入借贷账户，按日计息。</li>
          <li>按需输入还款金额（先冲逾期利息，再冲正常利息，最后冲本金）、可一次结清；自动还款只使用借出币种账户资金，不能直接扣质押物。</li>
        </ol>
      </div>
    </article>

    <!-- 示例 -->
    <article v-if="activeTab === 'examples'" class="space-y-4">
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="font-semibold text-slate-900">示例 1：固定利率借款</h3>
        <p class="mt-2 text-sm text-slate-700">
          授信允许、产品年化 8.5%，申请 50,000 USDT、90 天 → 通过后到账；利息按日累计，可提前结清。
        </p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="font-semibold text-slate-900">示例 2：部分还款</h3>
        <p class="mt-2 text-sm text-slate-700">
          总债务 70,465 USDT 时，可先付息、再还部分本金或一次还清；剩余本金决定后续利息。
        </p>
      </div>
    </article>

    <!-- FAQ -->
    <article v-if="activeTab === 'faq'" class="space-y-3">
      <div v-for="(faq, idx) in faqList" :key="idx" class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="font-semibold text-slate-900">Q{{ idx + 1 }}：{{ faq.q }}</h3>
        <p class="mt-2 text-sm leading-relaxed text-slate-700">{{ faq.a }}</p>
      </div>
    </article>

    <!-- 风险提示 -->
    <article v-if="activeTab === 'risk'" class="space-y-4">
      <div class="rounded-xl border border-slate-200 bg-white p-6">
        <h2 class="text-xl font-semibold text-slate-900">风险提示</h2>
        <div class="mt-4 space-y-3">
          <div class="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <h3 class="font-semibold text-rose-900">偿债与信用风险</h3>
            <p class="mt-2 text-sm text-rose-800">借款构成债务，需按期偿还；逾期将产生额外违约金并影响信用。</p>
          </div>
          <div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 class="font-semibold text-amber-900">利率与费用</h3>
            <p class="mt-2 text-sm text-amber-800">以产品页与合同为准；浮动或阶梯产品成本可能变化。</p>
          </div>
          <div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 class="font-semibold text-amber-900">流动性与对手方风险</h3>
            <p class="mt-2 text-sm text-amber-800">资金由平台提供，极端情况下平台可能调整授信或放款节奏。</p>
          </div>
          <div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 class="font-semibold text-amber-900">质押价格波动风险</h3>
            <p class="mt-2 text-sm text-amber-800">质押币种按实时币价估值；币价大幅下跌时，订单会先进入质押风险预警，继续下跌并达到处理阈值后才进入逾期处理。</p>
          </div>
        </div>
        <div class="mt-6 rounded-lg border-2 border-rose-200 bg-rose-50 p-5">
          <h3 class="font-semibold text-rose-900">免责声明</h3>
          <p class="mt-2 text-sm text-rose-800">
            本页为演示说明，不构成投资建议。请根据自身还款能力谨慎借款。
          </p>
        </div>
      </div>
    </article>
  </section>
</template>
