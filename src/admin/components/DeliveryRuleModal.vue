<script setup>
import { AdminButton, AdminCheckbox, AdminInput, AdminSelect, AdminSlider, AdminTextarea, nativeControl } from './antd/controls.js'

import { computed, reactive, ref, watch } from "vue";
import {
  DELIVERY_RULE_TRIGGER_TYPE,
  DELIVERY_RULE_ACTION,
  DELIVERY_RULE_STATUS,
  DELIVERY_RULE_PRIORITY,
  DELIVERY_RULE_TIME_PERIOD,
  USER_RISK_LEVEL,
  PROFIT_CONTROL_STRATEGY,
} from "../constants/deliveryControl";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  rule: {
    type: Object,
    default: null,
  },
  mode: {
    type: String,
    default: "create", // 'create' | 'edit' | 'duplicate'
  },
});

const emit = defineEmits(["close", "save"]);

const defaultProfitControlParams = {
  winProbability: 0.3,
  avgWinAmount: 20,
  avgLossAmount: -15,
  strategy: PROFIT_CONTROL_STRATEGY.SETTLEMENT_PRICE,
  winFluctuationPercent: 2,
  lossFluctuationPercent: 2,
};

// 表单数据
const form = reactive({
  // 基本信息
  name: "",
  description: "",
  status: DELIVERY_RULE_STATUS.ENABLED,
  priority: DELIVERY_RULE_PRIORITY.MEDIUM,

  // 触发条件
  trigger: {
    type: DELIVERY_RULE_TRIGGER_TYPE.TRADE_COUNT,
    period: DELIVERY_RULE_TIME_PERIOD.LAST_1H,
    threshold: 20,
    conditions: {
      totalProfit: { enabled: false, operator: ">", value: 1000 },
      dailyProfit: { enabled: false, operator: ">", value: 1000 },
      positionValue: { enabled: false, operator: ">", value: 5000 },
      riskLevel: { enabled: false, values: [] },
    },
  },

  // 执行动作
  action: {
    type: DELIVERY_RULE_ACTION.PROFIT_CONTROL,
    params: {
      // 盈亏控制（线控）- 百分比模式
      profitControl: {
        winFluctuationPercent: 2, // 盈利波动范围，单位%（±2%）
        lossFluctuationPercent: 2, // 亏损波动范围，单位%（±2%）
        winProbability: 0.3, // 盈利概率30%
        avgWinAmount: 20, // 赢时金额百分比 20%
        avgLossAmount: -15, // 输时金额百分比 -15%
        strategy: PROFIT_CONTROL_STRATEGY.NONE, // 技术策略
      },
      applyToNewPositions: true,
      duration: 0,

      // 强制盈利/亏损
      nextPositionCount: 1,
      lossPercent: 0.3,
      lossFluctuationPercent: 2, // 亏损波动范围，单位%（±2%）
      profitPercent: 0.2,
      winFluctuationPercent: 2, // 盈利波动范围，单位%（±2%）

      // 价格调整
      settlePriceMode: "unfavorable", // 'favorable' | 'unfavorable' | 'market'
      offsetPercent: 0.5,

      // 订单拒绝
      lockNewPosition: true,
      existingProfitTarget: -100,
      notifyUser: false,
      notifyMessage: "",

      // 仓位限制
      maxPositionValue: 1000,
      maxLeverage: 20,
    },
  },

  // 高级选项
  advanced: {
    enabled: true,
    schedule: {
      enabled: false,
      startTime: "09:00",
      endTime: "23:00",
      weekdays: [1, 2, 3, 4, 5, 6, 7], // 1-7 代表周一到周日
    },
    userFilter: {
      enabled: false,
      vipLevels: [],
      minDeposit: 0,
      maxDeposit: 0,
      registrationDays: { min: 0, max: 0 },
      excludeUserIds: "",
    },
    limits: {
      maxHitsPerDay: 0,
      maxHitsPerUser: 0,
      cooldownMinutes: 0,
    },
    notification: {
      enabled: false,
      webhookUrl: "",
      emailList: "",
    },
  },
});

