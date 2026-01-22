/**
 * Linear API Client
 *
 * Uses Linear's GraphQL API directly for issue management.
 */

const LINEAR_API_URL = 'https://api.linear.app/graphql';

interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  url: string;
  state: { name: string };
  priority: number;
  assignee?: { name: string; email: string };
  labels: { nodes: Array<{ name: string }> };
  createdAt?: string;
  updatedAt?: string;
}

interface LinearComment {
  id: string;
  body: string;
  createdAt: string;
  user: { name: string };
}

interface UpdateIssueInput {
  stateId?: string;
  stateName?: string;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  assigneeId?: string;
  labelIds?: string[];
  projectId?: string;
  title?: string;
  description?: string;
}

interface LinearUser {
  id: string;
  name: string;
  email: string;
  displayName: string;
}

interface LinearLabel {
  id: string;
  name: string;
  color: string;
}

interface LinearProject {
  id: string;
  name: string;
  state: string;
}

interface ListIssuesInput {
  status?: string;
  limit?: number;
  assignee?: string;
}

interface CreateIssueInput {
  title: string;
  description: string;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
}

interface SearchIssuesInput {
  query: string;
  status?: string;
  limit?: number;
}

interface LinearGraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/**
 * Execute a GraphQL query against Linear API
 */
