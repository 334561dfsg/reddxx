/** AI量化交易 · 管理端操作日志（与产品、订单收益调整等页联动） */

export const AI_QUANT_OP_MODULE = {
  PRODUCT: 'product',
  ORDER: 'order',
  YIELD_ADJUSTMENT: 'yield_adjustment'
}

export const AI_QUANT_OP_MODULE_LABEL = {
  [AI_QUANT_OP_MODULE.ORDER]: '量化订单',
  [AI_QUANT_OP_MODULE.PRODUCT]: '量化产品',
  [AI_QUANT_OP_MODULE.YIELD_ADJUSTMENT]: '订单收益调整'
}

export const AI_QUANT_OP_ACTION = {
  ORDER_FORCE_REDEEM: 'order_force_redeem',
  PRODUCT_CREATE: 'product_create',
  PRODUCT_UPDATE: 'product_update',
  PRODUCT_STATUS: 'product_status',
  YIELD_ADJUSTMENT_SUBMIT: 'yield_adjustment_submit'
}

export const AI_QUANT_OP_ACTION_LABEL = {
  [AI_QUANT_OP_ACTION.ORDER_FORCE_REDEEM]: '强制赎回订单',
  [AI_QUANT_OP_ACTION.PRODUCT_CREATE]: '新建产品',
  [AI_QUANT_OP_ACTION.PRODUCT_UPDATE]: '编辑产品',
  [AI_QUANT_OP_ACTION.PRODUCT_STATUS]: '变更产品状态',
  [AI_QUANT_OP_ACTION.YIELD_ADJUSTMENT_SUBMIT]: '提交收益调整'
}
