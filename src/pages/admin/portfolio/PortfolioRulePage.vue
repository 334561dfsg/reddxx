<script setup>
// 投资组合规则说明 — static guide page on the Ant Design Pro shell (2026-11-28): PageShell title + Cards.
import { Card, Col, Row, TypographyParagraph, TypographyText } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import { earlyRedeemModeMeta } from '../../../admin/constants/portfolio'

const formulas = [
  '最低收益 = 申购金额 × 最低日收益率 / 100 × 运行天数',
  '最高收益 = 申购金额 × 最高日收益率 / 100 × 运行天数',
  '手续费 = 申购金额 × 认购手续费率 / 100',
  '预计到账 = 申购金额 + 预估收益 - 手续费'
]
</script>

<template>
  <PageShell title="投资组合规则说明">
    <Card title="产品定位" :bordered="false">
      <TypographyParagraph>
        投资组合是固定期限收益产品。用户以 USDT 申购一个多币种组合，平台展示组合币种、运行周期、收益区间、手续费和提前赎回规则。本期前端仅使用 mock 数据模拟，不执行真实调仓或钱包扣款。
      </TypographyParagraph>
    </Card>

    <Card title="收益与手续费公式" :bordered="false">
      <TypographyParagraph v-for="formula in formulas" :key="formula"><TypographyText code>{{ formula }}</TypographyText></TypographyParagraph>
      <TypographyParagraph type="secondary">例如申购 1000 USDT，周期 3 天，日收益 0.20% - 0.60%，手续费 0.30%，预计收益为 6 - 18 USDT，手续费 3 USDT。</TypographyParagraph>
    </Card>

    <Card title="提前赎回配置" :bordered="false">
      <Row :gutter="[16, 16]">
        <Col v-for="(meta, key) in earlyRedeemModeMeta" :key="key" :xs="24" :md="8">
          <Card size="small" :title="meta.label">
            <TypographyText type="secondary">{{ meta.desc }}。</TypographyText>
          </Card>
        </Col>
      </Row>
    </Card>
  </PageShell>
</template>
