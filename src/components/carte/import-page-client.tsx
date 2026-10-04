'use client'

import { useState } from 'react'
import { ImportUpload } from '@/components/carte/import-upload'
import { ImportReview } from '@/components/carte/import-review'
import type { MenuImportResult } from '@/lib/ai/schemas'

export function ImportPageClient({ menuId }: { menuId: string }) {
  const [importResult, setImportResult] = useState<MenuImportResult | null>(null)

  if (importResult) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Vérifier l&apos;import</h1>
        <ImportReview
          menuId={menuId}
          initialData={importResult}
          onBack={() => setImportResult(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Importer une carte</h1>
      <ImportUpload onResult={setImportResult} />
    </div>
  )
}
