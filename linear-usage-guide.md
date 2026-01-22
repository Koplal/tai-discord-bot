# Linear Usage Guide for TAI Development

> **Breadcrumbs:** [CLAUDE.md](../CLAUDE.md) > [git-workflow.md](./git-workflow.md) > linear-usage-guide.md
>
> **Related:** [AI-MODULE-USAGE.md](./guides/AI-MODULE-USAGE.md) | [ENCRYPTION-USAGE.md](./guides/ENCRYPTION-USAGE.md)
>
> **Last Updated:** January 2026 | **Linear Workspace:** Coding Fox AI

---

## TL;DR — Quick Rules

| Rule | Convention |
|------|------------|
| **Ticket Title** | `[Verb] [What] [Context]` — e.g., "Fix session timeout in auth flow" |
| **Branch Name** | `<type>/COD-XXX-description` — e.g., `feature/COD-350-memory-export` |
| **Commit** | `type(scope): description closes COD-XXX` for auto-close |
| **Max Labels** | 3 per issue (1 type + 1 priority + 1 optional) |
| **Estimates** | T-shirt: XS=1, S=2, M=3, L=5, XL=8 — break down XL before sprint |
| **Cycles** | 2-week sprints, auto-rollover enabled |
| **Archive** | Auto-archive 1 month after Done |

---

## 1. Linear Configuration Reference

### 1.1 Team & Project UUIDs

```yaml
# Primary Team
team:
  name: "Coding Fox AI"
  id: "0780de42-dc79-4ee9-a7d9-63242c0f702c"
  key: "COD"

# Main Project
project:
  name: "Transformational AI (TAI)"
  id: "4e8fcccf-ae0e-4ed6-b449-2b507617c9f7"
  lead: "Landon Brown"
  timeline: "Dec 3, 2025 - Jan 19, 2026"
```

### 1.2 Workflow Statuses

```yaml
# Status workflow with UUIDs for MCP operations
statuses:
  # Triage (intake)
  triage:
    id: "b4bd5478-1b78-4b9c-9382-edebc6f17772"
    type: "triage"
    use: "New issues from integrations, support"

  # Unstarted
  backlog:
    id: "37de6e28-570d-44ea-9bea-b76b0a82a89f"
    type: "backlog"
    use: "Prioritized but not scheduled"

  todo:
    id: "5d595337-b8a7-45c0-a2c3-c0e99f955558"
    type: "unstarted"
    use: "Scheduled for current/upcoming cycle"

  legal:
    id: "fdac8c7c-24cc-4718-8e43-4a7a690bee65"
    type: "unstarted"
    use: "Legal/compliance review required"

  biglifts:
    id: "2d9c1358-99cf-4e75-8a29-63fc0bb13ba6"
    type: "unstarted"
    use: "Large features requiring decomposition"

  # Started
  in_progress:
    id: "1a4f10f4-d8ad-46d3-9654-2b537d4b19d3"
    type: "started"
    use: "Active development"

  in_review:
    id: "7fe66260-6479-4558-a307-b1cc5b2d56a4"
    type: "started"
    use: "PR opened, awaiting review"

  review_request:
    id: "c23807b0-8605-422d-a50f-5be3f8126e24"
    type: "started"
    use: "Requesting specific reviewer attention"

  # Completed
  done:
    id: "1abaa90a-0e55-4f4c-ba1a-d29d016dde1e"
    type: "completed"
    use: "Work complete and merged"

  # Canceled
  canceled:
    id: "30e1f715-b97a-4377-93e5-56ba86ce402b"
    type: "canceled"
    use: "Won't do / no longer needed"

  duplicate:
    id: "3b5dceef-898a-4e2d-a67d-960e293ba5fd"
    type: "canceled"
    use: "Duplicate of another issue"
```

### 1.3 Labels