// 触发类型配置
const triggerTypeOptions = [
  {
    value: DELIVERY_RULE_TRIGGER_TYPE.TRADE_COUNT,
    label: "交易次数",
    icon: "📊",
    description: "监测用户在指定时间内的交易次数",
    unit: "次",
    needsPeriod: true,
    defaultThreshold: 20,
  },
  {
    value: DELIVERY_RULE_TRIGGER_TYPE.PROFIT_LOSS,
    label: "累计盈亏",
    icon: "📈",
    description: "监测用户在指定时间内的累计盈亏金额",
    unit: "USDT",
    needsPeriod: true,
    defaultThreshold: 1000,
  },
  {
    value: DELIVERY_RULE_TRIGGER_TYPE.CONSECUTIVE_WINS,
    label: "连续盈利",
    icon: "🎯",
    description: "监测用户连续盈利的次数",
    unit: "次",
    needsPeriod: true,
    defaultThreshold: 5,
  },
  {
    value: DELIVERY_RULE_TRIGGER_TYPE.CONSECUTIVE_LOSS,
    label: "连续亏损",
    icon: "📉",
    description: "监测用户连续亏损的次数",
    unit: "次",
    needsPeriod: true,
    defaultThreshold: 5,
  },
];

// 时间周期选项
const timePeriodOptions = [
  { value: DELIVERY_RULE_TIME_PERIOD.REAL_TIME, label: "实时" },
  { value: DELIVERY_RULE_TIME_PERIOD.LAST_1H, label: "最近1小时" },
  { value: DELIVERY_RULE_TIME_PERIOD.LAST_4H, label: "最近4小时" },
  { value: DELIVERY_RULE_TIME_PERIOD.LAST_24H, label: "最近24小时" },
  { value: DELIVERY_RULE_TIME_PERIOD.TODAY, label: "今日" },
  { value: DELIVERY_RULE_TIME_PERIOD.LAST_7D, label: "最近7天" },
];

// 执行动作配置
const actionTypeOptions = [
  {
    value: DELIVERY_RULE_ACTION.PROFIT_CONTROL,
    label: "盈亏控制",
    icon: "🎚️",
    description: "精确调整用户的交易盈亏金额（线控）",
    color: "blue",
  },
  {
    value: DELIVERY_RULE_ACTION.FORCE_WIN,
    label: "强制盈利",
    icon: "✅",
    description: "强制下N单结算为盈利",
    color: "emerald",
  },
  {
    value: DELIVERY_RULE_ACTION.FORCE_LOSS,
    label: "强制亏损",
    icon: "❌",
    description: "强制下N单结算为亏损",
    color: "rose",
  },
];

// 优先级选项
const priorityOptions = [
  { value: DELIVERY_RULE_PRIORITY.HIGH, label: "高优先级", icon: "🔴" },
  { value: DELIVERY_RULE_PRIORITY.MEDIUM, label: "中优先级", icon: "🟡" },
  { value: DELIVERY_RULE_PRIORITY.LOW, label: "低优先级", icon: "⚪" },
];

// 状态选项
const statusOptions = [
  { value: DELIVERY_RULE_STATUS.ENABLED, label: "运行中" },
  { value: DELIVERY_RULE_STATUS.PAUSED, label: "已暂停" },
  { value: DELIVERY_RULE_STATUS.DISABLED, label: "已禁用" },
];

// 盈亏控制策略选项
const profitControlStrategyOptions = [
  { value: PROFIT_CONTROL_STRATEGY.NONE, label: "无策略", description: "完全按照参数执行" },
  { value: PROFIT_CONTROL_STRATEGY.TIME_WINDOW, label: "时间窗口", description: "交易时间内价格波动选择适当值" },
  // { value: PROFIT_CONTROL_STRATEGY.SETTLEMENT_PRICE, label: "结算价格", description: "多数据源最优选择" },
  // { value: PROFIT_CONTROL_STRATEGY.SLIPPAGE, label: "滑点控制", description: "通过滑点影响盈亏" },
];

// 计算属性
const isEditMode = computed(() => props.mode === "edit");
const isDuplicateMode = computed(() => props.mode === "duplicate");
const modalTitle = computed(() => {
  if (isEditMode.value) return "编辑规则";
  if (isDuplicateMode.value) return "复制规则";
  return "新增规则";
});

const currentTriggerConfig = computed(() => triggerTypeOptions.find((opt) => opt.value === form.trigger.type));
const currentActionConfig = computed(() => actionTypeOptions.find((opt) => opt.value === form.action.type));
const needsTimePeriod = computed(() => currentTriggerConfig.value?.needsPeriod);

