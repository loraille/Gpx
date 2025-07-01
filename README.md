# Sports Outdoor Périgord Vert

Ce projet propose un visualiseur interactif de tracés GPX (VTT, trail, course à pied) pour la région du Périgord Vert, avec affichage 2D/3D, infos de parcours, et téléchargement.

## Structure du projet

- **index.html** : Page d'accueil, sélection des activités, affichage de la carte, accès aux événements, contact, etc.
- **trackInfos.html** : Visualisation détaillée d'un tracé (infos, élévation, carte 2D/3D, téléchargement).
- **styles.css** : Styles principaux pour l'accueil, la navigation, la présentation.
- **stylesTrackInfos.css** : Styles spécifiques à la page de détails d'un tracé.
- **scripts/**
  - **tracks.js** : Liste les fichiers GPX disponibles par activité (VTT, course, trail).
  - **track.js** : Logique de la page de détail d'un tracé (chargement GPX, affichage infos, élévation, carte, etc.).
  - **map2d.js** : Affichage et interactions sur la carte 2D (Leaflet) pour la sélection de tracés.
  - **map3d.js** : Affichage 3D d'un tracé avec Three.js.
  - **controle.js** : Contrôles d'interface et interactions diverses.
  - **geoFunction.js** : Calcul de distance entre deux points (formule de Haversine).
- **data/** : Fichiers GPX locaux (non utilisés en production, les GPX sont chargés depuis Cloudinary).
- **img/** : Images utilisées sur le site (icônes, illustrations, bannières, etc.).
- **sopv.ico** : Favicon du site.
- **robots.txt** et **sitemap.xml** : Pour le référencement.

## Fonctionnement

- **Accueil** : Sélectionne une activité (VTT, course, trail) pour afficher les parcours sur la carte.
- **Carte 2D** : Affiche tous les tracés de l'activité choisie, possibilité de survoler/sélectionner un tracé.
- **Détail d'un tracé** : Affichage du profil d'élévation, infos globales, description, carte 2D et 3D, téléchargement GPX.
- **GPX** : Les fichiers sont stockés sur Cloudinary et chargés dynamiquement.
- **3D** : Utilisation de Three.js pour la visualisation du relief du parcours.

## Dépendances externes

- [Leaflet](https://leafletjs.com/) (cartographie 2D)
- [Three.js](https://threejs.org/) (visualisation 3D)
- [Splide.js](https://splidejs.com/) (carousel d'événements)
- [ag-charts-community](https://www.ag-grid.com/charts/) (profil d'élévation)
- [Boxicons](https://boxicons.com/) (icônes)

## Lancement local

1. Cloner le dépôt.
2. Ouvrir `index.html` dans un navigateur moderne.
3. (Optionnel) Pour tester avec des fichiers GPX locaux, modifier les chemins dans `tracks.js`.
