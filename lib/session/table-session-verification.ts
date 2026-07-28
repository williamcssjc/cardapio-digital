let verifiedTableSessionId: number | null = null

export function markTableSessionVerified(tableSessionId: number) {
  verifiedTableSessionId = tableSessionId
}

export function isTableSessionVerified(tableSessionId: number | null) {
  return (
    tableSessionId !== null &&
    verifiedTableSessionId === tableSessionId
  )
}