// 计算期望值
const calculatedExpectedValue = computed(() => {
  if (form.action.type === DELIVERY_RULE_ACTION.PROFIT_CONTROL) {
    const { winProbability, avgWinAmount, avgLossAmount } = form.action.params.profitControl;
    const prob = Number(winProbability) || 0;
    const win = Number(avgWinAmount) || 0;
    const loss = Number(avgLossAmount) || 0;
    return win * prob + loss * (1 - prob);
  }
  return 0;
});

const formatFluctuationRange = (baseValue, fluctuationPercent) => {
  const base = Number(baseValue);
  const fluct = Number(fluctuationPercent);
  const safeBase = Number.isFinite(base) ? base : 0;
  const safeFluct = Number.isFinite(fluct) ? Math.max(0, fluct) : 0;
  const factor = safeFluct / 100;
  const a = safeBase * (1 - factor);
  const b = safeBase * (1 + factor);
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return `${min.toFixed(2)}% ~ ${max.toFixed(2)}%`;
};

const winAmountRangeText = computed(() => {
  const pc = form.action?.params?.profitControl || defaultProfitControlParams;
  return formatFluctuationRange(pc.avgWinAmount, pc.winFluctuationPercent);
});

const lossAmountRangeText = computed(() => {
  const pc = form.action?.params?.profitControl || defaultProfitControlParams;
  return formatFluctuationRange(pc.avgLossAmount, pc.lossFluctuationPercent);
});

const normalize = () => {
  if (!form.action) {
    form.action = { type: DELIVERY_RULE_ACTION.PROFIT_CONTROL, params: {} };
  }
  if (!form.action.params) form.action.params = {};
  if (!form.action.params.profitControl) form.action.params.profitControl = {};

  const pc = form.action.params.profitControl;
  pc.winProbability = Number.isFinite(Number(pc.winProbability)) ? Number(pc.winProbability) : defaultProfitControlParams.winProbability;
  pc.avgWinAmount = Number.isFinite(Number(pc.avgWinAmount)) ? Number(pc.avgWinAmount) : defaultProfitControlParams.avgWinAmount;
  pc.avgLossAmount = Number.isFinite(Number(pc.avgLossAmount)) ? Number(pc.avgLossAmount) : defaultProfitControlParams.avgLossAmount;
  pc.strategy = pc.strategy || defaultProfitControlParams.strategy;
  pc.winFluctuationPercent = Number.isFinite(Number(pc.winFluctuationPercent)) ? Number(pc.winFluctuationPercent) : defaultProfitControlParams.winFluctuationPercent;
  pc.lossFluctuationPercent = Number.isFinite(Number(pc.lossFluctuationPercent)) ? Number(pc.lossFluctuationPercent) : defaultProfitControlParams.lossFluctuationPercent;

  form.action.params.applyToNewPositions = form.action.params.applyToNewPositions ?? true;
  form.action.params.duration = Number.isFinite(Number(form.action.params.duration)) ? Number(form.action.params.duration) : 0;
};

// 方法
const close = () => {
  emit("close");
};

const save = () => {
  normalize();

  if (!form.name.trim()) { alert("请输入规则名称"); return; }
  if (!form.description.trim()) { alert("请输入规则描述"); return; }
  if (!form.trigger.threshold || form.trigger.threshold <= 0) { alert("请设置有效的触发阈值"); return; }

  if (form.action.type === DELIVERY_RULE_ACTION.PROFIT_CONTROL) {
    const pc = form.action.params.profitControl;
    const winAmount = Number(pc.avgWinAmount);
    const lossAmount = Number(pc.avgLossAmount);
    const winFluct = Number(pc.winFluctuationPercent);
    const lossFluct = Number(pc.lossFluctuationPercent);

    if (!Number.isFinite(winAmount) || winAmount <= 0) { alert("请设置有效的单笔净盈利（大于 0）"); return; }
    if (!Number.isFinite(lossAmount) || lossAmount >= 0) { alert("请设置有效的单笔亏损（小于 0）"); return; }
    if (!Number.isFinite(winFluct) || winFluct < 0 || winFluct > 10) { alert("单笔净盈利波动比例需在 0 ~ 10 之间"); return; }
    if (!Number.isFinite(lossFluct) || lossFluct < 0 || lossFluct > 10) { alert("单笔亏损波动比例需在 0 ~ 10 之间"); return; }
  }

  emit("save", { ...form });
  close();
};

