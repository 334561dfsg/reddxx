# Admin Voice Alert Settings Design

## Goal

Add an independent system settings page for admin voice alerts. Operators can decide whether admin sounds play at all, and can enable or disable each supported alert event.

## Scope

- Add `系统设置 / 语音提醒` as its own admin menu item and route.
- Persist the settings in the existing site configuration mock so the shape can later map to a backend payload.
- Provide a page-level total switch and individual event switches for:
  - 客服提示音
  - 充值
  - 提现
  - 充值成功
  - MT新交易订单（外汇，贵金属）
  - MT 新增持仓（外汇，贵金属）
  - MT 平仓（外汇，贵金属）
  - MT 用户登陆（外汇，贵金属）
  - 永续合约新交易订单
  - 交割合约新交易订单
  - 认证
  - 借贷申请
  - 借贷还款

## Design

The new page will use explicit-save settings semantics. Editing switches changes a local draft; the existing `siteConfigApi.updateSiteConfig` persists only after the operator clicks Save. Defaults are safe and backwards-compatible: the global sound switch and all individual event switches are enabled.

The configuration model is:

```js
{
  voiceAlerts: {
    enabled: true,
    events: {
      customerService: true,
      deposit: true,
      withdraw: true,
      depositSuccess: true,
      mtNewTradeOrder: true,
      mtNewPosition: true,
      mtClosePosition: true,
      mtUserLogin: true,
      perpetualNewTradeOrder: true,
      deliveryNewTradeOrder: true,
      verification: true,
      lendingApplication: true,
      lendingRepayment: true
    }
  }
}
```

Unknown event keys are discarded during normalization. Missing event keys default to enabled so older saved configs do not silently lose alerts after deployment.

## Verification

- Unit tests cover defaults, normalization, route registration, nav registration, and page source expectations.
- Build verification confirms the new Vue page compiles.
- Runtime browser, touch, 200% zoom, screen reader, permission switching, and mobile safe-area checks are not available in this coding turn and must be reported as unverified.
