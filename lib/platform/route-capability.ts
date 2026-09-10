import 'server-only'

import { NextResponse } from 'next/server'

import { requireImplementationCapability } from '@/lib/platform/capabilities'
import type { CapabilityKey } from '@/types/platform'

export function requireRouteCapability(
  capability: CapabilityKey
): NextResponse<{ error: string }> | null {
  const availability = requireImplementationCapability(capability)

  if (availability.ok) {
    return null
  }

  return NextResponse.json(
    { error: availability.error },
    { status: availability.status }
  )
}