// 监听触发类型变化
watch(() => form.trigger.type, (newType) => {
  const config = triggerTypeOptions.find((opt) => opt.value === newType);
  if (config) form.trigger.threshold = config.defaultThreshold;
});

// 监听打开状态，初始化表单
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    if (props.rule && (props.mode === "edit" || props.mode === "duplicate")) {
      Object.assign(form, JSON.parse(JSON.stringify(props.rule)));
      if (props.mode === "duplicate") form.name = `${form.name} (副本)`;
      normalize();
    } else {
      // 重置为默认值
      Object.assign(form, {
        name: "",
        description: "",
        status: DELIVERY_RULE_STATUS.ENABLED,
        priority: DELIVERY_RULE_PRIORITY.MEDIUM,
        trigger: {
          type: DELIVERY_RULE_TRIGGER_TYPE.TRADE_COUNT,
          period: DELIVERY_RULE_TIME_PERIOD.LAST_1H,
          threshold: 20,
        },
        action: {
          type: DELIVERY_RULE_ACTION.PROFIT_CONTROL,
          params: {
            profitControl: {
              winProbability: 0.3,
              avgWinAmount: 20,
              avgLossAmount: -15,
              strategy: PROFIT_CONTROL_STRATEGY.SETTLEMENT_PRICE,
              winFluctuationPercent: 2,
              lossFluctuationPercent: 2,
            },
            applyToNewPositions: true,
            duration: 0,
            nextPositionCount: 1,
            lossPercent: 0.3,
            profitPercent: 0.2,
            lossFluctuationPercent: 2,
            winFluctuationPercent: 2,
          },
        },
      });
    }
  }
});
</script>

