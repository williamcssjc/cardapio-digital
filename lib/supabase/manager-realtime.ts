import { subscribeToOperations } from './operations-realtime'

type ManagerOperationSubscription = Omit<
  Parameters<typeof subscribeToOperations>[0],
  'channelScope'
>

export function subscribeToManagerOperations(
  options: ManagerOperationSubscription
) {
  return subscribeToOperations({
    ...options,
    channelScope: 'manager',
  })
}
