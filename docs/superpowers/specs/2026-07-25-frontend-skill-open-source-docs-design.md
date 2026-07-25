# 前端产品交互规范 Skill 开源文档设计

## 目标

为公开仓库 `gloopai/frontend-product-interaction-standards` 增加清晰、可验证的中文使用说明和标准开源治理文件，使其他 Codex 用户能够安装、使用、更新、卸载和参与贡献。

## 发布文件

公开 Skill 仓库新增以下五个文件：

```text
README.md
LICENSE
CONTRIBUTING.md
CODE_OF_CONDUCT.md
SECURITY.md
```

不在公开仓库加入内部设计文档、实施计划、测试日志、Issue 模板、PR 模板、CI 或自动发布配置。

## README

`README.md` 是使用者入口，包含：

1. 项目定位和当前能力。
2. 三条 Dialog 规范摘要，并链接到 `references/dialogs.md`。
3. 系统要求：Git、Codex、可写的 `~/.codex/skills/`。
4. 使用 HTTPS 克隆到固定目录的安装命令。
5. 自动触发说明和 `$frontend-product-interaction-standards` 显式使用示例。
6. 使用 `git pull --ff-only` 更新的命令。
7. 使用明确目标路径卸载的命令，并提醒卸载不可恢复。
8. 目录结构和后续规范分类扩展方式。
9. Codex 为已验证支持范围；其他兼容 Agent Skills 工具标为未验证。
10. 贡献、安全、行为准则和许可证入口。

README 不复制完整 Dialog 规则，避免与 `references/dialogs.md` 形成两套事实来源。

## 开源治理

### LICENSE

使用标准 MIT License，版权声明为 `Copyright (c) 2026 gloopai`。

### CONTRIBUTING.md

说明 Fork、创建功能分支、修改规则、验证、提交和 PR 流程。新增规则必须使用框架无关的产品语言，放入职责单一的参考文件，并更新 `SKILL.md` 路由。修改 Skill 行为时必须先建立失败基线，再复测通过。

### CODE_OF_CONDUCT.md

采用 Contributor Covenant 2.1 的标准内容，正文使用中文，保留适用范围、执行责任、行为准则和处理等级。联系渠道使用仓库维护者与 GitHub 私密渠道，不公开虚构邮箱。

### SECURITY.md

安全问题不得通过公开 Issue 披露。优先使用 GitHub Security Advisory 的私密报告功能；说明维护者会确认收到、评估影响并在适当时发布修复，不承诺无法保证的固定响应时限。

## 安装与操作约束

- 安装命令：

  ```bash
  git clone https://github.com/gloopai/frontend-product-interaction-standards.git ~/.codex/skills/frontend-product-interaction-standards
  ```

- 更新命令：

  ```bash
  git -C ~/.codex/skills/frontend-product-interaction-standards pull --ff-only
  ```

- 卸载命令必须先提示确认目标目录，再由用户自行删除；文档不提供宽泛路径或通配符删除。
- 自动触发由 `SKILL.md` 的 description 与 `agents/openai.yaml` 的 `allow_implicit_invocation: true` 支持。
- 显式调用示例使用 `$frontend-product-interaction-standards`。

## 验证

实施完成后验证：

1. 所有 README 相对链接指向存在文件。
2. 安装、更新和路径命令与仓库实际结构一致。
3. LICENSE 为未改写的标准 MIT License，版权主体和年份正确。
4. CONTRIBUTING、行为准则和安全政策之间没有冲突或虚构联系方式。
5. 官方 Skill 校验继续通过。
6. Markdown 无占位符、尾随空格或损坏的代码围栏。
7. Git diff 只包含五个批准的文件。