<template>
  <Transition name="modal">
    <div v-show="open" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <section class="flex h-[90vh] w-full max-w-6xl overflow-hidden rounded-lg bg-white shadow-2xl border border-black/[0.06]">
        <!-- 左侧配置区域 -->
        <div class="flex w-3/5 flex-col border-r border-black/[0.06]">
          <header class="flex items-center justify-between border-b border-black/[0.06] bg-white px-6 py-4">
            <div>
              <h2 class="text-lg font-semibold text-black/85">{{ modalTitle }}</h2>
              <p class="mt-1 text-sm text-black/65">配置自动化规则的触发条件和执行动作</p>
            </div>
            <AdminButton type="button" class="text-black/45 hover:text-black/85 transition-colors text-2xl leading-none" @click="close">×</AdminButton>
          </header>

          <div class="flex-1 space-y-6 overflow-y-auto px-6 py-6 bg-[#f0f2f5]">
            <!-- 基本信息 -->
            <section class="space-y-4 rounded-lg border border-black/[0.06] bg-white p-6 shadow-sm">
              <div class="flex items-center gap-3 mb-2">
                <div class="flex h-8 w-8 items-center justify-center rounded bg-black/5">
                  <svg class="h-4 w-4 text-black/45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <h3 class="text-sm font-semibold text-black/85">基本信息</h3>
              </div>

              <div class="space-y-4">
                <div class="space-y-1.5">
                  <label class="text-sm text-black/85 font-medium">规则名称 <span class="text-rose-500">*</span></label>
                  <p class="text-sm text-black/45">用于列表展示与搜索，建议简短清晰。</p>
                  <AdminInput v-model="form.name" type="text" placeholder="请输入规则名称" class="ant-input" />
                </div>
                <div class="space-y-1.5">
                  <label class="text-sm text-black/85 font-medium">规则描述</label>
                  <p class="text-sm text-black/45">补充说明规则的触发场景与目的，方便运营识别。</p>
                  <AdminTextarea v-model="form.description" rows="2" placeholder="请输入规则描述" class="ant-input"></AdminTextarea>
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">状态</label>
                    <p class="text-sm text-black/45">运行中会参与触发；已禁用将完全不生效。</p>
                    <AdminSelect v-model="form.status" class="ant-select">
                      <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </AdminSelect>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">优先级</label>
                    <p class="text-sm text-black/45">多条规则命中时，高优先级优先生效。</p>
                    <AdminSelect v-model="form.priority" class="ant-select">
                      <option v-for="opt in priorityOptions" :key="opt.value" :value="opt.value">{{ opt.icon }} {{ opt.label }}</option>
                    </AdminSelect>
                  </div>
                </div>
              </div>
            </section>

            <!-- 触发条件 -->
            <section class="space-y-4 rounded-lg border border-black/[0.06] bg-white p-6 shadow-sm">
              <div class="flex items-center gap-3 mb-2">
                <div class="flex h-8 w-8 items-center justify-center rounded bg-antd-primary/10">
                  <svg class="h-4 w-4 text-antd-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <h3 class="text-sm font-semibold text-black/85">触发条件</h3>
              </div>

              <div class="space-y-4">
                <div class="space-y-1.5">
                  <label class="text-sm text-black/85 font-medium">触发类型</label>
                  <p class="text-sm text-black/45">{{ currentTriggerConfig?.description }}</p>
                  <AdminSelect v-model="form.trigger.type" class="ant-select">
                    <option v-for="opt in triggerTypeOptions" :key="opt.value" :value="opt.value">{{ opt.icon }} {{ opt.label }}</option>
                  </AdminSelect>
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">触发阈值 <span class="text-rose-500">*</span></label>
                    <p class="text-sm text-black/45">达到阈值即触发；阈值越低触发越频繁。</p>
                    <div class="flex items-center gap-2">
                      <AdminInput v-model.number="form.trigger.threshold" type="number" class="ant-input" />
                      <span class="text-sm text-black/65">{{ currentTriggerConfig?.unit }}</span>
                    </div>
                  </div>
                  <div v-if="needsTimePeriod" class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">时间周期</label>
                    <p class="text-sm text-black/45">用于统计触发条件的时间窗口。</p>
                    <AdminSelect v-model="form.trigger.period" class="ant-select">
                      <option v-for="opt in timePeriodOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </AdminSelect>
                  </div>
                </div>
              </div>
            </section>

            <!-- 执行动作 -->
            <section class="space-y-4 rounded-lg border border-black/[0.06] bg-white p-6 shadow-sm">
              <div class="flex items-center gap-3 mb-2">
                <div class="flex h-8 w-8 items-center justify-center rounded bg-violet-100">
                  <svg class="h-4 w-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                </div>
                <h3 class="text-sm font-semibold text-black/85">执行动作</h3>
              </div>

              <div class="space-y-4">
                <div class="space-y-1.5">
                  <label class="text-sm text-black/85 font-medium">动作类型</label>
                  <p class="text-sm text-black/45">{{ currentActionConfig?.description }}</p>
                  <AdminSelect v-model="form.action.type" class="ant-select">
                    <option v-for="opt in actionTypeOptions" :key="opt.value" :value="opt.value">{{ opt.icon }} {{ opt.label }}</option>
                  </AdminSelect>
                </div>

                <!-- 盈亏控制参数 -->
                <div v-if="form.action.type === DELIVERY_RULE_ACTION.PROFIT_CONTROL" class="space-y-4 p-4 rounded-lg bg-black/[0.02] border border-black/[0.05]">
                  <div class="grid gap-4 sm:grid-cols-2">
                    <div class="space-y-1.5">
                      <label class="text-sm text-black/65">盈利概率 ({{ (form.action.params.profitControl.winProbability * 100).toFixed(0) }}%)</label>
                      <p class="text-sm text-black/45">控制长期命中率，越低越偏向亏损结算。</p>
                      <AdminSlider v-model.number="form.action.params.profitControl.winProbability" min="0" max="1" step="0.01" class="w-full h-1.5 bg-black/10 rounded-lg appearance-none cursor-pointer accent-antd-primary" />
                    </div>
                    <div class="space-y-1.5">
                      <label class="text-sm text-black/65">预期盈亏值 (EV)</label>
                      <p class="text-sm text-black/45">根据当前参数计算的用户盈利预估值。</p>
                      <div class="text-sm font-mono font-medium" :class="calculatedExpectedValue >= 0 ? 'text-emerald-500' : 'text-rose-500'">{{ calculatedExpectedValue.toFixed(2) }}%</div>
                    </div>
                    <div class="space-y-1.5">
                      <label class="text-sm text-black/65">单笔净盈利 %</label>
                      <AdminInput v-model.number="form.action.params.profitControl.avgWinAmount" type="number" class="ant-input !py-2" />
                      <p class="text-sm text-black/45">单次盈利结算的基准百分比。</p>
                    </div>
                    <div class="space-y-1.5">
                      <label class="text-sm text-black/65">单笔亏损 %</label>
                      <AdminInput v-model.number="form.action.params.profitControl.avgLossAmount" type="number" class="ant-input !py-2" />
                      <p class="text-sm text-black/45">单次亏损结算的基准百分比。</p>
                    </div>
                    <div class="space-y-1.5">
                      <div class=" flex items-center gap-2 justify-between">
                        <label class="text-sm text-black/65">盈利波动比例 ±</label>
                          <AdminInput v-model.number="form.action.params.profitControl.winFluctuationPercent" type="number" min="0" max="10" step="0.1" class="ant-input !py-2 !w-28" />
                        <div class="text-sm">
                          %
                        </div>
                      </div>
                      <p class="text-sm text-black/45">实际净盈利范围：{{ winAmountRangeText }}</p>
                    </div>
                    <div class="space-y-1.5">
                      <div class=" flex items-center gap-2 justify-between">
                          <label class="text-sm text-black/65">亏损波动比例 ±</label>
                          <AdminInput v-model.number="form.action.params.profitControl.lossFluctuationPercent" type="number" min="0" max="10" step="0.1" class="ant-input !py-2 !w-28" />
                          <div class="text-sm">
                          %
                        </div>
                        </div>
                      <p class="text-sm text-black/45">实际亏损范围：{{ lossAmountRangeText }}</p>
                    </div>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm text-black/65">价格修正策略</label>
                    <p class="text-sm text-black/45">选择结算价格修正方式，影响成交与盈亏分布。通过修正尽量的减少用户感知</p>
                    <div class="grid grid-cols-2 gap-2">
                      <AdminButton v-for="opt in profitControlStrategyOptions" :key="opt.value" type="button" @click="form.action.params.profitControl.strategy = opt.value" :class="form.action.params.profitControl.strategy === opt.value ? 'border-antd-primary bg-antd-primary/5 text-antd-primary' : 'border-black/10 bg-white text-black/65'" class="text-sm py-2 px-3 border rounded-md transition-all">
                        <div class=" flex  flex-col items-start">
                          <div> {{ opt.label }}</div>
                         <div class="text-sm text-black/45">{{ opt.description }}</div>
                        </div>
                      </AdminButton>
                    </div>
                  </div>
                </div>

                <!-- 强制盈亏参数 -->
                <div v-if="form.action.type === DELIVERY_RULE_ACTION.FORCE_WIN || form.action.type === DELIVERY_RULE_ACTION.FORCE_LOSS" class="space-y-4 p-4 rounded-lg bg-black/[0.02] border border-black/[0.05]">
                  <div class="grid gap-4 sm:grid-cols-2">
                    <div class="space-y-1.5">
                      <label class="text-sm text-black/65">影响订单数</label>
                      <p class="text-sm text-black/45">对后续 N 单进行强制干预。</p>
                      <AdminInput v-model.number="form.action.params.nextPositionCount" type="number" class="ant-input !py-2" />
                    </div>
                    <div class="space-y-1.5">
                      <label class="text-sm text-black/65">{{ form.action.type === DELIVERY_RULE_ACTION.FORCE_WIN ? '盈利' : '亏损' }}比例 %</label>
                      <p class="text-sm text-black/45">设置强制结算的百分比幅度。</p>
                      <AdminInput v-if="form.action.type === DELIVERY_RULE_ACTION.FORCE_WIN" v-model.number="form.action.params.profitPercent" type="number" class="ant-input !py-2" />
                      <AdminInput v-else v-model.number="form.action.params.lossPercent" type="number" class="ant-input !py-2" />
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-4 pt-2">
                  <AdminCheckbox class="flex items-center gap-2 cursor-pointer" v-model="form.action.params.applyToNewPositions">

                    <span class="text-sm text-black/65">仅应用于新开仓位</span>
                  </AdminCheckbox>
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-black/65">持续时长</span>
                    <AdminInput v-model.number="form.action.params.duration" type="number" class="ant-input !py-1 !px-2 !w-20 !text-sm" />
                    <span class="text-sm text-black/65">分钟</span>
                  </div>
                </div>
                <p class="text-sm text-black/45">持续时长为 0 表示规则仅生效一次。</p>
              </div>
            </section>
          </div>

          <footer class="flex justify-end gap-3 border-t border-black/[0.06] bg-white px-6 py-4">
            <AdminButton type="button" class="ant-btn" @click="close">取消</AdminButton>
            <AdminButton type="button" class="ant-btn ant-btn-primary" @click="save">保存规则</AdminButton>
          </footer>
        </div>

        <!-- 右侧帮助区域 -->
        <div class="flex w-2/5 flex-col bg-black/[0.01]">
          <header class="border-b border-black/[0.06] px-6 py-4">
            <h3 class="text-base font-semibold text-black/85">配置说明</h3>
            <p class="mt-1 text-sm text-black/65">帮助您更好地理解规则配置项</p>
          </header>
          <div class="flex-1 overflow-y-auto px-6 py-6 space-y-8 help-section">
            <div class="space-y-3">
              <h4 class="text-sm font-semibold text-black/85">触发机制</h4>
              <p class="text-sm text-black/65 leading-relaxed">
                系统实时监控交易行为。当满足设定阈值时，规则将立即生效。
                <br /><br />
                <span class="text-sm text-black/60 italic">提示：阈值越高，规则触发频率越低，建议从小额开始测试。</span>
              </p>
            </div>

            <div class="space-y-3">
              <h4 class="text-sm font-semibold text-black/85">盈亏控制 (线控)</h4>
              <p class="text-sm text-black/65 leading-relaxed">
                通过算法在合理范围内选择结算价格。长期来看，用户的实际盈亏将趋近于您设定的期望值。
              </p>
              <div class="p-3 rounded bg-blue-50/50 border border-blue-100/50">
                <p class="text-sm font-bold text-blue-600 mb-1">期望值公式</p>
                <p class="text-xs text-blue-500 font-mono">EV = (Win% * WinProb) + (Loss% * (1 - WinProb))</p>
              </div>

            </div>

            <div class="space-y-3">
              <h4 class="text-sm font-semibold text-black/85"> 价格修正策略:</h4>
              <p class="text-sm text-black/65 leading-relaxed">
                 <b>无策略：</b>不考虑价格修正，直接按照计算出来的结果执行用户的盈亏
                  <br />
                  <b>时间窗口：</b>在交易时间内根据盈利概率的结果，获取区间内最低价格，来对概率价格进行修正，开仓是以修正后的价格为准。
              </p>

            </div>

            <div class="space-y-4">
              <h4 class="text-sm font-semibold text-black/85">常用场景配置</h4>
              <div class="space-y-3">
                <div class="group p-3 bg-white rounded border border-black/[0.05] hover:border-antd-primary/30 transition-all">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-semibold text-black/85">连胜风控</span>
                    <span class="text-xs px-1 bg-blue-50 text-blue-600 rounded">推荐</span>
                  </div>
                  <p class="text-sm text-black/65">当用户连赢 5 次后，将盈利概率降至 20%，平衡系统亏损。</p>
                </div>
                <div class="p-3 bg-white rounded border border-black/[0.05]">
                  <div class="font-semibold text-sm text-black/85 mb-1">异常大额盈利</div>
                  <p class="text-sm text-black/65">单笔盈利超过 5000 USDT 时，下一单强制亏损 30% 进行干预。</p>
                </div>
              </div>
            </div>

            <div class="rounded-lg bg-amber-50 border border-amber-200/60 p-4">
              <div class="flex items-center gap-2 text-amber-800 mb-2">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                <span class="text-sm font-semibold">风险提示</span>
              </div>
              <ul class="text-sm text-amber-800/80 space-y-2 list-disc pl-4">
                <li>高优先级规则会覆盖低优先级规则.</li>
                <li>持续时间为 0 表示规则仅生效一次.</li>
                <li>所有金额单位均为 USDT.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

/* 侧边说明栏美化 */
.help-section h4 {
  @apply relative pl-3;
}
.help-section h4::before {
  content: '';
  @apply absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3 rounded-full bg-antd-primary;
}
</style>
