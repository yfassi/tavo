import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Tavo',
}

export default function ConfidentialitePage() {
  return (
    <article className="prose prose-neutral max-w-none">
      <h1>Politique de confidentialité</h1>
      <p className="text-sm text-muted-foreground">Dernière mise à jour : octobre 2026</p>

      <h2>1. Responsable du traitement</h2>
      <p>
        Tavo est un service édité par [Raison sociale à compléter], ci-après « Tavo ». Pour toute
        question relative à la protection de vos données, vous pouvez nous contacter à
        l&apos;adresse : <strong>[email à compléter]</strong>.
      </p>

      <h2>2. Données collectées</h2>
      <p>Nous collectons les données suivantes :</p>
      <ul>
        <li>
          <strong>Données de compte</strong> : adresse email, mot de passe (hashé), nom de
          l&apos;établissement.
        </li>
        <li>
          <strong>Données de carte</strong> : noms des plats, descriptions, prix, allergènes, photos
          importées.
        </li>
        <li>
          <strong>Données techniques</strong> : logs de connexion, adresse IP (pour la sécurité
          uniquement).
        </li>
      </ul>
      <p>
        Le <strong>menu interactif public</strong> (/m/[slug]) ne collecte aucune donnée
        personnelle, n&apos;utilise aucun cookie non essentiel et ne recourt à aucun outil de suivi
        tiers.
      </p>

      <h2>3. Finalités du traitement</h2>
      <ul>
        <li>Fourniture du service (affichage TV, menu interactif, studio photo).</li>
        <li>Traitement des paiements (via Stripe, sous-traitant).</li>
        <li>Amélioration du service et support technique.</li>
      </ul>

      <h2>4. Base légale</h2>
      <p>
        Le traitement est fondé sur l&apos;exécution du contrat (abonnement) et, pour les cookies de
        session, sur l&apos;intérêt légitime (fonctionnement technique du service).
      </p>

      <h2>5. Sous-traitants</h2>
      <ul>
        <li>
          <strong>Supabase</strong> (hébergement base de données, UE) — stockage des données.
        </li>
        <li>
          <strong>Vercel</strong> (hébergement application, CDG Paris) — hébergement de
          l&apos;application.
        </li>
        <li>
          <strong>Stripe</strong> (paiements) — traitement des transactions.
        </li>
        <li>
          <strong>Anthropic</strong> (IA) — analyse d&apos;images de carte (données envoyées
          uniquement pour l&apos;import).
        </li>
        <li>
          <strong>Stability AI</strong> (IA) — traitement d&apos;images de plats.
        </li>
      </ul>

      <h2>6. Hébergement</h2>
      <p>
        Toutes les données sont hébergées au sein de l&apos;Union européenne (Supabase EU-West,
        Vercel CDG Paris).
      </p>

      <h2>7. Durée de conservation</h2>
      <p>
        Les données sont conservées pendant la durée du contrat. En cas de suppression de compte,
        les données sont anonymisées et les fichiers supprimés dans un délai de 30 jours.
      </p>

      <h2>8. Vos droits</h2>
      <p>Conformément au RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li>
          <strong>Accès</strong> : obtenir une copie de vos données.
        </li>
        <li>
          <strong>Rectification</strong> : corriger vos données dans le tableau de bord.
        </li>
        <li>
          <strong>Suppression</strong> : demander la suppression de votre compte et de vos données.
        </li>
        <li>
          <strong>Portabilité</strong> : exporter vos données au format JSON.
        </li>
      </ul>
      <p>
        Pour exercer vos droits, rendez-vous dans Paramètres &gt; Mes données, ou contactez-nous par
        email.
      </p>

      <h2>9. Cookies</h2>
      <p>
        Tavo utilise uniquement un cookie de session technique, strictement nécessaire au
        fonctionnement du service. Aucun cookie publicitaire ou de suivi n&apos;est utilisé. Aucun
        bandeau de consentement n&apos;est nécessaire.
      </p>

      <h2>10. Sécurité</h2>
      <p>
        Nous mettons en œuvre des mesures techniques (chiffrement, contrôle d&apos;accès par ligne,
        tokens hashés) et organisationnelles pour protéger vos données.
      </p>
    </article>
  )
}
