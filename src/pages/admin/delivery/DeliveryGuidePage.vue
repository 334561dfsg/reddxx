<script setup>
// 场控使用指南 — static guide on the Ant Design Pro shell (2026-11-28): PageShell title + Card with Ant Tabs (still synced
// to ?tab=) and Card/Descriptions content.
import { computed } from 'vue'
import { Alert, Card, Col, Descriptions, DescriptionsItem, Row, Space, TabPane, Tabs, Tag, TypographyParagraph, TypographyText } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import { useRoute, useRouter } from 'vue-router'
import {
  deliveryControlScopes,
  deliveryFaqs,
  deliveryGuideTabs,
  deliveryOperationGuide,
  deliveryOverview,
  deliveryScenarios,
  deliveryTermSections
} from '../../../admin/mock/deliveryGuide'

const route = useRoute()
const router = useRouter()

const tabs = deliveryGuideTabs

const activeTab = computed(() => {
  const key = String(route.query.tab || 'overview')
  return tabs.some((item) => item.key === key) ? key : 'overview'
})

const onTabChange = (key) => {
  router.replace({ query: { ...route.query, tab: key } })
}
</script>

<template>
  <PageShell title="场控使用指南">

    <Card :bordered="false" :body-style="{ paddingTop: '8px' }">
      <Tabs :active-key="activeTab" @change="onTabChange">
        <TabPane v-for="tab in tabs" :key="tab.key" :tab="tab.label" />
      </Tabs>

      <div v-if="activeTab === 'overview'" class="guide-section">
        <Card size="small" title="什么是场控">
          <TypographyParagraph>{{ deliveryOverview.intro }}</TypographyParagraph>
          <Alert type="warning" show-icon :message="deliveryOverview.warning" />
        </Card>
        <Row :gutter="[24, 24]">
          <Col v-for="scope in deliveryControlScopes" :key="scope.title" :xs="24" :xl="12">
            <Card size="small" :title="scope.title" class="h-full">
              <ul class="guide-list">
                <li v-for="point in scope.points" :key="point">{{ point }}</li>
              </ul>
            </Card>
          </Col>
        </Row>
      </div>

      <div v-else-if="activeTab === 'terms'" class="guide-section">
        <Card v-for="section in deliveryTermSections" :key="section.title" size="small" :title="section.title">
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem v-for="term in section.items" :key="term.zh">
              <template #label>
                <Space direction="vertical" :size="0">
                  <span>{{ term.zh }}</span>
                  <TypographyText type="secondary">{{ term.en }}</TypographyText>
                </Space>
              </template>
              {{ term.desc }}
            </DescriptionsItem>
          </Descriptions>
        </Card>
      </div>

      <div v-else-if="activeTab === 'operations'" class="guide-section">
        <Card v-for="item in deliveryOperationGuide" :key="item.title" size="small" :title="item.title">
          <ol class="guide-list guide-list--ordered">
            <li v-for="step in item.steps" :key="step">{{ step }}</li>
          </ol>
        </Card>
      </div>

      <div v-else-if="activeTab === 'examples'" class="guide-section">
        <Card v-for="scene in deliveryScenarios" :key="scene.title" size="small" :title="scene.title">
          <TypographyParagraph>场景描述：{{ scene.desc }}</TypographyParagraph>
          <template v-if="scene.calc?.length">
            <TypographyText strong>计算过程</TypographyText>
            <ul class="guide-list">
              <li v-for="line in scene.calc" :key="line">{{ line }}</li>
            </ul>
          </template>
          <TypographyText strong>操作步骤</TypographyText>
          <ol class="guide-list guide-list--ordered">
            <li v-for="step in scene.steps" :key="step">{{ step }}</li>
          </ol>
          <TypographyParagraph class="guide-expected"><Tag color="green">预期效果</Tag>{{ scene.expected }}</TypographyParagraph>
        </Card>
      </div>

      <div v-else class="guide-section">
        <Card v-for="item in deliveryFaqs" :key="item.q" size="small" :title="`Q：${item.q}`">
          <TypographyParagraph class="mb-0">{{ item.a }}</TypographyParagraph>
        </Card>
      </div>
    </Card>
  </PageShell>
</template>

<style scoped>
.guide-section {
  display: grid;
  gap: 16px;
  padding-top: 8px;
}
.guide-list {
  margin: 8px 0 12px;
  padding-left: 20px;
  list-style: disc;
  line-height: 1.8;
}
.guide-list--ordered {
  list-style: decimal;
}
.guide-expected {
  margin-bottom: 0;
}
</style>
