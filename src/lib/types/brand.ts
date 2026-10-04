export interface BrandKit {
  id: string
  venue_id: string
  primary_color: string
  secondary_color: string | null
  accent_color: string | null
  font_heading: string
  font_body: string
  tone_of_voice: string
}

export interface Venue {
  id: string
  organization_id: string
  name: string
  address: string | null
  cuisine_type: string | null
  timezone: string
  public_slug: string | null
  logo_url: string | null
}

export interface Organization {
  id: string
  name: string
}