```yaml
# Type Labels (mutually exclusive - pick ONE)
type_labels:
  feature:
    id: "28d94998-e0f3-41ab-bc89-7d782f6d9a0b"
    color: "#BB87FC"
    use: "New functionality"

  bug:
    id: "f799d431-e8d0-4fec-84d1-3f689810d8af"
    color: "#EB5757"
    use: "Something broken"

  improvement:
    id: "6740dbf0-d53f-40c9-b607-787973afef0c"
    color: "#4EA7FC"
    use: "Enhancement to existing feature"

  chore:
    id: "5326d4bd-611a-4fbd-a0f8-5a0818336903"
    color: "#bec2c8"
    use: "Maintenance, refactoring, deps"

# Priority Labels (mutually exclusive - pick ONE)
priority_labels:
  p0_critical:
    id: "11d9b74e-5ea7-4209-81cc-05fe3df90bbb"
    color: "#EB5757"
    description: "Must be done, blocks everything"
    use: "Production down, security, data loss"
    target_percent: "<5%"

  p1_important:
    id: "f2c05287-547d-42c5-ae2a-032045be57cd"
    color: "#F2994A"
    description: "Important, should be done this cycle"
    use: "Release blockers, compliance deadlines"
    target_percent: "15-25%"

  p2_nice_to_have:
    id: "3a00cb76-338f-43d7-aa4c-608ac212781e"
    color: "#6FCF97"
    description: "Nice to have, do if time allows"
    use: "Polish, improvements, tech debt"
    target_percent: "20-30%"

# Status Labels (can combine with type/priority)
status_labels:
  blocked:
    id: "e706ec0a-234a-4282-a751-9338233fb323"
    color: "#828282"
    description: "Blocked by external dependency"
    use: "Waiting on external team/vendor"

  needs_decision:
    id: "3ea26bee-3051-4ba9-98db-ed14c0606c67"
    color: "#F2C94C"
    description: "Requires Landon/Claude decision"
    use: "Architecture or product decision needed"

  needs_rod:
    id: "b3c5b1b3-7e82-4688-ba99-b33755618509"
    color: "#9B51E0"
    description: "Requires Rod's input or decision"
    use: "Client approval or clarification"

# Bonus Labels
bonus_labels:
  gravy:
    id: "115529ce-2751-4a90-b15b-2399391810b9"
    color: "#56CCF2"
    description: "Over-deliver features if time allows"
    use: "Stretch goals, delighters"

  creative:
    id: "c70a76b9-8490-4803-bb70-e83f423de870"
    color: "#f2994a"
    use: "Creative/design work"
```

### 1.4 Team Members

```yaml
users:
  landon:
    id: "8eae43b9-0449-46f1-9d55-18c459503595"
    name: "Landon Brown"
    email: "landon@codingfox.ai"
    role: "Project Lead"

  haley:
    id: "f0358876-74af-49ec-8dda-2612107c0ab5"
    name: "Haley Berling"
    email: "haley@codingfox.ai"
    role: "Developer"

  justin:
    id: "3e066062-f099-460c-96ec-3c5921ef6937"
    name: "Justin Curran"
    email: "justintcurran@gmail.com"
    role: "Developer"

  tai_admin:
    id: "08f8d806-f9c8-4103-a263-a4d69da64773"
    name: "TAI-Admin"
    email: "admin@transformationalai.world"
    role: "Service Account"
```

### 1.5 Cycles

```yaml
# 2-week cycles, Sunday start
cycles:
  cycle_3:
    number: 3
    id: "1a5f0f16-5fbd-4630-b26a-9ae160ef44a4"
    start: "2026-01-05"
    end: "2026-01-19"
    status: "current"

  cycle_4:
    number: 4
    id: "0da8da21-d120-4d35-9013-fa3c502ecd58"
    start: "2026-01-19"
    end: "2026-02-02"
    status: "upcoming"

  cycle_5:
    number: 5
    id: "db4b5962-bb4c-4b94-9045-7c30962b03bb"
    start: "2026-02-02"
    end: "2026-02-16"
    status: "future"

  cycle_6:
    number: 6
    id: "346e2c5f-3fe2-4575-882c-8eee0795d9b3"
    start: "2026-02-16"
    end: "2026-03-02"
    status: "future"

settings:
  duration: "2 weeks"
  start_day: "Sunday"
  auto_rollover: true
  auto_archive: "1 month after Done"
```

### 1.6 Priority Field

Linear's built-in priority field uses numeric values (not UUIDs). This is separate from priority labels.

**Priority is REQUIRED** for all tickets with a cycle goal. Only use "No Priority" for ideas/thoughts without a dedicated cycle.

```yaml
# Built-in Priority Field (numeric values for MCP operations)
priority:
  no_priority:
    value: 0
    name: "No Priority"
    icon: "—"
    use: "Ideas, thoughts, backlog items without cycle goals"
    required: false  # Only for unprioritized ideas

  urgent:
    value: 1
    name: "Urgent"
    icon: "🔴"
    use: "Production issues, security vulnerabilities, data loss"

  high:
    value: 2
    name: "High"
    icon: "🟠"
    use: "Release blockers, critical bugs, compliance deadlines"

  medium:
    value: 3
    name: "Medium"
    icon: "🟡"
    use: "Standard work, scheduled features"

  low:
    value: 4
    name: "Low"
    icon: "🟢"
    use: "Nice-to-have, polish, minor improvements"
```

**Priority Guidelines:**

