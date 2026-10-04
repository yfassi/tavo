'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function QRCodeDisplay({ slug }: { slug: string }) {
  const [svgData, setSvgData] = useState('')
  const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL}/m/${slug}`

  useEffect(() => {
    QRCode.toString(menuUrl, {
      type: 'svg',
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).then(setSvgData)
  }, [menuUrl])

  function handleDownloadSVG() {
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${slug}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDownloadPNG() {
    const dataUrl = await QRCode.toDataURL(menuUrl, { width: 1024, margin: 2 })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `qr-${slug}.png`
    a.click()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>QR Code — Menu interactif</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="mx-auto w-64 h-64 border rounded-lg p-4"
          dangerouslySetInnerHTML={{ __html: svgData }}
        />

        <div className="space-y-2">
          <Label>URL du menu</Label>
          <Input readOnly value={menuUrl} />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadSVG}>
            Télécharger SVG
          </Button>
          <Button variant="outline" onClick={handleDownloadPNG}>
            Télécharger PNG
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