async function linearQuery<T>(
  apiKey: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Linear API error: ${response.status} - ${text}`);
  }

  const result = (await response.json()) as LinearGraphQLResponse<T>;

  if (result.errors) {
    throw new Error(`Linear GraphQL error: ${result.errors[0]?.message ?? 'Unknown error'}`);
  }

  if (!result.data) {
    throw new Error('Linear API returned no data');
  }

  return result.data;
}

/**
 * Map priority string to Linear priority number
 */
function priorityToNumber(priority?: string): number {
  switch (priority) {
    case 'urgent':
      return 1;
    case 'high':
      return 2;
    case 'normal':
      return 3;
    case 'low':
      return 4;
    default:
      return 0;
  }
}

/**
 * Create a new Linear issue
 */
export async function createLinearIssue(
  apiKey: string,
  teamId: string,
  input: CreateIssueInput
): Promise<{ success: boolean; issue?: LinearIssue; error?: string }> {
  try {
    const mutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            url
            state { name }
            priority
            labels { nodes { name } }
          }
        }
      }
    `;

    const variables = {
      input: {
        teamId,
        title: input.title,
        description: input.description,
        priority: priorityToNumber(input.priority),
      },
    };

    const result = await linearQuery<{
      issueCreate: { success: boolean; issue: LinearIssue };
    }>(apiKey, mutation, variables);

    if (result.issueCreate.success) {
      return { success: true, issue: result.issueCreate.issue };
    }

    return { success: false, error: 'Issue creation failed' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Search for Linear issues
 */
export async function searchLinearIssues(
  apiKey: string,
  teamId: string,
  input: SearchIssuesInput
): Promise<{ success: boolean; issues?: LinearIssue[]; error?: string }> {
  try {
    const query = `
      query SearchIssues($filter: IssueFilter, $first: Int) {
        issues(filter: $filter, first: $first) {
          nodes {
            id
            identifier
            title
            url
            state { name }
            priority
            labels { nodes { name } }
          }
        }
      }
    `;

    const filter: Record<string, unknown> = {
      team: { id: { eq: teamId } },
    };

    if (input.query) {
      filter.or = [
        { title: { containsIgnoreCase: input.query } },
        { description: { containsIgnoreCase: input.query } },
      ];
    }

    if (input.status) {
      const statusMap: Record<string, string> = {
        backlog: 'Backlog',
        todo: 'Todo',
        in_progress: 'In Progress',
        done: 'Done',
        canceled: 'Canceled',
      };
      filter.state = { name: { eq: statusMap[input.status] ?? input.status } };
    }

    const result = await linearQuery<{
      issues: { nodes: LinearIssue[] };
    }>(apiKey, query, { filter, first: input.limit ?? 5 });

    return { success: true, issues: result.issues.nodes };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get a Linear issue by identifier (e.g., "COD-379")
 */
export async function getLinearIssue(
  apiKey: string,
  teamId: string,
  identifier: string
): Promise<{ success: boolean; issue?: LinearIssue; error?: string }> {
  try {
    // Use issues query with filter to find by identifier (e.g., "COD-379")
    // The issue(id:) query expects a UUID, not an identifier
    const query = `
      query GetIssueByIdentifier($filter: IssueFilter!) {
        issues(filter: $filter, first: 1) {
          nodes {
            id
            identifier
            title
            description
            url
            state { name }
            priority
            assignee { name email }
            labels { nodes { name } }
            createdAt
            updatedAt
          }
        }
      }
    `;

    // Parse identifier to extract team key and number (e.g., "COD-379" -> number: 379)
    const match = identifier.match(/^([A-Z]+)-(\d+)$/i);
    if (!match || !match[2]) {
      return { success: false, error: `Invalid identifier format: ${identifier}` };
    }

    const issueNumber = parseInt(match[2], 10);

    const result = await linearQuery<{ issues: { nodes: LinearIssue[] } }>(apiKey, query, {
      filter: {
        team: { id: { eq: teamId } },
        number: { eq: issueNumber },
      },
    });

    if (result.issues.nodes.length > 0) {
      return { success: true, issue: result.issues.nodes[0] };
    }

    return { success: false, error: 'Issue not found' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List Linear issues with filters
 */
export async function listLinearIssues(
  apiKey: string,
  teamId: string,
  input: ListIssuesInput
): Promise<{ success: boolean; issues?: LinearIssue[]; error?: string }> {
  try {
    const query = `
      query ListIssues($filter: IssueFilter, $first: Int) {
        issues(filter: $filter, first: $first, orderBy: updatedAt) {
          nodes {
            id
            identifier
            title
            url
            state { name }
            priority
            assignee { name email }
            labels { nodes { name } }
            updatedAt
          }
        }
      }
    `;

    const filter: Record<string, unknown> = {
      team: { id: { eq: teamId } },
    };

    if (input.status) {
      const statusMap: Record<string, string> = {
        backlog: 'Backlog',
        todo: 'Todo',
        in_progress: 'In Progress',
        done: 'Done',
        canceled: 'Canceled',
      };
      filter.state = { name: { eq: statusMap[input.status] ?? input.status } };
    }

    const result = await linearQuery<{
      issues: { nodes: LinearIssue[] };
    }>(apiKey, query, { filter, first: input.limit ?? 10 });

    return { success: true, issues: result.issues.nodes };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update a Linear issue
 */
export async function updateLinearIssue(
  apiKey: string,
  issueId: string,
  input: UpdateIssueInput
): Promise<{ success: boolean; issue?: LinearIssue; error?: string }> {
  try {
    const mutation = `
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            identifier
            title
            url
            state { name }
            priority
            assignee { name email }
            labels { nodes { name } }
          }
        }
      }
    `;

    const updateInput: Record<string, unknown> = {};

    if (input.title) updateInput.title = input.title;
    if (input.description) updateInput.description = input.description;
    if (input.priority) updateInput.priority = priorityToNumber(input.priority);
    if (input.stateId) updateInput.stateId = input.stateId;
    if (input.assigneeId) updateInput.assigneeId = input.assigneeId;
    if (input.labelIds) updateInput.labelIds = input.labelIds;
    if (input.projectId) updateInput.projectId = input.projectId;

    const result = await linearQuery<{
      issueUpdate: { success: boolean; issue: LinearIssue };
    }>(apiKey, mutation, { id: issueId, input: updateInput });

    if (result.issueUpdate.success) {
      return { success: true, issue: result.issueUpdate.issue };
    }

    return { success: false, error: 'Issue update failed' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Add a comment to a Linear issue
 */
export async function addLinearComment(
  apiKey: string,
  issueId: string,
  body: string
): Promise<{ success: boolean; comment?: LinearComment; error?: string }> {
  try {
    const mutation = `
      mutation AddComment($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment {
            id
            body
            createdAt
            user { name }
          }
        }
      }
    `;

    const result = await linearQuery<{
      commentCreate: { success: boolean; comment: LinearComment };
    }>(apiKey, mutation, { input: { issueId, body } });

    if (result.commentCreate.success) {
      return { success: true, comment: result.commentCreate.comment };
    }

    return { success: false, error: 'Comment creation failed' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get issue statuses for a team
 */
export async function getLinearStatuses(
  apiKey: string,
  teamId: string
): Promise<{ success: boolean; statuses?: Array<{ id: string; name: string; type: string }>; error?: string }> {
  try {
    const query = `
      query GetStatuses($teamId: String!) {
        team(id: $teamId) {
          states {
            nodes {
              id
              name
              type
            }
          }
        }
      }
    `;

    const result = await linearQuery<{
      team: { states: { nodes: Array<{ id: string; name: string; type: string }> } };
    }>(apiKey, query, { teamId });

    return { success: true, statuses: result.team.states.nodes };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format an issue for Discord display
 */
export function formatIssueForDiscord(issue: LinearIssue): string {
  const priorityEmoji: Record<number, string> = {
    1: '🔴',
    2: '🟠',
    3: '🟡',
    4: '🟢',
    0: '⚪',
  };

  const labels = issue.labels.nodes.map((l) => l.name).join(', ');

  return [
    `**${issue.identifier}**: ${issue.title}`,
    `${priorityEmoji[issue.priority] ?? '⚪'} ${issue.state.name}${labels ? ` | ${labels}` : ''}`,
    `🔗 ${issue.url}`,
  ].join('\n');
}

/**
 * Format an issue with full details for Discord display
 */
export function formatIssueDetailedForDiscord(issue: LinearIssue): string {
  const priorityEmoji: Record<number, string> = {
    1: '🔴 Urgent',
    2: '🟠 High',
    3: '🟡 Normal',
    4: '🟢 Low',
    0: '⚪ No priority',
  };

  const labels = issue.labels.nodes.map((l) => l.name).join(', ');
  const lines = [
    `**${issue.identifier}**: ${issue.title}`,
    ``,
    `📊 **Status:** ${issue.state.name}`,
    `${priorityEmoji[issue.priority] ?? '⚪ No priority'}`,
  ];

  if (issue.assignee) {
    lines.push(`👤 **Assignee:** ${issue.assignee.name}`);
  }

  if (labels) {
    lines.push(`🏷️ **Labels:** ${labels}`);
  }

  if (issue.description) {
    const truncatedDesc = issue.description.length > 500
      ? issue.description.substring(0, 500) + '...'
      : issue.description;
    lines.push(``, `📝 **Description:**`, truncatedDesc);
  }

  lines.push(``, `🔗 ${issue.url}`);

  return lines.join('\n');
}

/**
 * Get team members
 */
export async function getLinearUsers(
  apiKey: string,
  teamId: string
): Promise<{ success: boolean; users?: LinearUser[]; error?: string }> {
  try {
    const query = `
      query GetTeamMembers($teamId: String!) {
        team(id: $teamId) {
          members {
            nodes {
              id
              name
              email
              displayName
            }
          }
        }
      }
    `;

    const result = await linearQuery<{
      team: { members: { nodes: LinearUser[] } };
    }>(apiKey, query, { teamId });

    return { success: true, users: result.team.members.nodes };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get team labels
 */
export async function getLinearLabels(
  apiKey: string,
  teamId: string
): Promise<{ success: boolean; labels?: LinearLabel[]; error?: string }> {
  try {
    const query = `
      query GetTeamLabels($teamId: String!) {
        team(id: $teamId) {
          labels {
            nodes {
              id
              name
              color
            }
          }
        }
      }
    `;

    const result = await linearQuery<{
      team: { labels: { nodes: LinearLabel[] } };
    }>(apiKey, query, { teamId });

    return { success: true, labels: result.team.labels.nodes };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get team projects
 */
export async function getLinearProjects(
  apiKey: string,
  teamId: string
): Promise<{ success: boolean; projects?: LinearProject[]; error?: string }> {
  try {
    const query = `
      query GetTeamProjects($filter: ProjectFilter) {
        projects(filter: $filter, first: 50) {
          nodes {
            id
            name
            state
          }
        }
      }
    `;

    const result = await linearQuery<{
      projects: { nodes: LinearProject[] };
    }>(apiKey, query, {
      filter: {
        accessibleTeams: { id: { eq: teamId } },
      },
    });

    return { success: true, projects: result.projects.nodes };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Find user by name (case-insensitive partial match)
 */
export async function findLinearUser(
  apiKey: string,
  teamId: string,
  nameQuery: string
): Promise<{ success: boolean; user?: LinearUser; error?: string }> {
  const result = await getLinearUsers(apiKey, teamId);
  if (!result.success || !result.users) {
    return { success: false, error: result.error ?? 'Failed to fetch users' };
  }

  const nameLower = nameQuery.toLowerCase();
  const user = result.users.find(
    (u) =>
      u.name.toLowerCase().includes(nameLower) ||
      u.displayName.toLowerCase().includes(nameLower) ||
      u.email.toLowerCase().includes(nameLower)
  );

  if (user) {
    return { success: true, user };
  }

  return { success: false, error: `User not found: ${nameQuery}` };
}

/**
 * Find label by name (case-insensitive partial match)
 */
export async function findLinearLabel(
  apiKey: string,
  teamId: string,
  nameQuery: string
): Promise<{ success: boolean; label?: LinearLabel; error?: string }> {
  const result = await getLinearLabels(apiKey, teamId);
  if (!result.success || !result.labels) {
    return { success: false, error: result.error ?? 'Failed to fetch labels' };
  }

  const nameLower = nameQuery.toLowerCase();
  const label = result.labels.find((l) => l.name.toLowerCase().includes(nameLower));

  if (label) {
    return { success: true, label };
  }

  return { success: false, error: `Label not found: ${nameQuery}` };
}

/**
 * Find project by name (case-insensitive partial match)
 */
export async function findLinearProject(
  apiKey: string,
  teamId: string,
  nameQuery: string
): Promise<{ success: boolean; project?: LinearProject; error?: string }> {
  const result = await getLinearProjects(apiKey, teamId);
  if (!result.success || !result.projects) {
    return { success: false, error: result.error ?? 'Failed to fetch projects' };
  }

  const nameLower = nameQuery.toLowerCase();
  const project = result.projects.find((p) => p.name.toLowerCase().includes(nameLower));

  if (project) {
    return { success: true, project };
  }

  return { success: false, error: `Project not found: ${nameQuery}` };
}