| Situation | Priority | Rationale |
|-----------|----------|-----------|
| Production down | 1 (Urgent) | Immediate attention required |
| Sprint blocker | 2 (High) | Must complete this cycle |
| Scheduled feature work | 3 (Medium) | Normal development pace |
| Tech debt, polish | 4 (Low) | Do if time allows |
| Brainstorm, idea capture | 0 (No Priority) | Not yet scheduled for a cycle |

**Priority vs Priority Labels:**

| Concept | Type | Values | Use Case |
|---------|------|--------|----------|
| **Priority Field** | Built-in numeric | 0-4 | Quick triage, sorting, filtering |
| **Priority Labels** | Custom labels | P0/P1/P2 UUIDs | Detailed categorization, SLA tracking |

**MCP Usage:**
```typescript
// Set priority when creating/updating issues
mcp__linear__create_issue({
  title: "Fix auth timeout",
  priority: 1,  // Urgent
  // ...
})
```

---

## 2. Ticket Creation Standards

### 2.1 Title Format

```
[Verb] [What] [Context]
```

**Action Verbs (required first word):**

| Verb | Use When |
|------|----------|
| **Add** | New feature, component, or capability |
| **Fix** | Bug fix, error correction |
| **Update** | Modify existing behavior |
| **Remove** | Delete feature, code, or dependency |
| **Refactor** | Code restructuring without behavior change |
| **Implement** | Build out a designed feature |
| **Enable** | Turn on capability or feature flag |
| **Migrate** | Move data, code, or infrastructure |
| **Design** | UX/UI design work |
| **Document** | Documentation updates |

**Examples:**

```
Good:
  "Add memory export API endpoint"
  "Fix session timeout in OAuth flow"
  "Update onboarding copy for clarity"
  "Refactor chat context building logic"

Bad:
  "Memory export" (no verb)
  "Bug in auth" (vague, no action)
  "COD-350: Add feature" (redundant ID in title)
  "Working on the chat improvements" (not imperative)
```

### 2.2 Required Fields

| Field | Requirement | When |
|-------|-------------|------|
| **Title** | Always required | Creation |
| **Team** | Always "Coding Fox AI" | Creation |
| **Project** | Always "TAI" | Creation |
| **Priority** | Required for cycle work (0 for ideas only) | Creation or triage |
| **Assignee** | Required for In Progress | Before work starts |
| **Cycle** | Required for Todo/In Progress | Sprint planning |
| **Type Label** | Required | Creation |
| **Priority Label** | Recommended | Creation or triage |
| **Estimate** | Required for cycle work | Sprint planning |

### 2.3 Description Template

```markdown
## Context
[Why is this needed? What problem does it solve?]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Tests pass

## Technical Notes
[Implementation hints, related files, dependencies]

## Links
- Design: [Figma link]
- Related: COD-XXX
```

---

## 3. Estimation Guidelines

### 3.1 T-Shirt Size Scale

| Size | Points | Time Estimate | Examples |
|------|--------|---------------|----------|
| **XS** | 1 | < 2 hours | Typo fix, copy change, config tweak |
| **S** | 2 | Half day | Simple bug fix, add field to form |
| **M** | 3 | 1 day | New API endpoint, component refactor |
| **L** | 5 | 2-3 days | Feature with multiple files, integration |
| **XL** | 8 | ~1 week | Major feature, significant complexity |

### 3.2 Estimation Rules

1. **XL = decompose** — Break into smaller issues before sprint
2. **Uncertainty = larger size** — When unsure, size up
3. **Include testing** — Estimate includes writing tests
4. **No 0-point issues** — Minimum is XS (1 point)
5. **Re-estimate if scope changes** — Update when requirements clarify

---

## 4. Status Workflow

### 4.1 Status Flow Diagram

```
                    ┌──────────────┐
                    │    Triage    │ ← External integrations
                    └──────┬───────┘
                           │ Reviewed
                           ▼
┌──────────────┐    ┌──────────────┐
│   BigLifts   │◄───│   Backlog    │ ← Prioritized ideas
│  (decompose) │    └──────┬───────┘
└──────────────┘           │ Scheduled
                           ▼
                    ┌──────────────┐
              ┌─────│     Todo     │ ← Current/next cycle
              │     └──────┬───────┘
              │            │ Branch created (auto)
              │            ▼
              │     ┌──────────────┐
              │     │ In Progress  │ ← Active development
              │     └──────┬───────┘
              │            │ PR opened (auto)
              │            ▼
              │     ┌──────────────┐
              │     │  In Review   │ ← Code review
              │     └──────┬───────┘
              │            │ PR merged (auto)
              │            ▼
              │     ┌──────────────┐
              └────►│     Done     │ ← Complete
                    └──────────────┘
                           │ 1 month
                           ▼
                    ┌──────────────┐
                    │   Archived   │
                    └──────────────┘
```

