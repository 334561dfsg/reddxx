import { LENDING_CREDIT_PERM } from '../constants/lendingCreditPermissions.js'

export const navTree = [
  {
    title: '仪表盘',
    icon: 'dashboard',
    path: '/admin'
  },
  { title: '客服管理', icon: 'customer-service', path: '/admin/customer-service/workbench' },
  { title: '合约场控面板', icon: 'contract', path: '/admin/contracts/panel' },
  {
    title: '用户管理',
    icon: 'users',
    children: [
      { title: '用户列表', path: '/admin/users/list' },
      { title: '出金审核', path: '/admin/users/withdraw-audit' },
      { title: '入金审核', path: '/admin/users/deposit-orders' },
      { title: '用户标签规则', path: '/admin/users/tag-rules' },
      { title: '用户点控日志', path: '/admin/users/control-log' }
    ]
  },
  {
    title: '会员管理',
    icon: 'vip',
    children: [
      { title: 'VIP等级配置', path: '/admin/users/vip-config' },
      { title: 'VIP升级日志', path: '/admin/users/vip-upgrades' },
      { title: '信用分配置', path: '/admin/users/credit-score-config' },
      { title: '信用分变动审核', path: '/admin/users/credit-score-audit' },
      { title: '信用分变动日志', path: '/admin/users/credit-score-changes' },
      { title: '认证等级配置', path: '/admin/users/verification-config' },
      { title: '认证身份审核', path: '/admin/users/verification-audit' },
      { title: '认证审核日志', path: '/admin/users/verification-log' },
      { title: '出金策略', path: '/admin/users/withdraw-policy' },
    ]
  },
  {
    title: '代理/分销',
    icon: 'users-group',
    children: [
      { title: '代理列表', path: '/admin/agent/management' },
      { title: '代理报表', path: '/admin/agent/agent-report' },
      { title: '代理记佣配置', path: '/admin/agent/agent-commission-config' },
      { title: '代理佣金结算', path: '/admin/agent/agent-commission-settlement' },
      { title: '裂变分销配置', path: '/admin/agent/referral-config' },
      { title: '裂变分佣记录', path: '/admin/agent/referral-commission' },
      { title: '裂变分销统计', path: '/admin/agent/referral-statistics' }
    ]
  },
  {
    title: '永续合约',
    icon: 'contract',
    children: [
      { title: '合约产品', path: '/admin/perpetual/overview' },
      { title: '杠杆模板', path: '/admin/perpetual/leverage-template' },
      { title: '订单管理', path: '/admin/perpetual/orders' },
      { title: '用户控盘', path: '/admin/perpetual/user-control' },
      { title: '合约线控', path: '/admin/perpetual/contract-monitor' },
      { title: '手动插线', path: '/admin/perpetual/manual-line' },
      { title: '合约线控日志', path: '/admin/perpetual/contract-log' },
      { title: '线控决策报表', path: '/admin/perpetual/report' },
      { title: '使用指南', path: '/admin/perpetual/guide' }
    ]
  },
  {
    title: '交割合约',
    icon: 'delivery',
    children: [
      { title: '合约产品', path: '/admin/delivery/contracts' },
      { title: '周期模板', path: '/admin/delivery/templates' },
      { title: '订单管理', path: '/admin/delivery/orders' },
      { title: '用户控盘', path: '/admin/delivery/user-control' },
      { title: '自动化场控', path: '/admin/delivery/auto-rules' },
      { title: '手动场控', path: '/admin/delivery/control' },
      { title: '手动场控（Radar）', path: '/admin/delivery/harvest-control' },
      { title: '场控触发日志', path: '/admin/delivery/rule-history' },
      // { title: '规则效果统计', path: '/admin/delivery/rule-statistics' },
      { title: '场控决策报表', path: '/admin/delivery/report' },
      { title: '使用指南', path: '/admin/delivery/guide' }
    ]
  },
   {
    title: '现货交易',
    icon: 'exchange',
    children: [
      { title: '产品管理', path: '/admin/spot/products' },
      { title: '订单管理', path: '/admin/spot/orders' },
      { title: '用户控盘', path: '/admin/spot/user-control' }
    ]
  },
  {
    title: '资产管理',
    icon: 'wallet',
    children: [
      { title: '币种管理', path: '/admin/assets/currencies' },
      { title: '公共收款地址', path: '/admin/assets/public-deposit-addresses' },
      { title: '交易对管理', path: '/admin/spot/symbols' },
      { title: '手动归集', path: '/admin/assets/manual-collect' },
      { title: '归集记录', path: '/admin/assets/collect-records' },
      { title: '链上交易日志', path: '/admin/assets/address-logs' },
      { title: '闪兑汇率管理', path: '/admin/assets/exchange-rate' },
      { title: '闪兑费率模板', path: '/admin/assets/fee-template' },
    ]
  },
  {
    title: '流动性挖矿',
    icon: 'droplet',
    defaultOpen: true,
    children: [
      { title: '产品管理', path: '/admin/liquidity/locked/products' },
      { title: '收益调控', path: '/admin/liquidity/locked/yield-control' },
      { title: '收益调整日志', path: '/admin/liquidity/locked/yield-adjustment-log' },
      { title: '操作日志', path: '/admin/liquidity/locked/operation-log' },
      { title: '订单管理', path: '/admin/liquidity/locked/orders' },
      { title: '用户点控', path: '/admin/liquidity/locked/user-yield-control' },
      { title: '规则说明', path: '/admin/liquidity/locked/rules' }
    ]
  },
  {
    title: '信用借贷',
    icon: 'loan',
    children: [
      { title: '产品管理', path: '/admin/lending/products' },
      { title: '订单管理', path: '/admin/lending/orders' },
      { title: '还款记录', path: '/admin/lending/repayment' },
      { title: '操作日志', path: '/admin/lending/operation-log' },
      {
        title: '授信中心',
        path: '/admin/lending/credit-policy',
        /** 额度模板或评分与规则任一权限即可见入口 */
        permAny: [LENDING_CREDIT_PERM.EDIT_LIMITS, LENDING_CREDIT_PERM.EDIT_SCORECARD]
      },
      { title: '规则说明', path: '/admin/lending/guide' }
    ]
  },
  {
    title: 'AI量化交易',
    icon: 'robot',
    children: [
      { title: '产品管理', path: '/admin/ai-quant/products' },
      { title: '订单管理', path: '/admin/ai-quant/orders' },
      { title: '用户点控', path: '/admin/ai-quant/user-yield-control' },
      { title: '收益调整记录', path: '/admin/ai-quant/yield-records' },
      { title: '操作日志', path: '/admin/ai-quant/operation-log' },
      { title: '规则说明', path: '/admin/ai-quant/rules' }
    ]
  },
  {
    title: '投资组合',
    icon: 'finance',
    children: [
      { title: '产品管理', path: '/admin/portfolio/products' },
      { title: '收益调控', path: '/admin/portfolio/yield-control' },
      { title: '收益调整日志', path: '/admin/portfolio/yield-adjustment-log' },
      { title: '订单管理', path: '/admin/portfolio/orders' },
      { title: '用户点控', path: '/admin/portfolio/user-yield-control' },
      { title: '收益记录', path: '/admin/portfolio/yield-records' },
      { title: '操作日志', path: '/admin/portfolio/operation-log' },
      { title: '规则说明', path: '/admin/portfolio/rules' }
    ]
  },

  {
    title: '系统设置',
    icon: 'spark',
    children: [
      { title: '站点配置', path: '/admin/system/site-config' },
      { title: '社媒配置', path: '/admin/system/social-links' },
      { title: '内容页配置', path: '/admin/system/content-pages' },
      { title: '短信通道', path: '/admin/system/sms-channels' },
      { title: '邮件服务 (SMTP)', path: '/admin/system/smtp-settings' },
      { title: '语言与区号', path: '/admin/system/locale-settings' },
      { title: '错误码管理', path: '/admin/system/error-codes' }
    ]
  },
 
]
