# Tavo

Assistant de communication IA pour restaurateurs, bars et cafés.

## Démarrage rapide

### Prérequis

- Node.js 22+
- pnpm 10+
- Compte Supabase (projet configuré)

### Installation

```bash
# Cloner le repo
git clone <repo-url>
cd flatback

# Installer les dépendances
pnpm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Remplir les valeurs dans .env.local

# Lancer le serveur de développement
pnpm dev
```

### Variables d'environnement

Voir `.env.example` pour la liste complète. Au minimum :

- `NEXT_PUBLIC_SUPABASE_URL` — URL du projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Clé publique Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — Clé service (serveur uniquement)

### Commandes

```bash
pnpm dev          # Serveur de développement
pnpm build        # Build de production
pnpm lint         # Vérification lint + format
pnpm typecheck    # Vérification des types
pnpm test         # Tests unitaires
pnpm test:e2e     # Tests end-to-end
```

### Base de données

Les migrations Supabase sont dans `supabase/migrations/`. Pour appliquer :

```bash
npx supabase link --project-ref wdicazfetgqseqohambv
npx supabase db push
```

Données de démo (restaurant fictif "Chez Rosalie") :

```bash
npx supabase db reset --linked
```

## Déploiement

Voir [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) pour le guide complet de déploiement (Supabase, Stripe, Vercel).

## Licence

Propriétaire — Tous droits réservés.
