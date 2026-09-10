import 'server-only'

import { notFound } from 'next/navigation'

import { requireImplementationCapability } from '@/lib/platform/capabilities'
import type { CapabilityKey } from '@/types/platform'

export function requireActiveCapability(capability: CapabilityKey): void {
  const availability = requireImplementationCapability(capability)

  if (!availability.ok) {
    notFound()
  }
}
