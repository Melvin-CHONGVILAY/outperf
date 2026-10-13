# Fiche App Store : Outperf

Tout ce qu'il faut copier dans App Store Connect. Les longueurs respectent les limites d'Apple.

## Informations de l'app

| Champ | Valeur |
|---|---|
| Nom (30 max) | **Outperf : suivi du travail** (si le nom est pris : « Outperf : chrono et stats ») |
| Sous-titre (30 max) | **Chrono, stats et discipline** |
| Langue principale | Français |
| Catégorie principale | Productivité |
| Catégorie secondaire | Éducation |
| Bundle ID | `com.melvinchongvilay.outperf` |
| SKU | `outperf-ios` |
| Prix | Gratuit |
| Classification par âge | 4+ (répondre « Non » ou « Aucun » à toutes les questions) |
| Copyright | 2026 Melvin Chongvilay |
| URL de confidentialité | https://melvin-chongvilay.github.io/outperf/privacy.html |
| URL d'assistance | https://melvin-chongvilay.github.io/outperf/support.html |
| URL marketing (facultatif) | https://melvin-chongvilay.github.io/outperf/ |

## Mots-clés (100 caractères max)

```
chrono,pomodoro,productivité,objectif,discipline,habitudes,focus,étude,révision,temps travail,série
```

## Texte promotionnel (170 max, modifiable sans nouvelle version)

```
Chaque heure de travail compte. Chronomètre tes sessions, bats ton toi d'hier et construis une série de jours à l'objectif.
```

## Description

```
Outperf est fait pour celles et ceux qui ont des objectifs et veulent des preuves, pas des impressions. Tu sais exactement combien d'heures tu as vraiment travaillé, sur quoi, et si tu fais mieux qu'hier.

BATS TON TOI D'HIER
Chaque jour, Outperf te compare à la veille, ta semaine à la semaine dernière et ton mois au mois dernier, au même moment. Tu vois en direct ce qu'il te manque pour passer devant.

CHRONO ET ROUNDS
Lance une session en une touche : le temps va directement dans la bonne catégorie. Travaille en rounds de 25, 50 ou 90 minutes, avec une notification en fin de round, même app fermée.

DES STATS QUI NE MENTENT PAS
Analyse par jour, semaine ou mois, glisse pour remonter le temps et comparer. Course du mois, calendrier de régularité, moyenne par jour de la semaine, 12 derniers mois, détail par catégorie avec tes objectifs hebdomadaires.

LA DISCIPLINE, VISIBLE
Une note de S à D chaque jour selon ton objectif atteint, des séries de jours consécutifs, et un rappel le soir si ton objectif n'est pas encore tenu.

TES CATÉGORIES, TES RÈGLES
Révisions, projets, prépa entretiens, lecture, sport : crée, renomme, colore et archive tes catégories. Choisis ce qui compte dans ton temps de travail et ce que tu veux seulement suivre.

TES DONNÉES T'APPARTIENNENT
Pas de compte à créer : tout reste sur ton iPhone. Export Excel, sauvegarde en un fichier, import depuis tes notes. Pas de publicité, pas de pistage.

Outperf : moins d'excuses, plus d'heures.
```

## Nouveautés de la version 1.0.0

```
Première version d'Outperf : chrono et rounds, comparaison avec ton toi d'hier, stats par jour, semaine et mois, calendrier de régularité et rappel du soir.
```

## Captures d'écran

Dossier `store/screenshots/` : 5 images 1320 × 2868 (iPhone 6,9 pouces), dans l'ordre 01 à 05. App Store Connect les réduit automatiquement pour les autres tailles d'iPhone.

## Confidentialité de l'app (questionnaire App Store Connect)

Version 1.0 (sans compte) : « Collectez-vous des données à partir de cette app ? » : **Non, nous ne collectons pas de données**. Tout reste sur l'appareil.

Quand le compte sera activé (version suivante, `config.js` rempli), il faudra déclarer ces données ici et dans `app/ios/App/App/PrivacyInfo.xcprivacy` (clé `NSPrivacyCollectedDataTypes`, aujourd'hui vide) :

| Type de donnée | Utilisation | Liée à l'utilisateur | Suivi (tracking) |
|---|---|---|---|
| Coordonnées : adresse e-mail | Fonctionnalités de l'app | Oui | Non |
| Contenu utilisateur : autre contenu (catégories, sessions de travail) | Fonctionnalités de l'app | Oui | Non |

## Informations pour la revue d'Apple (App Review)

Champ « Notes » (en anglais, c'est plus rapide pour les reviewers) :

```
Outperf is a work time tracker. The app works entirely offline without any account: categories, timers and statistics are stored on the device only. No login is required.

To see the statistics filled in quickly: on first launch, tap "Commencer", then "Explorer d'abord avec des données d'exemple" to load sample data.

Notifications are local only: end of a timer round, and an optional evening reminder the user enables in Settings. No ads, no tracking, no third-party analytics, no data collection.
```

Coche « Connexion requise » : **Non**.
