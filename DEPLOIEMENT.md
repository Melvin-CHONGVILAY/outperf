# Mettre Outperf sur l'App Store

Le code est prêt : app iOS native (Capacitor), compte facultatif, pages légales, pipeline de build sur GitHub, fiche App Store et captures. Il reste les étapes qui demandent tes accès. Compte environ 1 h 30 au total, hors délai de validation d'Apple.

## Ce que contient le dépôt

| Dossier | Rôle |
|---|---|
| `app/src` | Code de l'app (une seule base pour l'iPhone et la version web) |
| `app/src/config.js` | Réglages à compléter : Supabase et adresse de contact |
| `app/ios` | Projet Xcode généré par Capacitor (iPhone uniquement, portrait, manifeste de confidentialité) |
| `app/supabase/schema.sql` | Base de données du compte, avec les règles de sécurité et la suppression de compte |
| `app/store` | Fiche App Store, icône 1024, captures 6,9 pouces |
| `.github/workflows/ios-release.yml` | Compile l'app sur un Mac de GitHub et l'envoie sur App Store Connect |
| racine | Version web et pages `privacy.html`, `terms.html`, `support.html` (GitHub Pages) |

## Étape 1. Adresse de contact (5 min, maintenant)

Apple exige un moyen de te contacter. Crée une adresse dédiée (par exemple une adresse Gmail pour Outperf) et indique‑la dans `app/src/config.js`, champ `contactEmail`. Elle apparaîtra sur les pages Aide et Confidentialité.

## Étape 2. Le compte utilisateur avec Supabase (30 min, maintenant)

1. Crée un compte gratuit sur supabase.com, puis **New project** : nom `outperf`, région **Europe (Frankfurt ou Paris)**, garde le mot de passe de la base quelque part.
2. **SQL Editor** : colle tout le contenu de `app/supabase/schema.sql`, puis **Run**.
3. **Authentication > Sign In / Providers > Email** :
   - Email activé ;
   - **Confirm email : désactivé** (l'inscription connecte directement, sans lien à ouvrir) ;
   - longueur minimale du mot de passe : 8.
4. **Envoi des emails** (obligatoire pour « mot de passe oublié ») : Supabase n'envoie plus d'emails à tes utilisateurs sans serveur SMTP. Crée un compte gratuit Brevo ou Resend, puis renseigne son SMTP dans **Authentication > Emails > SMTP Settings**.
5. **Authentication > Emails > Templates > Reset Password** : remplace le contenu par :
   ```
   <h2>Ton code Outperf</h2>
   <p>Saisis ce code dans l'app pour choisir un nouveau mot de passe :</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
   <p>Si tu n'as rien demandé, ignore cet email.</p>
   ```
6. **Project Settings > API** : copie la **Project URL** et la clé **anon public**, et colle‑les dans `app/src/config.js` (`supabaseUrl`, `supabaseAnonKey`). Cette clé est publique par conception : ce sont les règles du fichier SQL qui protègent les données.
7. Crée le compte de démo pour Apple depuis l'app une fois publiée en TestFlight (étape 4), puis note l'email et le mot de passe dans la fiche (`app/store/fiche-app-store.md`).

Sans ces deux champs, l'app fonctionne quand même, simplement sans compte.

## Étape 3. Apple, une fois ton compte développeur validé (20 min)

1. **developer.apple.com > Account > Membership details** : note ton **Team ID** (10 caractères).
2. **Certificates, Identifiers & Profiles > Identifiers > +** : App IDs, App, description `Outperf`, Bundle ID **Explicit** `com.melvinchongvilay.outperf`. Aucune capacité à cocher.
3. **App Store Connect > Apps > + > Nouvelle app** : plateforme iOS, nom `Outperf : suivi du travail`, langue Français, Bundle ID ci‑dessus, SKU `outperf-ios`, accès complet.
4. **App Store Connect > Utilisateurs et accès > Intégrations > Clés API App Store Connect > +** : nom `GitHub`, accès **Admin** (nécessaire pour que GitHub crée lui même les certificats de signature). Télécharge le fichier `.p8` (une seule fois possible), note le **Key ID** et l'**Issuer ID**.

## Étape 4. Compiler et envoyer depuis GitHub (5 min, puis 20 min d'attente)

1. Sur GitHub, dépôt `outperf` > **Settings > Secrets and variables > Actions > New repository secret**, crée :
   - `APPLE_TEAM_ID` : ton Team ID
   - `ASC_KEY_ID` : le Key ID
   - `ASC_ISSUER_ID` : l'Issuer ID
   - `ASC_KEY_P8` : tout le contenu du fichier `.p8`, lignes BEGIN et END comprises
2. **Actions > iOS release > Run workflow**, version `1.0.0`. Le build tourne sur un Mac de GitHub (gratuit pour un dépôt public) avec Xcode 26, exigé par Apple depuis avril 2026.
3. Environ 15 minutes plus tard, le build apparaît dans **App Store Connect > TestFlight** (Apple le traite encore 10 à 30 min).
4. Installe **TestFlight** sur ton iPhone, ajoute toi comme testeur interne et teste l'app. Crée le compte de démo pour Apple.

Pour chaque nouvelle version : relance le workflow avec un numéro plus grand (1.0.1, 1.1.0…). Le numéro de build s'incrémente tout seul.

## Étape 5. Soumettre à Apple (30 min)

Dans App Store Connect, fiche de l'app, recopie `app/store/fiche-app-store.md` :
- textes, mots-clés, URL de confidentialité et d'assistance ;
- les 5 captures du dossier `app/store/screenshots` (section iPhone 6,9 pouces) ;
- questionnaire de confidentialité et classification par âge ;
- prix : gratuit, disponibilité : tous les pays (ou la France seulement pour commencer) ;
- sélectionne le build envoyé par GitHub ;
- notes pour la revue avec le compte de démo.

Puis **Ajouter pour vérification > Soumettre**. La revue prend en général 24 à 48 h.

## Plus tard : la version Pro

L'app est entièrement gratuite pour l'instant. Le point d'entrée est prêt dans le code (`isPro()` dans `app/src/app.js`). Pour vendre un abonnement, il faudra :
1. accepter le contrat **Apps payantes** dans App Store Connect (banque et fiscalité) ;
2. créer les abonnements (mensuel, annuel) dans App Store Connect ;
3. brancher l'achat intégré d'Apple, obligatoire pour débloquer des fonctionnalités (règle 3.1.1), par exemple avec RevenueCat ;
4. ajouter un écran d'abonnement avec prix, durée, renouvellement automatique, liens vers les conditions et la confidentialité, et un bouton « Restaurer les achats » (règle 3.1.2).
