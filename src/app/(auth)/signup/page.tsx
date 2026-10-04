import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signup } from '@/lib/auth/actions'
import Link from 'next/link'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Créer un compte</CardTitle>
        <CardDescription>Commencez votre essai gratuit de 14 jours</CardDescription>
      </CardHeader>
      <CardContent>
        {error === 'signup_failed' && (
          <p id="signup-error" role="alert" className="mb-4 text-sm text-red-600">
            Erreur lors de la création du compte. Vérifiez vos informations.
          </p>
        )}

        <form className="space-y-4" aria-describedby={error ? 'signup-error' : undefined}>
          <div className="space-y-2">
            <Label htmlFor="venue_name">Nom de l&apos;établissement</Label>
            <Input id="venue_name" name="venue_name" placeholder="Chez Rosalie" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
          </div>
          <Button formAction={signup} className="w-full">
            Créer mon compte
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-primary underline">
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
