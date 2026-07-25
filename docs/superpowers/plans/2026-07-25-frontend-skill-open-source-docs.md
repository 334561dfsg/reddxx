# 前端产品交互规范 Skill 开源文档实施计划

> **供 Agent 执行：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 逐项实施本计划。步骤使用复选框跟踪。

**目标：** 为公开 Skill 仓库增加完整、准确、可验证的中文使用说明和标准开源治理文件。

**架构：** `README.md` 作为使用者入口，只摘要规则并链接唯一事实来源；贡献、行为准则、安全政策和许可证分别放入职责单一的标准文件。内部设计与测试材料继续留在 `fex-admin`，不进入公开 Skill 仓库。

**技术栈：** Markdown、MIT License、Git、Codex Skill 校验脚本、Shell/Python 链接检查。

## 全局约束

- 目标仓库为 `/Users/evanqi/.codex/skills/frontend-product-interaction-standards`。
- 远程仓库为 `https://github.com/gloopai/frontend-product-interaction-standards`。
- 正文使用中文；技术标识、命令、文件名和标准许可证正文保留必要英文。
- 首版只承诺 Codex 安装和使用流程；其他 Agent Skills 工具明确标为未验证。
- README 不复制完整 Dialog 规则，只摘要并链接 `references/dialogs.md`。
- MIT 版权声明固定为 `Copyright (c) 2026 gloopai`。
- 安全问题通过 GitHub Security Advisory 私下报告，不公开虚构邮箱或固定响应时限。
- 不添加 Issue 模板、PR 模板、CI、自动发布、版本文件或内部实施文档。
- Git diff 最终只新增 `README.md`、`LICENSE`、`CONTRIBUTING.md`、`CODE_OF_CONDUCT.md`、`SECURITY.md`。

---

### 任务 1：建立公开文档缺失基线

**文件：**
- 只读检查：目标仓库现有文件。
- 临时创建：`/private/tmp/frontend-skill-open-source-docs-baseline.md`。

**接口：**
- 输入：全局约束中要求的五个公开文件。
- 输出：每个缺失文件和当前用户无法完成的操作清单。

- [ ] **步骤 1：运行失败基线检查**

运行：

```bash
test -f README.md
test -f LICENSE
test -f CONTRIBUTING.md
test -f CODE_OF_CONDUCT.md
test -f SECURITY.md
```

预期：至少第一条失败，证明公开使用和治理文档尚不存在。

- [ ] **步骤 2：记录基线**

在临时文件中记录以下缺失能力：

```text
README.md：缺少项目入口、安装、使用、更新、卸载和兼容范围。
LICENSE：缺少明确的开源授权。
CONTRIBUTING.md：缺少外部贡献流程与规则新增要求。
CODE_OF_CONDUCT.md：缺少社区行为与执行标准。
SECURITY.md：缺少私密安全报告渠道。
```

### 任务 2：编写使用者入口与许可证

**文件：**
- 创建：`README.md`
- 创建：`LICENSE`

**接口：**
- `README.md` 链接 `references/dialogs.md`、`CONTRIBUTING.md`、`CODE_OF_CONDUCT.md`、`SECURITY.md`、`LICENSE`。
- `LICENSE` 提供 MIT 授权，供 README 的许可证章节引用。

- [ ] **步骤 1：编写 README**

按以下顺序创建章节：

1. 标题与一句话定位。
2. “当前规范”：列出三条 Dialog 规则摘要并链接 `references/dialogs.md`。
3. “适用范围”：Codex 已验证，其他 Agent Skills 工具尚未验证。
4. “安装”：检查目标目录不存在后执行 HTTPS clone。
5. “使用”：自动触发说明，以及显式提示 `使用 $frontend-product-interaction-standards 检查这个 Dialog`。
6. “更新”：`git -C ~/.codex/skills/frontend-product-interaction-standards pull --ff-only`。
7. “卸载”：先运行 `test -d ~/.codex/skills/frontend-product-interaction-standards` 确认路径，再提示用户自行删除该明确目录；说明删除不可恢复。
8. “目录结构”：只展示仓库正式文件。
9. “扩展规范”：链接 CONTRIBUTING。
10. “贡献”“行为准则”“安全”“许可证”：链接对应文件。

安装命令固定为：

```bash
test ! -e ~/.codex/skills/frontend-product-interaction-standards
git clone https://github.com/gloopai/frontend-product-interaction-standards.git ~/.codex/skills/frontend-product-interaction-standards
```

不得提供 `rm -rf ~/.codex/skills/*`、通配符或宽泛删除路径。

- [ ] **步骤 2：编写标准 MIT License**

使用 MIT License 标准英文正文，唯一自定义行为：

```text
Copyright (c) 2026 gloopai
```

不得改写授权、免责声明或责任限制条款。

- [ ] **步骤 3：检查 README 与 LICENSE**

运行：