### 4.2 Status Transition Rules

| From | To | Trigger | Automation |
|------|-----|---------|------------|
| Triage | Backlog/Todo | Manual review | - |
| Backlog | Todo | Sprint planning | - |
| Todo | In Progress | Branch created | GitHub integration |
| In Progress | In Review | PR opened | GitHub integration |
| In Review | Done | PR merged | GitHub integration |
| Any | Canceled | Manual | - |
| Any | Duplicate | Mark duplicate (M+M) | - |

### 4.3 Special Statuses

- **Legal**: Issues requiring compliance review (GDPR, BIPA, etc.)
- **BigLifts**: Large features needing decomposition before sprint
- **Review Request**: Needs specific reviewer attention (not just any reviewer)

---

## 5. Relationship Management

### 5.1 Decision Tree

```
Is Issue B smaller work that is PART OF Issue A?
├── YES → Create B as SUB-ISSUE of A
│         Keyboard: Cmd+Shift+P (convert to sub-issue)
│         Use: Work decomposition, epics → tasks
│
└── NO → Does Issue B PREVENT PROGRESS on Issue A?
         ├── YES → A is BLOCKED BY B
         │         Keyboard: M then B
         │         Use: Hard dependencies, sequential work
         │
         └── NO → Is Issue B a DUPLICATE of Issue A?
                  ├── YES → Mark B as DUPLICATE of A
                  │         Keyboard: M then M
                  │         Effect: B gets canceled
                  │
                  └── NO → Link as RELATED
                           Keyboard: M then R
                           Use: Loose association, context
```

### 5.2 Relationship Types Reference

| Relationship | When to Use | Keyboard | Effect |
|--------------|-------------|----------|--------|
| **Parent → Child** | Decompose large work | Cmd+Shift+P | Groups work, optional auto-close |
| **Blocks** | A must finish before B can start | M → X | Shows in roadmap, B shows blocked |
| **Blocked By** | A cannot start until B finishes | M → B | Shows dependency, surfaces blockers |
| **Related** | Context sharing, not dependency | M → R | Bidirectional link for reference |
| **Duplicate** | Same work, cancel this one | M → M | Current issue canceled |

### 5.3 Relationship Examples

```yaml
parent_child:
  example: "COD-300 Implement Progressive Consent"
  children:
    - "COD-301 Add AI consent dialog"
    - "COD-302 Add voice consent dialog"
    - "COD-303 Add GDPR data rights"
  use_when: "Feature has multiple distinct deliverables"

blocking:
  example: "COD-310 blocks COD-311"
  scenario: "Database migration must complete before API can use new schema"
  use_when: "Sequential dependency, cannot parallelize"

related:
  example: "COD-320 related to COD-321"
  scenario: "Both touch auth system but can be done independently"
  use_when: "Context is helpful but no hard dependency"
```

---

## 6. GitHub Integration

### 6.1 Branch Naming Convention

```
<type>/<COD-XXX>-<description>
```

| Type | Use | Example |
|------|-----|---------|
| `feature` | New functionality | `feature/COD-350-memory-export` |
| `bugfix` | Bug fix | `bugfix/COD-351-fix-auth-timeout` |
| `hotfix` | Production emergency | `hotfix/COD-352-fix-xss-vulnerability` |
| `maintenance` | Tech debt, refactoring | `maintenance/COD-353-upgrade-deps` |
| `docs` | Documentation | `docs/COD-354-api-documentation` |
| `test` | Test improvements | `test/COD-355-add-integration-tests` |
| `chore` | Build, CI, config | `chore/COD-356-update-eslint` |

**Important:** Branch name MUST contain `COD-XXX` for auto-linking.

### 6.2 Commit Message Format

```
type(scope): description closes COD-XXX
```

**Auto-close keywords:** `closes`, `fixes`, `resolves`
**Reference only:** `refs`, `(COD-XXX)` without keyword

**Examples:**

```bash
# Auto-closes issue on merge
git commit -m "feat(memory): add export endpoint closes COD-350"

# References without closing
git commit -m "feat(memory): add export validation (COD-350)"

# Multiple issues
git commit -m "fix(auth): resolve session bugs closes COD-351 closes COD-352"
```

### 6.3 PR Title Format

```
type(scope): description (COD-XXX)
```

**Examples:**

```
feat(memory): implement memory export API (COD-350)
fix(auth): resolve OAuth session timeout (COD-351)
chore(deps): upgrade Next.js to 16.1 (COD-356)
```

### 6.4 GitHub-Linear Automation

| GitHub Event | Linear Action |
|--------------|---------------|
| Branch `COD-XXX` pushed | Issue → In Progress |
| PR opened with `COD-XXX` | Issue → In Review |
| PR merged to staging/main | Issue → Done |
| PR closed (not merged) | Issue → Canceled (optional) |

