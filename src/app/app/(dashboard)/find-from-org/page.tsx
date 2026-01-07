'use client'

import FindFromOrgPanel from '@/components/icp/find-from-org-panel'
import { FeatureGate } from '@/components/FeatureGate'

export default function FindFromOrgPage() {
  return (
    <FeatureGate feature="peopleIntel">
      <div className="w-full flex flex-col items-center px-4 py-8">
        <FindFromOrgPanel />
      </div>
    </FeatureGate>
  )
}
