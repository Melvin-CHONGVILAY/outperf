# Mettre Outperf sur l'App Store

Le code est prêt : app iOS native (Capacitor) compilée et testée avec Xcode 27, sans compte, pages légales, fiche App Store et captures. Il reste les étapes qui demandent tes accès. Compte environ 1 h 30 au total, hors délai de validation d'Apple.

## Ce que contient le dépôt

| Dossier | Rôle |
|---|---|
| `app/src` | Code de l'app (une seule base pour l'iPhone et la version web) |
| `app/src/config.js` | Liens des pages légales et adresse de contact |
| `app/ios` | Projet Xcode généré par Capacitor (iPhone uniquement, portrait, manifeste de confidentialité) |
| `app/store` | Fiche App Store, icône 1024, captures 6,9 pouces |
| `.github/workflows/ios-release.yml` | Compile l'app sur un Mac de GitHub et l'envoie sur App Store Connect |
| racine | Version web et pages `privacy.html`, `terms.html`, `support.html` (GitHub Pages) |

## Étape 1. Adresse de contact (5 min, maintenant)

Apple exige un moyen de te contacter. Crée une adresse dédiée (par exemple une adresse Gmail pour Outperf) et indique‑la dans `app/src/config.js`, champ `contactEmail`. Elle apparaîtra sur les pages Aide et Confidentialité.

## Étape 2. Compte utilisateur (plus tard, version 1.1)

La version 1.0 n'a pas de compte : tout reste sur l'iPhone. Le système de compte (Supabase) est conservé dans le tag git `account-system-draft`. Ne le réintègre que s'il est **visible et utilisable** dans l'app au moment de la soumission, avec un compte de démo pour Apple et des pages d'aide et de confidentialité mises à jour : du code présent mais désactivé a valu un refus 5.6 (« fonctions cachées ») au build 1.

## Étape 3. Apple, une fois ton compte développeur validé (15 min)

1. **Xcode > Réglages > Comptes > + > Apple ID** : connecte le compte de ton abonnement développeur.
2. Ouvre `app/ios/App/App.xcodeproj`. Projet **App** > cible **App** > **Signing & Capabilities** > **Team** : choisis ton équipe. Xcode crée seul l'identifiant `com.melvinchongvilay.outperf` et les certificats.
3. **App Store Connect > Apps > + > Nouvelle app** : plateforme iOS, nom `Outperf : suivi du travail`, langue Français, Bundle ID `com.melvinchongvilay.outperf`, SKU `outperf-ios`, accès complet.

## Étape 4. Compiler et envoyer depuis ton Mac (10 min, puis 20 min d'attente)

Le projet a déjà été compilé et testé avec Xcode 27 sur le simulateur iOS 27 (iPhone 17e, iPhone 18 Pro, iPad).

1. Pour repartir de la dernière version du code, dans le Terminal :
   ```
   cd ~/Documents && git clone https://github.com/Melvin-CHONGVILAY/outperf.git outperf-src
   cd outperf-src/app && npm ci && python3 build.py && npx cap sync ios
   open ios/App/App.xcodeproj
   ```
   (Node.js est nécessaire. Si `npm` est introuvable, installe la version LTS depuis nodejs.org.)
2. Dans Xcode, en haut, choisis la destination **Any iOS Device (arm64)**, puis **Product > Archive**.
3. La fenêtre **Organizer** s'ouvre : **Distribute App > App Store Connect > Distribute**. Xcode signe et envoie le build.
4. Environ 15 minutes plus tard, le build apparaît dans **App Store Connect > TestFlight**. Installe **TestFlight** sur ton iPhone, ajoute toi comme testeur interne, teste l'app et crée le compte de démo pour Apple.

Pour chaque nouvelle version : change **Version** (1.0.1, 1.1.0…) et augmente **Build** dans l'onglet **General** de la cible, puis archive à nouveau.

## Variante : compiler depuis GitHub, sans ton Mac

1. **developer.apple.com > Account > Membership details** : note ton **Team ID** (10 caractères).
2. **App Store Connect > Utilisateurs et accès > Intégrations > Clés API App Store Connect > +** : nom `GitHub`, accès **Admin** (nécessaire pour que GitHub crée lui même les certificats de signature). Télécharge le fichier `.p8` (une seule fois possible), note le **Key ID** et l'**Issuer ID**.
3. Sur GitHub, dépôt `outperf` > **Settings > Secrets and variables > Actions > New repository secret**, crée :
   - `APPLE_TEAM_ID` : ton Team ID
   - `ASC_KEY_ID` : le Key ID
   - `ASC_ISSUER_ID` : l'Issuer ID
   - `ASC_KEY_P8` : tout le contenu du fichier `.p8`, lignes BEGIN et END comprises
4. **Actions > iOS release > Run workflow**, version `1.0.0`. Le build tourne sur un Mac de GitHub (gratuit pour un dépôt public) et arrive dans TestFlight comme avec Xcode. Pour chaque nouvelle version, relance le workflow avec un numéro plus grand ; le numéro de build s'incrémente tout seul.

## Étape 5. Soumettre à Apple (30 min)

Dans App Store Connect, fiche de l'app, recopie `app/store/fiche-app-store.md` :
- textes, mots-clés, URL de confidentialité et d'assistance ;
- les 5 captures du dossier `app/store/screenshots` (section iPhone 6,9 pouces) ;
- questionnaire de confidentialité et classification par âge ;
- prix : gratuit, disponibilité : tous les pays (ou la France seulement pour commencer) ;
- sélectionne le build envoyé depuis Xcode (ou GitHub) ;
- notes pour la revue avec le compte de démo.

Puis **Ajouter pour vérification > Soumettre**. La revue prend en général 24 à 48 h.

## Plus tard : la version Pro

L'app est entièrement gratuite pour l'instant. Le point d'entrée est prêt dans le code (`isPro()` dans `app/src/app.js`). Pour vendre un abonnement, il faudra :
1. accepter le contrat **Apps payantes** dans App Store Connect (banque et fiscalité) ;
2. créer les abonnements (mensuel, annuel) dans App Store Connect ;
3. brancher l'achat intégré d'Apple, obligatoire pour débloquer des fonctionnalités (règle 3.1.1), par exemple avec RevenueCat ;
4. ajouter un écran d'abonnement avec prix, durée, renouvellement automatique, liens vers les conditions et la confidentialité, et un bouton « Restaurer les achats » (règle 3.1.2).
