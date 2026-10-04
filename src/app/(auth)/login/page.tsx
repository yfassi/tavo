import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login, loginWithMagicLink } from '@/lib/auth/actions'
import Link from 'next/link'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await searchParams

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Connexion</CardTitle>
        <CardDescription>Connectez-vous à votre compte Tavo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error === 'invalid_credentials' && (
          <p className="text-sm text-red-600">Email ou mot de passe incorrect.</p>
        )}
        {error === 'magic_link_failed' && (
          <p className="text-sm text-red-600">Erreur lors de l&apos;envoi du lien magique.</p>
        )}
        {message === 'magic_link_sent' && (
          <p className="text-sm text-green-600">
            Un lien de connexion a été envoyé à votre adresse email.
          </p>
        )}

        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <Button formAction={login} className="w-full">
            Se connecter
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        <form>
          <div className="space-y-2">
            <Label htmlFor="magic-email">Connexion par lien magique</Label>
            <Input
              id="magic-email"
              name="email"
              type="email"
              placeholder="votre@email.fr"
              required
            />
          </div>
          <Button formAction={loginWithMagicLink} variant="outline" className="mt-2 w-full">
            Recevoir un lien de connexion
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{' '}
          <Link href="/signup" className="text-primary underline">
            Créer un compte
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