```bash
rg -n 'references/dialogs.md|CONTRIBUTING.md|CODE_OF_CONDUCT.md|SECURITY.md|LICENSE' README.md
rg -n 'git clone https://github.com/gloopai/frontend-product-interaction-standards.git|pull --ff-only|\$frontend-product-interaction-standards' README.md
rg -n '^Copyright \(c\) 2026 gloopai$' LICENSE
```

预期：所有目标链接、命令、显式 Skill 调用和版权声明均有匹配。

### 任务 3：编写开源治理文件

**文件：**
- 创建：`CONTRIBUTING.md`
- 创建：`CODE_OF_CONDUCT.md`
- 创建：`SECURITY.md`

**接口：**
- CONTRIBUTING 消费 SKILL 路由与 references 分类结构。
- CODE_OF_CONDUCT 使用 Contributor Covenant 2.1 的职责、范围和执行框架。
- SECURITY 指向 GitHub Security Advisory 私密渠道。

- [ ] **步骤 1：编写 CONTRIBUTING**

必须覆盖：

- Fork 仓库并从 `main` 创建短生命周期分支。
- 新规则先建立无 Skill 失败基线，再编写最小规则并用相同场景复测。
- 核心规则使用框架无关的产品语言。
- 具体类别规则放入 `references/<category>.md`，并更新 `SKILL.md` 路由。
- 不把框架实现示例写成产品规则。
- 运行官方 `quick_validate.py`、Markdown 链接检查、占位符扫描和 `git diff --check`。
- 提交范围单一，PR 说明动机、行为变化、测试证据和兼容影响。
- 指向 CODE_OF_CONDUCT 与 SECURITY。

- [ ] **步骤 2：编写 CODE_OF_CONDUCT**

采用 Contributor Covenant 2.1 的中文结构，包含：

- 承诺。
- 行为标准：正面行为和不可接受行为。
- 执行责任。
- 适用范围。
- 处理流程与纠正措施等级。
- 归属：链接 Contributor Covenant 2.1 官方页面。
- 报告渠道：安全问题使用 SECURITY；其他行为问题通过 GitHub 私密维护者渠道，不虚构邮箱。

- [ ] **步骤 3：编写 SECURITY**

必须包含：

- 支持范围为当前 `main`。
- 不在公开 Issue、Discussion 或 PR 中披露未修复漏洞。
- 使用仓库 Security 页面的 “Report a vulnerability” / GitHub Security Advisory 私密报告。
- 报告应包含影响、复现步骤、受影响版本或提交、建议缓解措施。
- 维护者会确认、评估、协调修复与披露，但不承诺固定响应时限。
- 普通功能或规范建议应走公开 Issue，不走安全渠道。

### 任务 4：验证、评审、提交并发布

**文件：**
- 验证：五个新文件及现有 Skill 文件。
- 不创建其他公开文件。

**接口：**
- 输入：任务 2–3 的五个文件。
- 输出：通过检查的提交和与本地一致的远程 `main`。

- [ ] **步骤 1：验证相对链接**

运行 Python 脚本读取 `README.md`、`CONTRIBUTING.md`、`CODE_OF_CONDUCT.md`、`SECURITY.md` 中的 Markdown 相对链接。忽略 `http://`、`https://`、`mailto:` 和页内锚点；对其余链接解析到仓库路径并断言文件存在。

预期：输出 `relative links: valid`。

- [ ] **步骤 2：验证内容约束**

运行：

```bash
rg -n 'Copyright \(c\) 2026 gloopai' LICENSE
rg -n 'Security Advisory|Report a vulnerability|报告漏洞' SECURITY.md
rg -n 'Contributor Covenant|贡献者公约' CODE_OF_CONDUCT.md
rg -n 'quick_validate.py|references/<category>.md|失败基线' CONTRIBUTING.md
if rg -n 'TBD|TODO|PLACEHOLDER|待定|待补充' README.md CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md; then exit 1; else echo 'placeholder scan: clean'; fi
git diff --check
```

预期：要求均有匹配，占位符扫描干净，diff 检查无输出。

- [ ] **步骤 3：验证 Skill 未被破坏**

运行：

```bash
/private/tmp/frontend-skill-validator-venv/bin/python /Users/evanqi/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/evanqi/.codex/skills/frontend-product-interaction-standards
```

预期：`Skill is valid!`。

- [ ] **步骤 4：检查变更范围**

运行：

```bash
git status --short
git diff --name-only
```

预期：只出现五个批准的新文件。

- [ ] **步骤 5：独立评审**

评审必须检查安装命令安全性、链接、重复规则风险、许可证标准性、贡献流程可执行性、安全报告是否私密，以及是否存在虚构联系方式。Critical 或 Important 必须修复并复审。

- [ ] **步骤 6：提交**

```bash
git add README.md LICENSE CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md
git commit -m "docs: 添加开源项目文档"
```

- [ ] **步骤 7：推送并核对**

```bash
GIT_TERMINAL_PROMPT=0 git push https://github.com/gloopai/frontend-product-interaction-standards.git main:main
git rev-parse HEAD
git ls-remote https://github.com/gloopai/frontend-product-interaction-standards.git refs/heads/main
```

预期：推送成功，本地与远程 `main` 哈希一致。
