
<script setup>
import { ref } from 'vue'

const activeSection = ref('intro')

const sections = [
	{ key: 'intro', label: '产品简介' },
	{ key: 'usage', label: '使用流程' },
	{ key: 'rules', label: '核心规则' },
	{ key: 'terms', label: '名词解释' },
	{ key: 'examples', label: '收益示例' },
	{ key: 'faq', label: '常见问题' }
]
</script>

<template>
	<section class="space-y-5">
		<header>
			<h1 class="text-3xl font-semibold text-slate-900">规则说明</h1>
			<p class="mt-1 text-sm text-slate-500">详细了解流动性挖矿锁仓版的规则、使用方式与收益计算</p>
		</header>

		<!-- 导航栏 -->
		<article class="rounded-xl border border-slate-200 bg-white p-4">
			<nav class="flex flex-wrap gap-2">
				<button v-for="section in sections" :key="section.key" @click="activeSection = section.key"
						:class="['px-4 py-2 text-sm font-medium rounded-lg transition',
								activeSection === section.key
								? 'bg-blue-600 text-white'
								: 'bg-slate-100 text-slate-700 hover:bg-slate-200']">
					{{ section.label }}
				</button>
			</nav>
		</article>

		<!-- 产品简介 -->
		<article v-if="activeSection === 'intro'" class="space-y-4">
			<div class="rounded-xl border border-slate-200 bg-white p-6">
				<h2 class="text-xl font-semibold text-slate-900 flex items-center gap-2">
					<span class="text-2xl">📊</span>
					产品定位
				</h2>
				<p class="mt-3 text-sm leading-relaxed text-slate-700">
					流动性挖矿（锁仓版）是一种<strong class="text-blue-600">稳健型理财产品</strong>，用户通过锁定数字资产一定期限，获取固定的日化收益。平台承诺本金安全，到期自动返还本金与利息。
				</p>
				<div class="mt-4 grid gap-3 md:grid-cols-2">
					<div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
						<h3 class="font-semibold text-emerald-900">✅ 产品优势</h3>
						<ul class="mt-2 space-y-1 text-sm text-emerald-800">
							<li>• 收益稳定：固定日化收益率，到期保本保息</li>
							<li>• 操作简单：一键锁仓，到期自动解锁返还</li>
							<li>• 灵活选择：多种锁仓周期与币种可选</li>
							<li>• 风险可控：平台风控机制保障资金安全</li>
						</ul>
					</div>
					<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
						<h3 class="font-semibold text-blue-900">💼 资金用途</h3>
						<ul class="mt-2 space-y-1 text-sm text-blue-800">
							<li>• 做市商流动性池补充</li>
							<li>• 交易所冷热钱包调配</li>
							<li>• 合约对冲头寸保证金</li>
							<li>• 平台流动性储备金</li>
						</ul>
					</div>
				</div>
			</div>

			<div class="rounded-xl border border-slate-200 bg-white p-6">
				<h2 class="text-xl font-semibold text-slate-900 flex items-center gap-2">
					<span class="text-2xl">⚠️</span>
					风险提示
				</h2>
				<div class="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
					<ul class="space-y-2 text-sm text-amber-800">
						<li>• <strong>锁仓期限：</strong>锁仓期间资产无法使用或交易，请合理规划资金</li>
						<li>• <strong>提前赎回：</strong>部分产品支持提前赎回，但需缴纳违约金（通常为本金的4%）</li>
						<li>• <strong>市场波动：</strong>数字资产价格波动可能影响资产实际价值（但不影响锁仓数量）</li>
						<li>• <strong>限购策略：</strong>平台根据风控需求设置限购额度，大额资金需分批参与</li>
					</ul>
				</div>
			</div>
		</article>

		<!-- 使用流程 -->
		<article v-if="activeSection === 'usage'" class="space-y-4">
			<div class="rounded-xl border border-slate-200 bg-white p-6">
				<h2 class="text-xl font-semibold text-slate-900 flex items-center gap-2">
					<span class="text-2xl">🚀</span>
					操作流程
				</h2>
				<div class="mt-4 space-y-3">
					<div v-for="(step, idx) in [
						{ title: '选择产品', desc: '在产品管理页面浏览可用的锁仓产品，查看各产品的币种、周期、利率等信息', icon: '📋' },
						{ title: '选择周期', desc: '根据自身资金规划，选择合适的锁仓周期（如2天、10天、30天等），周期越长通常利率越高', icon: '⏰' },
						{ title: '输入金额', desc: '输入要锁仓的金额，注意不能低于最小限额或超过最大限额及个人限购额度', icon: '💰' },
						{ title: '确认锁仓', desc: '确认订单信息（本金、周期、预期收益），提交后资产立即锁定，开始计息', icon: '✅' },
						{ title: '持有期间', desc: '锁仓期间可在订单管理页面查看订单状态、剩余天数、累计收益等信息', icon: '📈' },
						{ title: '到期解锁', desc: '到期后系统自动解锁，本金+利息返还至账户，可继续参与新的锁仓或提现', icon: '🎉' }
					]" :key="idx" class="flex gap-4">
						<div class="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
							{{ idx + 1 }}
						</div>
						<div class="flex-1">
							<h3 class="font-semibold text-slate-900">{{ step.icon }} {{ step.title }}</h3>
							<p class="mt-1 text-sm text-slate-600">{{ step.desc }}</p>
						</div>
					</div>
				</div>
			</div>

			<div class="rounded-xl border border-slate-200 bg-white p-6">
				<h2 class="text-xl font-semibold text-slate-900 flex items-center gap-2">
					<span class="text-2xl">⚡</span>
					快速上手
				</h2>
				<div class="mt-4 grid gap-4 md:grid-cols-2">
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
						<h3 class="font-semibold text-slate-900">💡 新手推荐</h3>
						<p class="mt-2 text-sm text-slate-600">建议从短周期、小额度开始尝试：</p>
						<ul class="mt-2 space-y-1 text-sm text-slate-700">
							<li>• 选择 <strong>2-5天</strong> 的短期产品</li>
							<li>• 投入 <strong>最小限额</strong> 测试流程</li>
							<li>• 体验完整的锁仓-到期-返还流程</li>
							<li>• 熟悉后再逐步增加金额和周期</li>
						</ul>
					</div>
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
						<h3 class="font-semibold text-slate-900">🎯 老手进阶</h3>
						<p class="mt-2 text-sm text-slate-600">优化收益策略的建议：</p>
						<ul class="mt-2 space-y-1 text-sm text-slate-700">
							<li>• 分散周期：将资金分配到不同周期产品</li>
							<li>• 滚动续投：到期后立即参与新的锁仓</li>
							<li>• 利率对比：关注各币种和周期的利率差异</li>
							<li>• 限额管理：合理利用限购额度最大化收益</li>
						</ul>
					</div>
				</div>
			</div>
		</article>

		<!-- 核心规则 -->
		<article v-if="activeSection === 'rules'" class="space-y-4">
			<div class="rounded-xl border border-slate-200 bg-white p-6">
				<h2 class="text-xl font-semibold text-slate-900 flex items-center gap-2">
					<span class="text-2xl">📐</span>
					收益规则
				</h2>
				<div class="mt-4 space-y-3">
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
						<h3 class="font-semibold text-slate-900">💎 利息计算</h3>
						<p class="mt-2 text-sm text-slate-700">锁仓收益采用 <strong class="text-blue-600">固定日化利率</strong> 模式：</p>
						<div class="mt-2 rounded bg-white p-3 font-mono text-sm">
							总利息 = 本金 × 日利率 × 锁仓天数
						</div>
						<p class="mt-2 text-xs text-slate-500">示例：锁仓 5000 USDT，日利率 0.3%，周期 10天，则到期利息 = 5000 × 0.003 × 10 = 150 USDT</p>
					</div>
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
						<h3 class="font-semibold text-slate-900">⏱️ 计息规则</h3>
						<ul class="mt-2 space-y-1 text-sm text-slate-700">
							<li>• <strong>起息时间：</strong>锁仓确认后立即开始计息</li>
							<li>• <strong>计息方式：</strong>每日零点UTC+0统一结算利息</li>
							<li>• <strong>利息发放：</strong>到期时一次性将本金+利息返还至账户</li>
							<li>• <strong>复利模式：</strong>单次锁仓不支持复利，但可手动滚动续投实现复利效果</li>
						</ul>
					</div>
				</div>
			</div>

			<div class="rounded-xl border border-slate-200 bg-white p-6">
				<h2 class="text-xl font-semibold text-slate-900 flex items-center gap-2">
					<span class="text-2xl">🔄</span>
					提前赎回规则
				</h2>
				<div class="mt-4 grid gap-3 md:grid-cols-3">
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
						<p class="text-sm text-slate-500">违约金比例</p>
						<p class="mt-1 text-2xl font-bold text-rose-600">4%</p>
					</div>
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
						<p class="text-sm text-slate-500">最短持有天数</p>
						<p class="mt-1 text-2xl font-bold text-slate-900">1天</p>
					</div>
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
						<p class="text-sm text-slate-500">到账时间</p>
						<p class="mt-1 text-2xl font-bold text-slate-900">24小时</p>
					</div>
				</div>
				<div class="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
					<h3 class="font-semibold text-amber-900">计算规则</h3>
					<p class="mt-2 text-sm text-amber-800">提前赎回时，扣除 <strong>4% 违约金</strong> 后返还剩余本金，<strong>不返还已计利息</strong>。</p>
					<div class="mt-2 rounded bg-white p-3 font-mono text-xs text-slate-700">
						返还金额 = 本金 × (1 - 4%) = 本金 × 96%
					</div>
					<p class="mt-2 text-xs text-amber-700">示例：锁仓 5000 USDT，持有3天后提前赎回，返还 5000 × 96% = 4800 USDT，损失 200 USDT</p>
				</div>
			</div>

			<div class="rounded-xl border border-slate-200 bg-white p-6">
				<h2 class="text-xl font-semibold text-slate-900 flex items-center gap-2">
					<span class="text-2xl">🛡️</span>
					限购策略
				</h2>
				<p class="mt-3 text-sm text-slate-600">平台通过限购策略控制风险敞口，保障资金安全：</p>
				<div class="mt-4 space-y-3">
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
						<h3 class="font-semibold text-slate-900">📊 终身限购</h3>
						<p class="mt-2 text-sm text-slate-700">单用户在该产品上的 <strong>历史累计</strong> 锁仓总额不得超过设定上限。</p>
						<p class="mt-1 text-xs text-slate-500">示例：USDT产品设置终身限购50,000 USDT，用户累计锁仓达到此额度后无法继续参与该产品</p>
					</div>
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
						<h3 class="font-semibold text-slate-900">🔄 周期限购</h3>
						<p class="mt-2 text-sm text-slate-700">单用户在指定周期内（如30天）的累计锁仓总额不得超过上限，周期重置后额度恢复。</p>
						<p class="mt-1 text-xs text-slate-500">示例：BTC产品设置30天限购2 BTC，用户本月已锁仓1.5 BTC，本月还可再锁仓0.5 BTC</p>
					</div>
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
						<h3 class="font-semibold text-slate-900">👥 风险分层限购</h3>
						<p class="mt-2 text-sm text-slate-700">根据用户等级（普通/VIP/黄金/铂金/钻石）设置不同的限购额度。</p>
						<div class="mt-2 overflow-x-auto rounded-lg border border-slate-200">
							<table class="w-full text-sm">
								<thead class="bg-slate-100 text-slate-600">
									<tr>
										<th class="px-3 py-2 text-left font-medium">用户等级</th>
										<th class="px-3 py-2 text-left font-medium">单次限额</th>
										<th class="px-3 py-2 text-left font-medium">终身限额</th>
									</tr>
								</thead>
								<tbody class="text-slate-700">
									<tr class="border-t border-slate-100">
										<td class="px-3 py-2">普通用户</td>
										<td class="px-3 py-2">10,000 USDT</td>
										<td class="px-3 py-2">50,000 USDT</td>
									</tr>
									<tr class="border-t border-slate-100">
										<td class="px-3 py-2">VIP</td>
										<td class="px-3 py-2">50,000 USDT</td>
										<td class="px-3 py-2">200,000 USDT</td>
									</tr>
									<tr class="border-t border-slate-100">
										<td class="px-3 py-2">黄金</td>
										<td class="px-3 py-2">100,000 USDT</td>
										<td class="px-3 py-2">500,000 USDT</td>
									</tr>
									<tr class="border-t border-slate-100">
										<td class="px-3 py-2">铂金</td>
										<td class="px-3 py-2">300,000 USDT</td>
										<td class="px-3 py-2">1,000,000 USDT</td>
									</tr>
									<tr class="border-t border-slate-100">
										<td class="px-3 py-2">钻石</td>
										<td class="px-3 py-2">500,000 USDT</td>
										<td class="px-3 py-2">2,000,000 USDT</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</article>

		<!-- 名词解释 -->
		<article v-if="activeSection === 'terms'" class="space-y-3">
			<div v-for="term in [
				{ title: '锁仓', icon: '🔒', desc: '将数字资产锁定在平台指定钱包中，在锁定期间无法转移或交易，到期后自动解锁。' },
				{ title: '日利率', icon: '📊', desc: '每日计息的利率百分比。例如日利率0.3%表示每锁仓100 USDT，每日可获得0.3 USDT利息。' },
				{ title: '锁仓周期', icon: '⏰', desc: '资产锁定的时长，从锁仓确认时刻起算至到期解锁的天数。常见周期有2天、5天、10天、30天、90天等。' },
				{ title: '最小/最大限额', icon: '💰', desc: '单次锁仓的最低和最高金额要求。低于最小限额无法参与，超过最大限额需分批锁仓。' },
				{ title: '提前赎回', icon: '🔄', desc: '在锁仓期未满时申请提前解锁资产，通常需支付违约金（本金的一定比例），且不返还已计利息。' },
				{ title: '违约金', icon: '⚠️', desc: '提前赎回时扣除的费用，用于补偿平台的资金调配成本。通常为本金的4%。' },
				{ title: '终身限购', icon: '🛡️', desc: '单用户在某产品上的历史累计锁仓总额上限，达到后无法继续参与该产品。' },
				{ title: '周期限购', icon: '🔄', desc: '单用户在指定时间周期（如30天）内的累计锁仓总额上限，周期重置后额度恢复。' },
				{ title: '到期自动解锁', icon: '✅', desc: '锁仓期满后，系统自动将本金+利息返还至用户账户，无需手动操作。' },
				{ title: '计息时间', icon: '⏱️', desc: '利息的结算时间点，通常为每日零点UTC+0统一结算前一日利息。' },
				{ title: '流动性池', icon: '💧', desc: '平台用于做市、交易、对冲等业务的资金池，锁仓资金主要用于补充该池流动性。' },
				{ title: '风险敞口', icon: '📉', desc: '平台在锁仓业务中承担的风险金额，通过限购策略控制敞口规模。' }
			]" :key="term.title" class="rounded-xl border border-slate-200 bg-white p-5">
				<h3 class="text-lg font-semibold text-slate-900 flex items-center gap-2">
					<span class="text-xl">{{ term.icon }}</span>
					{{ term.title }}
				</h3>
				<p class="mt-2 text-sm leading-relaxed text-slate-700">{{ term.desc }}</p>
			</div>
		</article>

		<!-- 收益示例 -->
		<article v-if="activeSection === 'examples'" class="space-y-4">
			<div class="rounded-xl border border-slate-200 bg-white p-6">
				<h2 class="text-xl font-semibold text-slate-900 flex items-center gap-2">
					<span class="text-2xl">📈</span>
					收益计算示例
				</h2>
				<div class="mt-4 space-y-4">
					<div v-for="(example, idx) in [
						{ product: 'USDT 定期理财', amount: 5000, currency: 'USDT', days: 10, rate: 0.3, interest: 150, total: 5150 },
						{ product: 'BTC 锁仓挖矿', amount: 0.5, currency: 'BTC', days: 30, rate: 0.35, interest: 0.00525, total: 0.50525 },
						{ product: 'ETH 流动性质押', amount: 10, currency: 'ETH', days: 20, rate: 0.4, interest: 0.08, total: 10.08 }
					]" :key="idx" class="rounded-lg border border-slate-200 p-4">
						<h3 class="font-semibold text-slate-900">案例{{ idx + 1 }}：{{ example.product }}</h3>
						<div class="mt-3 grid gap-2 md:grid-cols-2">
							<div class="text-sm">
								<span class="text-slate-500">锁仓金额：</span>
								<span class="font-medium text-slate-900">{{ example.amount }} {{ example.currency }}</span>
							</div>
							<div class="text-sm">
								<span class="text-slate-500">锁仓周期：</span>
								<span class="font-medium text-slate-900">{{ example.days }} 天</span>
							</div>
							<div class="text-sm">
								<span class="text-slate-500">日利率：</span>
								<span class="font-medium text-blue-600">{{ example.rate }}%</span>
							</div>
							<div class="text-sm">
								<span class="text-slate-500">总利息：</span>
								<span class="font-medium text-emerald-600">{{ example.interest }} {{ example.currency }}</span>
							</div>
						</div>
						<div class="mt-3 rounded bg-slate-50 p-3">
							<p class="text-sm text-slate-700">
								<strong>计算过程：</strong> {{ example.amount }} × {{ example.rate }}% × {{ example.days }} = {{ example.interest }} {{ example.currency }}
							</p>
							<p class="mt-1 text-sm font-semibold text-slate-900">
								<strong>到期返还：</strong> {{ example.total }} {{ example.currency }}（本金 + 利息）
							</p>
						</div>
					</div>
				</div>
			</div>

			<div class="rounded-xl border border-slate-200 bg-white p-6">
				<h2 class="text-xl font-semibold text-slate-900 flex items-center gap-2">
					<span class="text-2xl">⚠️</span>
					提前赎回损失计算
				</h2>
				<div class="mt-4 space-y-4">
					<div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
						<h3 class="font-semibold text-amber-900">场景：锁仓10天后提前赎回</h3>
						<div class="mt-3 space-y-2 text-sm">
							<p><span class="text-slate-600">初始锁仓：</span><strong>5000 USDT</strong> × 日利率 <strong>0.3%</strong> × 周期 <strong>10天</strong></p>
							<p><span class="text-slate-600">已持有：</span><strong>3天</strong></p>
							<p><span class="text-slate-600">已产生利息：</span>5000 × 0.3% × 3 = <strong class="text-rose-600">45 USDT</strong>（不返还）</p>
							<p><span class="text-slate-600">违约金扣除：</span>5000 × 4% = <strong class="text-rose-600">200 USDT</strong></p>
							<p class="pt-2 border-t border-amber-300"><span class="text-slate-600">实际返还：</span>5000 - 200 = <strong class="text-amber-900 text-lg">4800 USDT</strong></p>
							<p class="text-rose-700"><strong>总损失：200 USDT（违约金） + 45 USDT（已计利息） = 245 USDT</strong></p>
						</div>
					</div>
					<div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
						<h3 class="font-semibold text-emerald-900">建议：持有到期</h3>
						<p class="mt-2 text-sm text-emerald-800">如果持有到期（10天），将获得：<strong>5000 + 150 = 5150 USDT</strong></p>
						<p class="mt-1 text-sm text-emerald-700">相比提前赎回，多获得：<strong>5150 - 4800 = 350 USDT</strong></p>
					</div>
				</div>
			</div>
		</article>

		<!-- 常见问题 -->
		<article v-if="activeSection === 'faq'" class="space-y-3">
			<div v-for="(faq, idx) in [
				{ q: '锁仓期间可以转移或交易资产吗？', a: '不可以。锁仓期间资产被锁定在平台指定钱包中，无法进行任何转移、交易或提现操作。只有到期后才会自动解锁。' },
				{ q: '到期后资金什么时候返还？', a: '到期后系统会在24小时内自动将本金和利息返还至您的账户余额，无需手动操作。返还后资金即可自由使用。' },
				{ q: '可以取消锁仓订单吗？', a: '锁仓确认后无法直接取消。如需提前赎回，可申请提前赎回操作，但需支付4%违约金且不返还已计利息。' },
				{ q: '利息什么时候到账？', a: '利息每日零点UTC+0结算，但不会立即到账，而是累计计入订单总收益。到期后本金和全部利息一次性返还。' },
				{ q: '可以同时参与多个锁仓产品吗？', a: '可以。您可以同时参与不同币种、不同周期的多个锁仓产品，每个订单独立计息、独立到期。' },
				{ q: '限购额度怎么计算？', a: '限购额度分为终身限购和周期限购。终身限购是历史累计总额，周期限购是指定周期内的累计总额。达到限购上限后需等待额度恢复或升级用户等级。' },
				{ q: '币价下跌会影响收益吗？', a: '不会。锁仓收益按数量计算，不受币价波动影响。例如锁仓1 BTC，到期返还1.0015 BTC（含利息），无论BTC价格涨跌。但币价波动会影响资产的法币价值。' },
				{ q: '为什么有些产品不支持提前赎回？', a: '部分产品的资金用途为长期流动性配置，平台无法提前调配资金，因此不支持提前赎回。申购前请仔细查看产品详情。' },
				{ q: '如何升级用户等级以提高限购额度？', a: '用户等级通常根据交易量、持仓量、锁仓历史等综合评定。具体升级规则请咨询客服或查看用户等级说明。' },
				{ q: '锁仓资金的安全性如何保障？', a: '平台采用冷热钱包分离、多重签名、风险预警等机制保障资金安全。锁仓资金主要用于做市和流动性配置，不参与高风险投资。同时平台设置限购策略控制风险敞口。' },
				{ q: '可以提前续约或追加金额吗？', a: '不可以。每个锁仓订单在创建时金额和周期即固定，无法修改。如需追加，请在当前订单到期后或创建新的锁仓订单。' },
				{ q: '手续费如何收取？', a: '锁仓和到期解锁均不收取手续费。唯一的费用是提前赎回时的违约金（4%）。' }
			]" :key="idx" class="rounded-xl border border-slate-200 bg-white p-5">
				<h3 class="font-semibold text-slate-900">Q{{ idx + 1 }}：{{ faq.q }}</h3>
				<p class="mt-2 text-sm leading-relaxed text-slate-700">{{ faq.a }}</p>
			</div>
		</article>
	</section>
</template>
