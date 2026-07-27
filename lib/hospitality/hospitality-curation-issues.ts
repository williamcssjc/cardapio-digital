export type HospitalityCurationIssue = {
  scope:
    | 'catalog'
    | 'first-gesture'
    | 'highlight'
    | 'recommendation'
    | 'signature'
  identifier: string
  reason:
    | 'duplicate'
    | 'self-reference'
    | 'circular-reference'
    | 'unmapped-catalog-product'
    | 'unresolved-category'
    | 'unresolved-product'
}

const reportedIssues = new Set<string>()

export function reportHospitalityCurationIssue(
  issue: HospitalityCurationIssue
) {
  if (process.env.NODE_ENV !== 'development') return

  const issueKey = `${issue.scope}:${issue.identifier}:${issue.reason}`
  if (reportedIssues.has(issueKey)) return

  reportedIssues.add(issueKey)
  console.warn('[hospitality-curation] Unresolved editorial reference', issue)
}
