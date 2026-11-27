<script setup>
import { ref } from 'vue'
import {
	vipLevelMeta
} from '../../../admin/constants/aiQuant'

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
			<p class="mt-1 text-sm text-slate-500">详细了解AI量化交易产品的规则、使用方式与收益计算</p>
		</header>

		<!-- 导航栏 -->
		<article class="rounded-xl border border-slate-200 bg-white p-4">
			<nav class="flex flex-wrap gap-2">
				<button
					v-for="section in sections"
					:key="section.key"
					@click="activeSection = section.key"
					:class="[
						'px-4 py-2 text-sm font-medium rounded-lg transition',
						activeSection === section.key
							? 'bg-blue-600 text-white'
							: 'bg-slate-100 text-slate-700 hover:bg-slate-200'
					]"
				>
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
					智盈理财是平台推出的<strong class="text-blue-600">固定收益理财产品</strong>，用户投入资金后按日获取稳定收益。平台提供多档收益率产品，满足不同投资需求和风险偏好。
				</p>
				<div class="mt-4 grid gap-3 md:grid-cols-2">
					<div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
						<h3 class="font-semibold text-emerald-900">✅ 产品优势</h3>
						<ul class="mt-2 space-y-1 text-sm text-emerald-800">
							<li>• 固定收益：日化收益率0.15%-0.30%，年化最高109.5%</li>
							<li>• 操作简单：一键申购，每日自动结算收益</li>
							<li>• 灵活赎回：无锁定期限制，随时可申请赎回，T+1到账</li>
							<li>• 阶梯收益：投资金额越大，收益率越高</li>
						</ul>
					</div>
					<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
						<h3 class="font-semibold text-blue-900">💼 适用人群</h3>
						<ul class="mt-2 space-y-1 text-sm text-blue-800">
							<li>• 追求稳定收益的保守型投资者</li>
							<li>• 缺乏理财经验的新手用户</li>
							<li>• 短期闲置资金需要增值</li>
							<li>• 不愿承担高风险的稳健投资者</li>
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
						<li>• <strong>VIP等级限制：</strong>高收益产品需要达到相应VIP等级才能购买</li>
						<li>• <strong>限购策略：</strong>单用户单产品有持仓上限，防止资金过度集中</li>
						<li>• <strong>收益调整：</strong>平台可能根据运营情况调整产品收益率</li>
						<li>• <strong>赎回周期：</strong>赎回申请后T+1到账，需提前规划资金使用</li>
						<li>• <strong>本金风险：</strong>理财产品非保本保息，请谨慎评估投资风险</li>
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
						{ title: '选择产品', desc: '在产品管理页面浏览可用的理财产品，查看各产品的收益率、投资门槛、VIP要求等信息', icon: '📋' },
						{ title: '检查资格', desc: '确认自己的VIP等级是否满足产品要求，以及当前持仓是否已达限购上限', icon: '🔍' },
						{ title: '输入金额', desc: '输入要投资的金额，系统会自动计算预期日收益和年化收益', icon: '💰' },
						{ title: '确认申购', desc: '确认订单信息后提交，资金立即开始计息', icon: '✅' },
						{ title: '每日收益', desc: '系统每日UTC 0:00结算收益，自动发放至账户，可选择提取或继续投资', icon: '📈' },
						{ title: '申请赎回', desc: '需要用钱时申请赎回，T+1个工作日到账，灵活便捷', icon: '🎉' }
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
						<p class="mt-2 text-sm text-slate-600">建议从入门级产品开始体验：</p>
						<ul class="mt-2 space-y-1 text-sm text-slate-700">
							<li>• 选择 <strong>入门级产品</strong>（日化0.15%）</li>
							<li>• 投入 <strong>100-1000 USDT</strong> 测试流程</li>
							<li>• 体验完整的申购-收益-赎回流程</li>
							<li>• 熟悉后再逐步提升VIP等级和投资金额</li>
						</ul>
					</div>
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
						<h3 class="font-semibold text-slate-900">🎯 老手进阶</h3>
						<p class="mt-2 text-sm text-slate-600">优化收益策略的建议：</p>
						<ul class="mt-2 space-y-1 text-sm text-slate-700">
							<li>• 提升VIP等级：解锁更高收益产品</li>
							<li>• 分散配置：将资金分配到不同产品</li>
							<li>• 收益复投：每日收益继续投入，实现复利</li>
							<li>• 关注公告：留意平台的产品和收益调整信息</li>
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
						<h3 class="font-semibold text-slate-900">💎 收益计算</h3>
						<p class="mt-2 text-sm text-slate-700">智盈理财采用 <strong class="text-blue-600">固定日化利率</strong> 模式：</p>
						<div class="mt-2 rounded bg-white p-3 font-mono text-sm">
							日收益 = 持仓金额 × 日利率
						</div>
						<p class="mt-2 text-xs text-slate-500">示例：持仓 10000 USDT，日利率 0.2%，则每日收益 = 10000 × 0.002 = 20 USDT</p>
					</div>
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
						<h3 class="font-semibold text-slate-900">📊 阶梯收益率设计</h3>
						<div class="mt-3 overflow-x-auto rounded-lg border border-slate-200">
							<table class="w-full text-sm">
								<thead class="bg-slate-100 text-slate-600">
									<tr>
										<th class="px-3 py-2 text-left font-medium">产品档次</th>
										<th class="px-3 py-2 text-left font-medium">投资额度</th>
										<th class="px-3 py-2 text-left font-medium">日化收益</th>
										<th class="px-3 py-2 text-left font-medium">年化收益</th>
									</tr>
								</thead>
								<tbody class="text-slate-700">
									<tr class="border-t border-slate-100">
										<td class="px-3 py-2">入门级</td>
										<td class="px-3 py-2">100 - 10,000 USDT</td>
										<td class="px-3 py-2 text-blue-600 font-medium">0.15%</td>
										<td class="px-3 py-2">54.75%</td>
									</tr>
									<tr class="border-t border-slate-100">
										<td class="px-3 py-2">进阶级</td>
										<td class="px-3 py-2">10,000 - 50,000 USDT</td>
										<td class="px-3 py-2 text-blue-600 font-medium">0.18%</td>
										<td class="px-3 py-2">65.7%</td>
									</tr>
									<tr class="border-t border-slate-100">
										<td class="px-3 py-2">旗舰级</td>
										<td class="px-3 py-2">50,000+ USDT</td>
										<td class="px-3 py-2 text-blue-600 font-medium">0.30%</td>
										<td class="px-3 py-2">109.5%</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
						<h3 class="font-semibold text-slate-900">⏱️ 计息规则</h3>
						<ul class="mt-2 space-y-1 text-sm text-slate-700">
							<li>• <strong>起息时间：</strong>申购确认后立即开始计息</li>
							<li>• <strong>结算时间：</strong>每日 UTC 0:00 统一结算前一日收益</li>
							<li>• <strong>收益发放：</strong>结算后自动发放至账户余额</li>
							<li>• <strong>复利模式：</strong>收益可选择继续投资，实现复利效果</li>
						</ul>
					</div>
				</div>
			</div>

			<div class="rounded-xl border border-slate-200 bg-white p-6">
				<h2 class="text-xl font-semibold text-slate-900 flex items-center gap-2">
					<span class="text-2xl">👑</span>
					VIP等级要求
				</h2>
				<p class="mt-3 text-sm text-slate-600">用户需达到相应VIP等级才能购买高收益产品。等级越高，可购买的产品范围越广。</p>
				<div class="mt-4 overflow-x-auto rounded-lg border border-slate-200">
					<table class="w-full text-sm">
						<thead class="bg-slate-100 text-slate-600">
							<tr>
								<th class="px-3 py-2 text-left font-medium">VIP等级</th>
								<th class="px-3 py-2 text-left font-medium">累计入金要求</th>
								<th class="px-3 py-2 text-left font-medium">邀请人数</th>
								<th class="px-3 py-2 text-left font-medium">实名认证</th>
								<th class="px-3 py-2 text-left font-medium">可购产品范围</th>
							</tr>
						</thead>
						<tbody class="text-slate-700">
							<tr class="border-t border-slate-100">
								<td class="px-3 py-2">
									<span class="inline-block px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700">V0 普通</span>
								</td>
								<td class="px-3 py-2">0 USDT</td>
								<td class="px-3 py-2">0 人</td>
								<td class="px-3 py-2 text-slate-400">○ 不需要</td>
								<td class="px-3 py-2">基础产品</td>
							</tr>
							<tr class="border-t border-slate-100">
								<td class="px-3 py-2">
									<span class="inline-block px-2 py-0.5 text-xs font-medium rounded-md bg-blue-100 text-blue-700">V1 银卡</span>
								</td>
								<td class="px-3 py-2">1,000 USDT</td>
								<td class="px-3 py-2">3 人</td>
								<td class="px-3 py-2 text-green-600">✓ 必须</td>
								<td class="px-3 py-2">标准+进阶</td>
							</tr>
							<tr class="border-t border-slate-100">
								<td class="px-3 py-2">
									<span class="inline-block px-2 py-0.5 text-xs font-medium rounded-md bg-yellow-100 text-yellow-700">V2 金卡</span>
								</td>
								<td class="px-3 py-2">10,000 USDT</td>
								<td class="px-3 py-2">10 人</td>
								<td class="px-3 py-2 text-green-600">✓ 必须</td>
								<td class="px-3 py-2">全部普通产品</td>
							</tr>
							<tr class="border-t border-slate-100">
								<td class="px-3 py-2">
									<span class="inline-block px-2 py-0.5 text-xs font-medium rounded-md bg-purple-100 text-purple-700">V3 铂金</span>
								</td>
								<td class="px-3 py-2">50,000 USDT</td>
								<td class="px-3 py-2">30 人</td>
								<td class="px-3 py-2 text-green-600">✓ 必须</td>
								<td class="px-3 py-2">高级产品</td>
							</tr>
							<tr class="border-t border-slate-100">
								<td class="px-3 py-2">
									<span class="inline-block px-2 py-0.5 text-xs font-medium rounded-md bg-emerald-100 text-emerald-700">V4 钻石</span>
								</td>
								<td class="px-3 py-2">100,000 USDT</td>
								<td class="px-3 py-2">50 人</td>
								<td class="px-3 py-2 text-green-600">✓ 必须</td>
								<td class="px-3 py-2">旗舰产品</td>
							</tr>
							<tr class="border-t border-slate-100">
								<td class="px-3 py-2">
									<span class="inline-block px-2 py-0.5 text-xs font-medium rounded-md bg-rose-100 text-rose-700">V5 王者</span>
								</td>
								<td class="px-3 py-2">500,000 USDT</td>
								<td class="px-3 py-2">100 人</td>
								<td class="px-3 py-2 text-green-600">✓ 必须</td>
								<td class="px-3 py-2">全部产品无限制</td>
							</tr>
						</tbody>
					</table>
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
						<h3 class="font-semibold text-slate-900">📊 单产品最大持仓</h3>
						<p class="mt-2 text-sm text-slate-700">单用户在单个产品上的持仓总额不得超过 <strong class="text-blue-600">100,000 USDT</strong>。</p>
						<p class="mt-1 text-xs text-slate-500">示例：某产品已持仓80,000 USDT，最多还可再投入20,000 USDT</p>
					</div>
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
						<h3 class="font-semibold text-slate-900">🔄 所有产品总持仓</h3>
						<p class="mt-2 text-sm text-slate-700">单用户在所有理财产品的总持仓不得超过 <strong class="text-blue-600">500,000 USDT</strong>。</p>
						<p class="mt-1 text-xs text-slate-500">示例：已在3个产品持仓共400,000 USDT，还可投入100,000 USDT</p>
					</div>
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
						<h3 class="font-semibold text-slate-900">📅 单日最大申购</h3>
						<p class="mt-2 text-sm text-slate-700">单用户每日最大申购金额为 <strong class="text-blue-600">50,000 USDT</strong>，防止大额资金快速涌入。</p>
						<p class="mt-1 text-xs text-slate-500">大额资金需分多日申购</p>
					</div>
				</div>
			</div>

			<div class="rounded-xl border border-slate-200 bg-white p-6">
				<h2 class="text-xl font-semibold text-slate-900 flex items-center gap-2">
					<span class="text-2xl">🎛️</span>
					调控机制
				</h2>
				<p class="mt-3 text-sm text-slate-600">平台保留根据运营情况调整产品的权利，确保平台稳定运营：</p>
				<div class="mt-4 grid gap-3 md:grid-cols-2">
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
						<h3 class="font-semibold text-slate-900">👤 用户收益干预</h3>
						<p class="mt-2 text-sm text-slate-700">针对特定用户临时调整收益率，如VIP客户激励或违规用户惩罚。</p>
					</div>
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
						<h3 class="font-semibold text-slate-900">📦 产品收益调整</h3>
						<p class="mt-2 text-sm text-slate-700">根据市场行情调整产品整体收益率，降低平台风险。</p>
					</div>
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
						<h3 class="font-semibold text-slate-900">🛑 紧急停盘</h3>
						<p class="mt-2 text-sm text-slate-700">极端情况下暂停产品申购和赎回，防止资金挤兑。</p>
					</div>
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
						<h3 class="font-semibold text-slate-900">💰 流动性注入</h3>
						<p class="mt-2 text-sm text-slate-700">向流动性池注入资金，确保大额赎回需求。</p>
					</div>
				</div>
			</div>
		</article>

		<!-- 名词解释 -->
		<article v-if="activeSection === 'terms'" class="space-y-3">
			<div v-for="term in [
				{ title: 'AI量化交易', icon: '🤖', desc: '平台提供的固定收益类理财产品，用户投入资金后按日获取稳定收益。操作简单，适合保守型投资者。' },
				{ title: '日化收益率', icon: '📊', desc: '每日计息的收益率百分比。例如日化0.2%表示每投资10000 USDT，每日可获得20 USDT收益。' },
				{ title: '阶梯收益', icon: '📈', desc: '根据投资金额大小，提供不同档次的收益率。投资金额越大，享受的日化收益率越高，激励用户增加投资。' },
				{ title: 'VIP等级', icon: '👑', desc: '根据用户的累计入金、邀请人数、实名认证等指标划分的用户等级。不同等级对应不同的产品购买权限。' },
				{ title: '持仓金额', icon: '💰', desc: '用户当前投入理财产品的资金总额。每日收益根据持仓金额计算。' },
				{ title: '申购', icon: '🛒', desc: '用户购买理财产品，将资金投入平台理财池的操作。申购后立即开始计息。' },
				{ title: '赎回', icon: '🔄', desc: '用户将持仓资金从理财池中取出的操作。赎回申请后T+1个工作日到账。' },
				{ title: 'T+1到账', icon: '⏰', desc: '申请赎回后，资金在下一个工作日到账。T表示交易日(Trade day)，T+1表示交易日的下一天。' },
				{ title: '单产品限额', icon: '📊', desc: '单个用户在单个理财产品上的最大持仓金额限制，防止风险过度集中。' },
				{ title: '总持仓限额', icon: '🛡️', desc: '单个用户在所有理财产品上的持仓总额限制，控制平台整体风险暴露。' },
				{ title: '调控机制', icon: '🎛️', desc: '平台根据运营情况和市场环境，调整产品收益率、暂停申购等风险管控措施。' },
				{ title: '收益结算', icon: '⏱️', desc: '系统在每日固定时间（UTC 0:00）统一计算并发放前一日的收益。收益自动到账，可提取或继续投资。' },
				{ title: '复利投资', icon: '🔄', desc: '将每日获得的收益继续投入理财产品，使本金不断增加，从而实现收益的指数级增长。' },
				{ title: '风险暴露', icon: '📉', desc: '平台在理财业务中承担的风险金额总和。通过限购策略和调控机制控制风险暴露规模。' }
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
						{ level: '入门级', amount: 5000, days: 30, rate: 0.15, dailyIncome: 7.5, monthlyIncome: 225 },
						{ level: '进阶级', amount: 30000, days: 60, rate: 0.18, dailyIncome: 54, monthlyIncome: 3240 },
						{ level: '旗舰级', amount: 100000, days: 90, rate: 0.30, dailyIncome: 300, monthlyIncome: 27000 }
					]" :key="idx" class="rounded-lg border border-slate-200 p-4">
						<h3 class="font-semibold text-slate-900">案例{{ idx + 1 }}：{{ example.level }}产品</h3>
						<div class="mt-3 grid gap-2 md:grid-cols-2">
							<div class="text-sm">
								<span class="text-slate-500">投资金额：</span>
								<span class="font-medium text-slate-900">{{ example.amount.toLocaleString() }} USDT</span>
							</div>
							<div class="text-sm">
								<span class="text-slate-500">持有天数：</span>
								<span class="font-medium text-slate-900">{{ example.days }} 天</span>
							</div>
							<div class="text-sm">
								<span class="text-slate-500">日化收益率：</span>
								<span class="font-medium text-blue-600">{{ example.rate }}%</span>
							</div>
							<div class="text-sm">
								<span class="text-slate-500">每日收益：</span>
								<span class="font-medium text-emerald-600">{{ example.dailyIncome }} USDT</span>
							</div>
						</div>
						<div class="mt-3 rounded bg-slate-50 p-3">
							<p class="text-sm text-slate-700">
								<strong>计算过程：</strong> {{ example.amount.toLocaleString() }} × {{ example.rate }}% = {{ example.dailyIncome }} USDT/天
							</p>
							<p class="mt-1 text-sm text-slate-700">
								<strong>持有{{ example.days }}天总收益：</strong> {{ example.dailyIncome }} × {{ example.days }} = <span class="font-semibold text-emerald-600">{{ (example.dailyIncome * example.days).toLocaleString() }} USDT</span>
							</p>
							<p class="mt-1 text-sm font-semibold text-slate-900">
								<strong>到期本息合计：</strong> {{ (example.amount + example.dailyIncome * example.days).toLocaleString() }} USDT
							</p>
						</div>
					</div>
				</div>
			</div>

			<div class="rounded-xl border border-slate-200 bg-white p-6">
				<h2 class="text-xl font-semibold text-slate-900 flex items-center gap-2">
					<span class="text-2xl">🔄</span>
					复利效果示例
				</h2>
				<div class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
					<h3 class="font-semibold text-emerald-900">场景：每日收益继续投资（复利）</h3>
					<div class="mt-3 space-y-2 text-sm">
						<p><span class="text-slate-600">初始投资：</span><strong>10,000 USDT</strong></p>
						<p><span class="text-slate-600">日化收益率：</span><strong class="text-blue-600">0.2%</strong></p>
						<p><span class="text-slate-600">投资方式：</span>每日收益自动复投</p>
						<div class="mt-3 pt-3 border-t border-emerald-300">
							<p><span class="text-slate-600">持有30天后本息：</span><strong class="text-emerald-900 text-lg">10,061.80 USDT</strong>（收益率 0.618%）</p>
							<p class="mt-1"><span class="text-slate-600">持有90天后本息：</span><strong class="text-emerald-900 text-lg">11,974.41 USDT</strong>（收益率 19.74%）</p>
							<p class="mt-1"><span class="text-slate-600">持有365天后本息：</span><strong class="text-emerald-900 text-lg">20,711.5 USDT</strong>（收益率 107.1%）</p>
						</div>
					</div>
				</div>
				<div class="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
					<h3 class="font-semibold text-blue-900">相比单利（不复投）的优势</h3>
					<p class="mt-2 text-sm text-blue-800">如果不复投，365天收益仅为：10,000 × 0.2% × 365 = <strong>7,300 USDT</strong></p>
					<p class="mt-1 text-sm text-blue-700">复利多赚：<strong>20,711.5 - 17,300 = 3,411.5 USDT（</strong>增加46.7%）</p>
				</div>
			</div>
		</article>

		<!-- 常见问题 -->
		<article v-if="activeSection === 'faq'" class="space-y-3">
			<div v-for="(faq, idx) in [
				{ q: '最低投资金额是多少？', a: '入门级产品最低 100 USDT 起投，不同产品等级有不同的最低投资要求。建议新手从入门级开始。' },
				{ q: '收益什么时候到账？', a: '系统每日 UTC 0:00 结算前一日收益，自动发放至账户余额。收益可选择提取或继续投资实现复利。' },
				{ q: '赎回需要多久到账？', a: '申请赎回后 T+1 个工作日到账。例如周一申请，周二到账；周五申请，下周一到账。' },
				{ q: '有锁定期吗？', a: '无锁定期限制。资金随时可申请赎回，但需要T+1到账时间。如需立即使用资金，建议提前规划。' },
				{ q: '如何提升VIP等级？', a: '通过增加累计入金金额、邀请好友注册、完成实名认证等方式提升VIP等级。不同等级享受不同的产品购买权限和限额。' },
				{ q: '达到限购上限怎么办？', a: '可以等待其他产品释放额度，或者提升VIP等级获得更高的限额。也可以考虑赎回部分持仓后再投入新产品。' },
				{ q: '收益率会变化吗？', a: '产品收益率通常固定，但平台可能根据运营情况和市场环境进行调整。调整前会通过公告通知用户。' },
				{ q: '什么是调控机制？会影响我的收益吗？', a: '调控是平台的风险管理手段。根据运营需要，平台可能调整产品收益率或暂停申购。正常情况下按公布收益率计算。' },
				{ q: '可以同时投资多个产品吗？', a: '可以。您可以同时投资多个不同档次的产品，但总持仓不能超过500,000 USDT的限额。' },
				{ q: '资金安全有保障吗？', a: '平台采用多重安全机制，包括冷热钱包分离、多重签名、实时风控监控等。同时通过限购策略控制风险暴露。' },
				{ q: '新手应该选择什么产品？', a: '建议从入门级产品开始，投入100-1000 USDT测试流程。熟悉后再逐步提升投资金额和产品档次。' },
				{ q: '手续费如何收取？', a: '申购和赎回均不收取手续费。平台通过资金运作和息差获取收益。' },
				{ q: '收益是否保证？', a: '虽然产品展示预期收益率，但实际运营中可能受市场环境影响。平台会通过调控机制维持收益稳定，但不保证100%实现承诺收益。' },
				{ q: '可以提前终止投资吗？', a: '可以随时申请赎回，但需要T+1到账。赎回当日不计收益。' },
				{ q: '如何最大化收益？', a: '建议：1）提升VIP等级解锁高收益产品；2）将每日收益继续投资实现复利；3）合理利用限额分散投资；4）关注平台公告及时调整策略。' }
			]" :key="idx" class="rounded-xl border border-slate-200 bg-white p-5">
				<h3 class="font-semibold text-slate-900">Q{{ idx + 1 }}：{{ faq.q }}</h3>
				<p class="mt-2 text-sm leading-relaxed text-slate-700">{{ faq.a }}</p>
			</div>
		</article>
	</section>
</template>
