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
  url: string;
  state: { name: string };
  priority: number;
  labels: { nodes: Array<{ name: string }> };
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

  const result: LinearGraphQLResponse<T> = await response.json();

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
