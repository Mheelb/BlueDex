<script setup lang="ts">
import Heading from '@/components/common/Heading.vue'
</script>

<template>
  <div>
    <Heading>Politique de confidentialité</Heading>

    <div class="prose prose-invert mt-8 max-w-none">
      <p>
        BlueDex est un projet de fan à but non commercial. Cette page explique quelles données
        sont collectées lorsque tu crées un compte, et comment elles sont utilisées.
      </p>

      <h2>Consultation du site</h2>
      <p>
        Parcourir les sets, les cartes et les actus ne nécessite aucun compte et ne collecte
        aucune donnée personnelle. Le site n'utilise pas de cookies publicitaires ou de suivi, et
        aucun outil d'analytics n'est installé.
      </p>

      <h2>Création d'un compte</h2>
      <p>Si tu crées un compte (pour le deck builder), les données suivantes sont enregistrées :</p>
      <ul>
        <li>ton adresse email et ton mot de passe (géré de façon chiffrée par Supabase Auth) ;</li>
        <li>un pseudo (« display name ») et, si tu en ajoutes un, un avatar ;</li>
        <li>les decks que tu crées (nom, format, cartes, visibilité publique/privée).</li>
      </ul>
      <p>
        La session de connexion est conservée dans le stockage local de ton navigateur
        (localStorage) afin de te garder connecté — il ne s'agit pas d'un cookie de suivi
        publicitaire.
      </p>

      <h2>Utilisation des données</h2>
      <p>
        Ces informations servent uniquement au fonctionnement du site : t'identifier, afficher ton
        pseudo/avatar, et sauvegarder tes decks. Elles ne sont ni vendues ni partagées avec des
        tiers à des fins commerciales.
      </p>

      <h2>Hébergement des données</h2>
      <p>
        Les données sont stockées via Supabase (base de données, authentification et stockage des
        fichiers). Le site est hébergé par Netlify.
      </p>

      <h2>Tes droits</h2>
      <p>
        Conformément au RGPD, tu peux à tout moment demander l'accès, la rectification ou la
        suppression de tes données, ou la suppression complète de ton compte, en écrivant à
        <a href="mailto:contact@bluedex.fr">contact@bluedex.fr</a>.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question sur cette politique, écris à
        <a href="mailto:contact@bluedex.fr">contact@bluedex.fr</a>.
      </p>
    </div>
  </div>
</template>
