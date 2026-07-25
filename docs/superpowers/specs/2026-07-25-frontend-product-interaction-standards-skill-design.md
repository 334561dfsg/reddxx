# Frontend Product Interaction Standards Skill Design

## Goal

Create a personal, framework-independent Codex skill that automatically applies the user's frontend product interaction standards across projects. The standards are mandatory by default and may be bypassed only when the user explicitly authorizes an exception for a defined scope.

The public Git repository `git@github.com:gloopai/frontend-product-interaction-standards.git` is the canonical source and version history. The skill is installed locally at `~/.codex/skills/frontend-product-interaction-standards/` for automatic discovery.

## Skill structure

```text
frontend-product-interaction-standards/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    └── dialogs.md
```

`SKILL.md` remains concise. It defines the automatic trigger conditions, mandatory workflow, exception policy, and reference routing. Detailed product rules live in category-specific files under `references/` so agents load only the standards relevant to a task.

The first release contains the Dialog category. Future categories may include forms, tables, navigation, feedback, and drawers. New categories are added only when the user provides relevant standards.

## Triggering and scope

The skill automatically triggers whenever an agent creates, modifies, refactors, reviews, or tests frontend pages, components, layouts, or interactive behavior.

The core standards are framework-independent and apply to Vue, React, and other frontend stacks. Framework- or library-specific implementation details may be added later as examples or separate references, but they must not replace or weaken the product-level requirements.

Rules are mandatory. A framework limitation, component-library default, or existing implementation is not sufficient justification for violating them. Only an explicit user instruction may authorize an exception, and that exception applies only to the scope the user identifies.

## Agent workflow

For every applicable frontend task, the agent must:

1. Identify the interaction categories involved.
2. Load the relevant files from `references/` before making changes.
3. Check the proposed design and implementation against the loaded standards.
4. Prefer configuration, wrapping, or replacement when a third-party component conflicts with a standard.
5. Inspect the implementation and perform relevant interaction and viewport verification after changes.
6. State which standards were verified in the final response. If verification was not possible, state that explicitly rather than treating the requirement as satisfied.

## Dialog standards

`references/dialogs.md` initially defines these mandatory requirements:

1. Clicking a backdrop or overlay must never close a dialog. Dialogs close only through explicit in-dialog actions such as close, cancel, or confirm.
2. The dialog frame must not scroll. When content exceeds the available height, the frame remains non-scrolling and only the content/body region scrolls; headers, footers, and actions remain within the fixed frame.
3. The backdrop or overlay must cover the entire viewport. It must not be constrained by a page section, panel, transformed ancestor, or other partial-screen container. Root-level rendering or teleporting and viewport-fixed positioning are used when necessary.

The reference includes implementation-neutral acceptance criteria and may include concise framework examples when those examples become useful.

## Relationship with project instructions

Project-level `AGENTS.md` files remain in place because they are durable repository constraints visible to all agents working in that project.

When both the personal skill and project instructions apply:

- Compatible requirements are all enforced.
- If one requirement is stricter without contradicting the other, the stricter requirement is enforced.
- If requirements conflict, the agent stops the affected implementation and asks the user to resolve the conflict. The agent must not silently choose the more permissive rule.

## Updating and publishing

The GitHub repository is the canonical editable copy. To update the standards:

1. Classify a new rule under an existing reference or create a focused new category.
2. Express the rule in framework-independent product language.
3. Update routing or trigger keywords in `SKILL.md` only when necessary.
4. Validate skill structure, metadata, trigger behavior, and the changed rules.
5. Commit the change with a focused Git commit and push it to the public repository.
6. Synchronize the validated repository version to the local skills directory.

If a push fails, the local skill may still be used, but the agent must report that local and remote versions are not synchronized.

## Validation strategy

Skill validation follows a documentation-focused test cycle:

- Establish baseline agent behavior on representative frontend prompts without the skill.
- Test the same prompts with the skill available and verify that the relevant references are loaded and enforced.
- Add or refine wording when an agent finds a loophole or misses a trigger.
- Run the skill package validator after structural or metadata changes.

Initial scenarios cover creating a dialog, modifying an existing dialog, reviewing dialog code, and handling a third-party dialog whose defaults violate the standards.

## First-release acceptance criteria

- The skill automatically triggers for frontend creation, modification, refactoring, review, and testing tasks.
- Dialog-related tasks route to and load `references/dialogs.md`.
- All three approved Dialog requirements are present without weakening their meaning.
- `SKILL.md` and `agents/openai.yaml` pass the available skill validators.
- Representative trigger and compliance scenarios pass.
- The skill is installed and discoverable at `~/.codex/skills/frontend-product-interaction-standards/`.
- The initial version is committed and pushed to `git@github.com:gloopai/frontend-product-interaction-standards.git`.

## Out of scope for the first release

- Automated source-code linting or framework-specific scanners.
- Product interaction categories for which the user has not yet defined standards.
- Packaging the skill as a public Codex plugin or marketplace artifact.