---

## 7. Linear MCP Usage for Claude Code

### 7.1 MCP Server Configuration

TAI uses two Linear MCP servers:

| Server | Purpose | Tools Prefix |
|--------|---------|--------------|
| **linear** (Official) | Core issue CRUD, projects, teams | `mcp__linear__*` |
| **linear-extended** (Custom) | Comments, attachments, utilities | `mcp__linear_extended__*` |

Both are configured in `.mcp.json`:

```json
{
  "mcpServers": {
    "linear": {
      "type": "http",
      "url": "https://mcp.linear.app/mcp"
    },
    "linear-extended": {
      "command": "node",
      "args": ["~/.claude/mcp-servers/linear-extended/dist/index.js"],
      "env": {
        "LINEAR_API_KEY": "${LINEAR_API_KEY}"
      }
    }
  }
}
```

### 7.2 Official Linear MCP Tools

```yaml
# Issue Operations
list_issues:      "Query issues with filters"
get_issue:        "Get issue details by ID"
create_issue:     "Create new issue"
update_issue:     "Update issue fields (replaces description/labels)"
search_issues:    "Text search for issues"

# Organization
list_teams:       "List workspace teams"
list_projects:    "List all projects"
```

### 7.3 Extended Linear MCP Tools (Custom)

These tools complement the official MCP with missing functionality:

```yaml
# Comment Operations (Full CRUD)
create_comment:     "Add comment to issue"
list_comments:      "Get issue comments"
update_comment:     "Edit existing comment"
delete_comment:     "Remove comment"

# Attachment Operations
create_attachment:  "Link external resource to issue"
list_attachments:   "Get issue attachments"
update_attachment:  "Modify attachment"
delete_attachment:  "Remove attachment"

# File Upload
get_upload_url:     "Get signed URL for file upload (60s expiry)"

# Utility Tools
list_users:             "List workspace members with IDs"
get_user:               "Get user details"
list_workflow_states:   "List statuses with IDs"
list_labels:            "List labels with IDs"
list_cycles:            "List cycles with filters (active/upcoming/completed)"

# Non-Destructive Issue Updates
append_to_description:  "Append content without replacing"
add_labels:             "Add labels without removing existing"
remove_labels:          "Remove specific labels only"
assign_to_cycle:        "Assign issue to cycle"
```

### 7.4 Key Differences: Official vs Extended

| Operation | Official MCP | Extended MCP |
|-----------|-------------|--------------|
| Update description | **Replaces** entire description | **Appends** to existing |
| Update labels | **Replaces** all labels | **Adds/removes** incrementally |
| Comments | Create only | Full CRUD |
| Attachments | None | Full CRUD |
| File uploads | None | Signed URL generation |
| List users/labels/states | Limited | Full with IDs |

### 7.5 Setup Extended MCP

```bash
# Install and build
cd ~/.claude/mcp-servers/linear-extended
npm install
npm run build

# Set API key (add to shell profile)
export LINEAR_API_KEY=lin_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

See `~/.claude/mcp-servers/linear-extended/README.md` for full documentation.

### 7.6 Natural Language Examples for Claude Code

**Creating Issues:**

```
"Create a bug in TAI called 'Fix auth timeout on mobile' with P1-important priority, assign to Landon, add to current cycle"

"Create a feature for memory export API with estimate 5, labels Feature and P2-nice-to-have"
```

**Querying Issues:**

```
"Show me all in-progress issues assigned to me"

"List all P0-critical bugs in the current cycle"

"What issues are blocked?"
```

**Updating Issues:**

```
"Move COD-350 to In Review"

"Add the blocked label to COD-351 and add a comment explaining the blocker"

"Assign COD-352 to Haley and change estimate to 3"
```

**Using Extended MCP (Comments & Attachments):**

```
# Comments
"Add a comment to COD-350 saying 'Implementation complete, ready for review'"

"List all comments on COD-350"

"Update the last comment on COD-350 to add the test results"

# Attachments
"Attach this Figma link to COD-350: https://figma.com/file/xxx"

"List attachments on COD-350"

# Non-destructive updates
"Append '## Testing Notes\n- Tested on Chrome, Firefox, Safari' to COD-350's description"

"Add the blocked label to COD-351 without removing existing labels"

"Remove the P2-nice-to-have label from COD-352"
```

**Utility Tools:**

```
"List all users in the workspace with their IDs"

"What workflow states are available for the Coding Fox AI team?"

"Show me all labels and their IDs"

"List active cycles for the team"
```

**Cycle Tools (TAI Bot):**

```
# Via Discord @TAIBot or /tai command
"Show me the current cycle"

