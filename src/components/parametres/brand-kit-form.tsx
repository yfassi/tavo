'use client'

import { useTransition } from 'react'
import { updateBrandKit, uploadLogo } from '@/lib/actions/brand'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { BrandKit } from '@/lib/types/brand'

const ALLOWED_FONTS = ['Inter', 'Playfair Display', 'Lora', 'Montserrat', 'Raleway', 'Roboto Slab']

export function BrandKitForm({
  brandKit,
  venueId,
  logoUrl,
}: {
  brandKit: BrandKit
  venueId: string
  logoUrl: string | null
}) {
  const [isPending, startTransition] = useTransition()

  function handleColorChange(field: string, value: string) {
    startTransition(() => {
      updateBrandKit(brandKit.id, { [field]: value })
    })
  }

  function handleFontChange(field: string, value: string) {
    startTransition(() => {
      updateBrandKit(brandKit.id, { [field]: value })
    })
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('logo', file)
    startTransition(() => {
      uploadLogo(venueId, formData)
    })
  }

  return (
    <Card className={isPending ? 'opacity-50' : ''}>
      <CardHeader>
        <CardTitle>Identité visuelle</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Couleur principale</Label>
            <Input
              type="color"
              defaultValue={brandKit.primary_color}
              onBlur={(e) => handleColorChange('primary_color', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Couleur secondaire</Label>
            <Input
              type="color"
              defaultValue={brandKit.secondary_color ?? '#f5f0e8'}
              onBlur={(e) => handleColorChange('secondary_color', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Couleur d&apos;accent</Label>
            <Input
              type="color"
              defaultValue={brandKit.accent_color ?? '#c2185b'}
              onBlur={(e) => handleColorChange('accent_color', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Police titres</Label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              defaultValue={brandKit.font_heading}
              onChange={(e) => handleFontChange('font_heading', e.target.value)}
            >
              {ALLOWED_FONTS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Police corps</Label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              defaultValue={brandKit.font_body}
              onChange={(e) => handleFontChange('font_body', e.target.value)}
            >
              {ALLOWED_FONTS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo"
                className="h-16 w-16 rounded-lg object-contain border"
              />
            )}
            <Input type="file" accept="image/*" onChange={handleLogoUpload} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
