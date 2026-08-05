import { PERPETUAL_STATUS } from '../constants/perpetual'

const clone = (value) => JSON.parse(JSON.stringify(value))

export const perpetualLeverageLevels = [1, 2, 3, 5, 10, 20, 25, 50, 75, 100, 125]

export const createDefaultPerpetualControlConfig = () => ({
  priceOffset: 5,
  offsetDirection: 'random',
  slippagePct: 0.15,
  latencyMs: 50,
  maxLeverage: 100,
  autoTriggerEnabled: true
})

export const createDefaultPerpetualTemplateContractConfig = () => ({
  orderMode: 'cost',
  contractFaceValueUsdt: 1000,
  maintenanceMarginRate: 0.5,
  liquidationFeeRate: 0,
  tradeLimitUnlimited: false
})

const perpetualTemplates = [
  {
    id: 'all-levels',
    name: '全档位 杠杆模板',
    status: PERPETUAL_STATUS.ENABLED,
    leverageRange: '1x - 125x',
    leverageCount: 11,
    inUseCount: 1,
    levels: ['1x', '2x', '3x', '5x', '10x', '20x', '25x', '50x', '75x', '100x', '125x'],
    contracts: ['BTC永续']
  },
  {
    id: 'standard',
    name: '标准 杠杆模板',
    status: PERPETUAL_STATUS.ENABLED,
    leverageRange: '1x - 100x',
    leverageCount: 10,
    inUseCount: 1,
    levels: ['1x', '2x', '3x', '5x', '10x', '20x', '25x', '50x', '75x', '100x'],
    contracts: ['ETH永续']
  },
  {
    id: 'aggressive',
    name: '激进型 杠杆模板',
    status: PERPETUAL_STATUS.ENABLED,
    leverageRange: '20x - 125x',
    leverageCount: 5,
    inUseCount: 0,
    levels: ['20x', '50x', '75x', '100x', '125x'],
    contracts: []
  },
  {
    id: 'conservative',
    name: '保守型 杠杆模板',
    status: PERPETUAL_STATUS.ENABLED,
    leverageRange: '1x - 20x',
    leverageCount: 6,
    inUseCount: 0,
    levels: ['1x', '2x', '3x', '5x', '10x', '20x'],
    contracts: []
  },
  {
    id: 'crypto-special',
    name: '加密货币特供 模板',
    status: PERPETUAL_STATUS.ENABLED,
    leverageRange: '1x - 50x',
    leverageCount: 7,
    inUseCount: 0,
    levels: ['1x', '2x', '3x', '5x', '10x', '20x', '50x'],
    contracts: []
  },
  {
    id: 'vip-exclusive',
    name: 'VIP 专属杠杆模板',
    status: PERPETUAL_STATUS.DISABLED,
    leverageRange: '1x - 150x',
    leverageCount: 12,
    inUseCount: 0,
    levels: ['1x', '2x', '3x', '5x', '10x', '20x', '25x', '50x', '75x', '100x', '125x', '150x'],
    contracts: []
  }
]