"List upcoming cycles"

"What cycles are available?"
```

**Relationships:**

```
"Make COD-351 a sub-issue of COD-350"

"Mark COD-352 as blocked by COD-351"

"Mark COD-353 as duplicate of COD-350"
```

### 7.7 MCP Integration Patterns

**Pattern 1: Pre-work Setup**
```
1. Check for existing similar issues (avoid duplicates)
2. Create issue with full context
3. Assign and add to cycle
4. Create branch following convention
```

**Pattern 2: Status Updates**
```
1. Query current issue state
2. Update status with appropriate transition
3. Add comment explaining change if non-obvious
```

**Pattern 3: Sprint Planning Assistance**
```
1. List unestimated issues in backlog
2. Review and add estimates
3. Move prioritized issues to current cycle
4. Check cycle capacity vs velocity
```

### 7.8 MCP Configuration Reference

**Project-level** (`.mcp.json` in project root):
```json
{
  "mcpServers": {
    "linear": {
      "type": "http",
      "url": "https://mcp.linear.app/mcp"
    },
    "linear-extended": {
      "command": "node",
      "args": ["~/.claude/mcp-servers/linear-extended/dist/index.js"],
      "env": {
        "LINEAR_API_KEY": "${LINEAR_API_KEY}"
      }
    }
  }
}
```

**Global** (`~/.claude/settings.json` under `mcpServers`):
```json
{
  "mcpServers": {
    "linear-extended": {
      "command": "node",
      "args": ["~/.claude/mcp-servers/linear-extended/dist/index.js"],
      "env": {
        "LINEAR_API_KEY": "${LINEAR_API_KEY}"
      }
    }
  }
}
```

The official Linear MCP is also available via CLI:
```bash
claude mcp add --transport http linear-server https://mcp.linear.app/mcp
```

---

## 8. Quick Reference Card

### 8.1 Keyboard Shortcuts

| Action | Shortcut | Context |
|--------|----------|---------|
| Create issue | `C` | Anywhere |
| Search | `/` or `Cmd+K` | Anywhere |
| Self-assign | `I` | Issue view |
| Assign | `A` | Issue view |
| Set status | `S` | Issue view |
| Set priority | `Shift+1-4` | Issue view |
| Add label | `L` | Issue view |
| Set estimate | `E` | Issue view |
| Add to cycle | `Shift+C` | Issue view |
| Add to project | `Shift+P` | Issue view |
| Create sub-issue | `Cmd+Shift+O` | Issue view |
| Convert to sub-issue | `Cmd+Shift+P` | Issue view |
| Open relations | `M` | Issue view |
| Mark blocked | `M` → `B` | Issue view |
| Mark blocks | `M` → `X` | Issue view |
| Mark related | `M` → `R` | Issue view |
| Mark duplicate | `M` → `M` | Issue view |
| Copy branch name | `Cmd+Shift+.` | Issue view |
| Go to my issues | `G` then `I` | Anywhere |
| Go to inbox | `G` then `N` | Anywhere |

### 8.2 Common MCP Commands

```bash
# Issue queries
"List my in-progress issues"
"Show P0-critical bugs"
"What's in the current cycle?"
"Find issues with 'auth' in title"

# Issue creation
"Create bug: [title] with P1 priority"
"Create feature: [title] estimate 5"

# Issue updates
"Move COD-XXX to In Review"
"Assign COD-XXX to [name]"
"Add blocked label to COD-XXX"

# Relationships
"Make COD-XXX child of COD-YYY"
"COD-XXX is blocked by COD-YYY"
```

### 8.3 Branch/Commit Cheatsheet

```bash
# Branch naming
feature/COD-XXX-description
bugfix/COD-XXX-description
hotfix/COD-XXX-description

# Commit with auto-close
git commit -m "type(scope): description closes COD-XXX"

# Commit with reference only
git commit -m "type(scope): description (COD-XXX)"

# PR title
type(scope): description (COD-XXX)
```

---

## 9. TAI Bot Linear Tools

TAI Bot (Discord) provides direct access to Linear operations via `@TAIBot` mentions or `/tai` slash commands.

### 9.1 Available Tools

| Tool | Description | Example |
|------|-------------|---------|
| `list_linear_cycles` | Show current/upcoming sprints | "What's the current cycle?" |
| `create_linear_issue` | Create new tickets | "Create a bug for auth timeout" |
| `search_linear_issues` | Find issues by keyword | "Find issues about memory" |
| `get_linear_issue` | Get issue details | "Show me COD-379" |
| `list_linear_issues` | List recent issues | "What's in progress?" |
| `update_linear_issue` | Update issue fields | "Move COD-379 to done" |
| `list_linear_users` | Show team members | "Who can I assign to?" |
| `list_linear_labels` | Show available labels | "What labels exist?" |
| `list_linear_projects` | Show projects | "List projects" |

### 9.2 Cycle Tool Usage

```
# Current cycle only
"Show the current sprint"
"What cycle are we in?"

