<script setup lang="ts">
import Heading from '@/components/common/Heading.vue'
</script>

<template>
  <div>
    <Heading>Mentions légales</Heading>

    <div class="prose prose-invert mt-8 max-w-none">
      <h2>Éditeur du site</h2>
      <p>
        BlueDex est un projet personnel, non commercial, édité par Mheelb. Contact :
        <a href="mailto:contact@bluedex.fr">contact@bluedex.fr</a>.
      </p>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par Netlify, Inc. — 44 Montgomery Street, Suite 300, San Francisco, California 94104,
        États-Unis.
      </p>
      <p>La base de données, l'authentification et le stockage des images sont fournis par Supabase (Supabase Inc.).</p>

      <h2>Propriété intellectuelle</h2>
      <p>
        BlueDex est un projet de fan, non affilié et non approuvé par l'éditeur du jeu de cartes à collectionner Blue
        Rising. Les noms, logos, illustrations et éléments de jeu de Blue Rising restent la propriété de leurs ayants
        droit respectifs. Les scans de cartes sont reproduits à titre purement informatif et communautaire.
      </p>
      <p>
        Le code, les textes et les éléments graphiques propres à BlueDex (hors visuels de cartes) sont la propriété de
        l'éditeur du site.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question relative au site ou à son contenu, tu peux écrire à
        <a href="mailto:contact@bluedex.fr">contact@bluedex.fr</a>.
      </p>
    </div>
  </div>
</template>