const perpetualProducts = [
  {
    id: 'btc-perp',
    sortOrder: 80,
    name: 'BTC永续',
    code: 'BTC_PERP',
    pair: 'BTC/USDT',
    status: PERPETUAL_STATUS.ENABLED,
    templateId: 'all-levels',
    templateName: '全档位 杠杆模板',
    leverageRange: '1x - 125x',
    buyRange: '10 - 100,000 USDT',
    maxPosition: '500,000 USDT',
    minBuy: '10 USDT',
    maxBuy: '100,000 USDT',
    buyFee: '0.020%',
    sellFee: '0.050%',
    leverageBadges: ['1x', '2x', '3x', '5x', '10x', '20x', '+5']
  },
  {
    id: 'eth-perp',
    sortOrder: 70,
    name: 'ETH永续',
    code: 'ETH_PERP',
    pair: 'ETH/USDT',
    status: PERPETUAL_STATUS.ENABLED,
    templateId: 'standard',
    templateName: '标准 杠杆模板',
    leverageRange: '1x - 100x',
    buyRange: '10 - 50,000 USDT',
    maxPosition: '300,000 USDT',
    minBuy: '10 USDT',
    maxBuy: '50,000 USDT',
    buyFee: '0.020%',
    sellFee: '0.050%',
    leverageBadges: ['1x', '2x', '3x', '5x', '10x', '20x', '+4']
  },
  {
    id: 'sol-perp',
    sortOrder: 60,
    name: 'SOL永续',
    code: 'SOL_PERP',
    pair: 'SOL/USDT',
    status: PERPETUAL_STATUS.ENABLED,
    templateId: 'standard',
    templateName: '标准 杠杆模板',
    leverageRange: '1x - 100x',
    buyRange: '5 - 20,000 USDT',
    maxPosition: '100,000 USDT',
    minBuy: '5 USDT',
    maxBuy: '20,000 USDT',
    buyFee: '0.030%',
    sellFee: '0.060%',
    leverageBadges: ['1x', '2x', '3x', '5x', '10x', '20x', '+4']
  },
  {
    id: 'ada-perp',
    sortOrder: 50,
    name: 'ADA永续',
    code: 'ADA_PERP',
    pair: 'ADA/USDT',
    status: PERPETUAL_STATUS.DISABLED,
    templateId: 'standard',
    templateName: '标准 杠杆模板',
    leverageRange: '1x - 100x',
    buyRange: '10 - 10,000 USDT',
    maxPosition: '50,000 USDT',
    minBuy: '10 USDT',
    maxBuy: '10,000 USDT',
    buyFee: '0.040%',
    sellFee: '0.080%',
    leverageBadges: ['1x', '2x', '3x', '5x', '10x', '20x', '+4']
  },
  {
    id: 'dot-perp',
    sortOrder: 40,
    name: 'DOT永续',
    code: 'DOT_PERP',
    pair: 'DOT/USDT',
    status: PERPETUAL_STATUS.ENABLED,
    templateId: 'standard',
    templateName: '标准 杠杆模板',
    leverageRange: '1x - 100x',
    buyRange: '10 - 15,000 USDT',
    maxPosition: '80,000 USDT',
    minBuy: '10 USDT',
    maxBuy: '15,000 USDT',
    buyFee: '0.030%',
    sellFee: '0.060%',
    leverageBadges: ['1x', '2x', '3x', '5x', '10x', '20x', '+4']
  },
  {
    id: 'doge-perp',
    sortOrder: 30,
    name: 'DOGE永续',
    code: 'DOGE_PERP',
    pair: 'DOGE/USDT',
    status: PERPETUAL_STATUS.ENABLED,
    templateId: 'standard',
    templateName: '标准 杠杆模板',
    leverageRange: '1x - 100x',
    buyRange: '10 - 5,000 USDT',
    maxPosition: '30,000 USDT',
    minBuy: '10 USDT',
    maxBuy: '5,000 USDT',
    buyFee: '0.050%',
    sellFee: '0.100%',
    leverageBadges: ['1x', '2x', '3x', '5x', '10x', '20x', '+4']
  },
  {
    id: 'xau-perp',
    sortOrder: 20,
    name: 'XAU永续',
    code: 'XAU_PERP',
    pair: 'XAU/USDT',
    status: PERPETUAL_STATUS.ENABLED,
    templateId: 'standard',
    templateName: '标准 杠杆模板',
    leverageRange: '1x - 100x',
    buyRange: '10 - 20,000 USDT',
    maxPosition: '120,000 USDT',
    minBuy: '10 USDT',
    maxBuy: '20,000 USDT',
    buyFee: '0.020%',
    sellFee: '0.050%',
    leverageBadges: ['1x', '2x', '3x', '5x', '10x', '20x', '+4']
  },
  {
    id: 'usd-perp',
    sortOrder: 10,
    name: 'USD永续',
    code: 'USD_PERP',
    pair: 'USD/USDT',
    status: PERPETUAL_STATUS.DISABLED,
    templateId: 'conservative',
    templateName: '保守型 杠杆模板',
    leverageRange: '1x - 20x',
    buyRange: '10 - 200,000 USDT',
    maxPosition: '500,000 USDT',
    minBuy: '10 USDT',
    maxBuy: '200,000 USDT',
    buyFee: '0.010%',
    sellFee: '0.020%',
    leverageBadges: ['1x', '2x', '3x', '5x', '10x', '20x']
  }
]

const perpetualControlConfigs = {
  BTCUSDT: createDefaultPerpetualControlConfig(),
  ETHUSDT: {
    priceOffset: 2,
    offsetDirection: 'random',
    slippagePct: 0.1,
    latencyMs: 30,
    maxLeverage: 75,
    autoTriggerEnabled: false
  }
}

let perpetualTemplatesState = clone(perpetualTemplates)

export const perpetualProductStatusMeta = {
  [PERPETUAL_STATUS.ENABLED]: {
    text: '已启用',
    badgeClass: 'bg-emerald-100 text-emerald-700'
  },
  [PERPETUAL_STATUS.DISABLED]: {
    text: '已禁用',
    badgeClass: 'bg-rose-100 text-rose-700'
  }
}

export const createPerpetualTemplatesMock = () =>
  clone(perpetualTemplatesState).map((template) => ({
    ...createDefaultPerpetualTemplateContractConfig(),
    ...template
  }))

export const savePerpetualTemplatesMock = (nextTemplates = []) => {
  perpetualTemplatesState = clone(nextTemplates)
  return createPerpetualTemplatesMock()
}

export const createPerpetualProductsMock = () => clone(perpetualProducts)
export const createPerpetualControlConfigsMock = () => clone(perpetualControlConfigs)