# Future cycles
"List upcoming cycles"
"What's next after this sprint?"

# All cycles
"Show all cycles"
```

### 9.3 Estimate Syntax

When creating/updating issues, use T-shirt sizes:
```
"Create a feature for user export, estimate M"
"Set COD-380 estimate to L"
"This is an XS fix"
```

| Size | Meaning | Points |
|------|---------|--------|
| XS | Trivial, < 2 hours | 1 |
| S | Half day | 2 |
| M | Full day | 3 |
| L | 2-3 days | 5 |
| XL | ~1 week (decompose) | 8 |

---

## 10. Anti-Patterns to Avoid

### 10.1 TAI Bot Anti-Patterns

| Anti-Pattern | Why Bad | Do Instead |
|--------------|---------|------------|
| Asking for Fibonacci estimates | Bot uses T-shirt sizes | Use XS, S, M, L, XL |
| "Set estimate to 13" | Invalid size | Break into XL or smaller |
| Asking for past cycles | Not supported | Use Linear UI for history |
| Ambiguous user names | May fail or match wrong | Use full names |

### 10.2 Issue Management

| Anti-Pattern | Why Bad | Do Instead |
|--------------|---------|------------|
| Vague titles ("Fix bug") | Can't scan, unclear scope | Use verb + what + context |
| No estimates | Can't plan capacity | Estimate before adding to cycle |
| Everything is P0 | Destroys signal | Reserve P0 for true emergencies |
| 10+ labels per issue | Decision fatigue, noise | Max 3 labels (type + priority + optional) |
| Manual status updates | Wastes time, gets stale | Let GitHub integration automate |
| Deep sub-issue nesting | Hard to track | Max 2 levels (epic → task → subtask) |

### 10.3 GitHub Integration

| Anti-Pattern | Why Bad | Do Instead |
|--------------|---------|------------|
| Branch without COD-XXX | No auto-linking | Always include ticket ID |
| Commits without ticket ref | Lost context | Include `(COD-XXX)` or `closes` |
| PR to wrong branch | Breaks workflow | Always target staging first |
| Ignoring blocked issues | Technical debt | Review blockers in standup |

### 10.4 Linear Usage

| Anti-Pattern | Why Bad | Do Instead |
|--------------|---------|------------|
| Using Linear like Jira | Wrong mental model | Embrace speed, keyboard-first |
| Creating custom fields | Complexity creep | Use labels and projects |
| Ignoring keyboard shortcuts | Slow workflow | Learn top 10 shortcuts |
| Not using cycles | No velocity tracking | Add work to cycles |
| Leaving issues In Progress forever | Stale data | Update or close stalled work |

---

## 11. Integration with TAI Workflows

### 11.1 Verification Commands

The `/verify` commands automatically extract Linear ticket from branch name and can log results:

```
# Branch: feature/COD-350-memory-export
# /verify3 extracts COD-350 and can:
#   - Add comment with verification summary
#   - Attach PR link to issue
#   - Update labels based on findings
```

See: [CLAUDE.md - Verification Commands](../CLAUDE.md#verification-commands-cod-276)

### 11.2 Git Workflow Integration

This guide complements the git workflow:

| Document | Covers |
|----------|--------|
| **This guide** | Linear conventions, MCP usage, UUIDs |
| **git-workflow.md** | Branch strategy, PR process, releases |
| **CLAUDE.md** | Code standards, testing, deployment |

See: [git-workflow.md](./git-workflow.md)

### 11.3 Release Process

1. Features merged to `staging` → Linear issues auto-Done
2. Staging validated → PR to `pre-release`
3. Pre-release smoke tested → PR to `main`
4. Tag release → Update CHANGELOG.md

Linear tracks progress via cycle burndown and project completion.

---

## Appendix A: Full UUID Reference

For copy-paste into MCP operations:

```yaml
# Team
team_id: "0780de42-dc79-4ee9-a7d9-63242c0f702c"

# Project
project_id: "4e8fcccf-ae0e-4ed6-b449-2b507617c9f7"

# Statuses
status_triage: "b4bd5478-1b78-4b9c-9382-edebc6f17772"
status_backlog: "37de6e28-570d-44ea-9bea-b76b0a82a89f"
status_todo: "5d595337-b8a7-45c0-a2c3-c0e99f955558"
status_legal: "fdac8c7c-24cc-4718-8e43-4a7a690bee65"
status_biglifts: "2d9c1358-99cf-4e75-8a29-63fc0bb13ba6"
status_in_progress: "1a4f10f4-d8ad-46d3-9654-2b537d4b19d3"
status_in_review: "7fe66260-6479-4558-a307-b1cc5b2d56a4"
status_review_request: "c23807b0-8605-422d-a50f-5be3f8126e24"
status_done: "1abaa90a-0e55-4f4c-ba1a-d29d016dde1e"
status_canceled: "30e1f715-b97a-4377-93e5-56ba86ce402b"
status_duplicate: "3b5dceef-898a-4e2d-a67d-960e293ba5fd"

# Type Labels
label_feature: "28d94998-e0f3-41ab-bc89-7d782f6d9a0b"
label_bug: "f799d431-e8d0-4fec-84d1-3f689810d8af"
label_improvement: "6740dbf0-d53f-40c9-b607-787973afef0c"
label_chore: "5326d4bd-611a-4fbd-a0f8-5a0818336903"

# Priority Labels
label_p0_critical: "11d9b74e-5ea7-4209-81cc-05fe3df90bbb"
label_p1_important: "f2c05287-547d-42c5-ae2a-032045be57cd"
label_p2_nice_to_have: "3a00cb76-338f-43d7-aa4c-608ac212781e"

# Status Labels
label_blocked: "e706ec0a-234a-4282-a751-9338233fb323"
label_needs_decision: "3ea26bee-3051-4ba9-98db-ed14c0606c67"
label_needs_rod: "b3c5b1b3-7e82-4688-ba99-b33755618509"

# Bonus Labels
label_gravy: "115529ce-2751-4a90-b15b-2399391810b9"
label_creative: "c70a76b9-8490-4803-bb70-e83f423de870"

# Priority Field (numeric values, not UUIDs)
priority_no_priority: 0
priority_urgent: 1
priority_high: 2
priority_medium: 3
priority_low: 4

# Users
user_landon: "8eae43b9-0449-46f1-9d55-18c459503595"
user_haley: "f0358876-74af-49ec-8dda-2612107c0ab5"
user_justin: "3e066062-f099-460c-96ec-3c5921ef6937"
user_tai_admin: "08f8d806-f9c8-4103-a263-a4d69da64773"

# Cycles (2-week sprints, Sunday start)
cycle_3: "1a5f0f16-5fbd-4630-b26a-9ae160ef44a4"  # 2026-01-05 to 2026-01-19
cycle_4: "0da8da21-d120-4d35-9013-fa3c502ecd58"  # 2026-01-19 to 2026-02-02
cycle_5: "db4b5962-bb4c-4b94-9045-7c30962b03bb"  # 2026-02-02 to 2026-02-16
cycle_6: "346e2c5f-3fe2-4575-882c-8eee0795d9b3"  # 2026-02-16 to 2026-03-02
```

---

## Appendix B: MCP Tool Signatures

For reference when using Linear MCP programmatically:

```typescript
// Create Issue
mcp__linear__create_issue({
  title: string,           // Required
  team: string,            // Team name or ID
  project?: string,        // Project name or ID
  assignee?: string,       // User ID, name, email, or "me"
  state?: string,          // Status name or ID
  priority?: number,       // 0=No Priority, 1=Urgent, 2=High, 3=Medium, 4=Low
  estimate?: number,       // Fibonacci points
  labels?: string[],       // Label names or IDs
  cycle?: string,          // Cycle name, number, or ID
  parentId?: string,       // Parent issue ID for sub-issues
  description?: string,    // Markdown description
  blocks?: string[],       // Issue IDs this blocks
  blockedBy?: string[],    // Issue IDs blocking this
  relatedTo?: string[],    // Related issue IDs
  duplicateOf?: string,    // Duplicate of this issue ID
})

// Update Issue
mcp__linear__update_issue({
  id: string,              // Required - Issue ID
  title?: string,
  state?: string,
  assignee?: string,
  priority?: number,
  estimate?: number,
  labels?: string[],       // REPLACES all labels
  cycle?: string,
  parentId?: string,
  blocks?: string[],       // REPLACES all blocking relations
  blockedBy?: string[],    // REPLACES all blocked-by relations
  relatedTo?: string[],    // REPLACES all related relations
})

// List Issues
mcp__linear__list_issues({
  team?: string,
  project?: string,
  assignee?: string,       // Use "me" for current user
  state?: string,
  label?: string,
  cycle?: string,
  query?: string,          // Search in title/description
  limit?: number,          // Max 250
})

// Create Comment
mcp__linear__create_comment({
  issueId: string,         // Required
  body: string,            // Markdown content
})
```

---

*This guide is maintained alongside the TAI codebase. For updates, submit PRs to `docs/linear-usage-guide.md`.*
