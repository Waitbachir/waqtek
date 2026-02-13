# WaQtek Frontend - Page Structure & Layout Guide

## 📑 Vue d'ensemble des pages

### 1. PAGE DE CONNEXION
**Fichier**: `enterprise/sign-in-modern.html`  
**URL**: `/enterprise/sign-in-modern.html`  
**Authentification**: ❌ Non requise (c'est la page de connexion)

```
┌─────────────────────────────────┐
│                                 │
│         WAQTEK LOGIN            │
│                                 │
│   ┌──────────────────────────┐  │
│   │  Email                   │  │
│   │  [___________________]   │  │
│   │                          │  │
│   │  Mot de passe            │  │
│   │  [___________________]   │  │
│   │                          │  │
│   │  ☐ Se souvenir           │  │
│   │                          │  │
│   │  [Connexion]    [?]      │  │
│   └──────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

**Fonctionnalités**:
- ✅ Email/Password inputs
- ✅ Validation côté client
- ✅ Loading spinner
- ✅ Messages d'erreur
- ✅ Remember me checkbox
- ✅ Forgot password link
- ✅ Token storage

**API**: `POST /auth/login`

---

### 2. DASHBOARD PRINCIPAL
**Fichier**: `enterprise/dashboard-new.html`  
**URL**: `/enterprise/dashboard-new.html`  
**Authentification**: ✅ Requise

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo] │                              │ [👤 Jean] [⚙️]      │
├────────┼──────────────────────────────┼─────────────────────┤
│        │                              │                     │
│ Dashboard   [Stats] [Tickets] [Settings]                    │
│ Queues                                                      │
│ Establishments                                              │
│ Statistics                                                  │
│ Settings                                                    │
│        │                              │                     │
│        │  ┌─────────────────────────┐ │                     │
│        │  │ 42 Tickets en attente    │ │                     │
│        │  │ 12 min Temps moyen       │ │ ┌────────────────┐ │
│        │  │ 98% Satisfaction         │ │ │ Queue Stats    │ │
│        │  │ 156 Traités aujourd'hui  │ │ │ [table]        │ │
│        │  └─────────────────────────┘ │ └────────────────┘ │
│        │                              │                     │
│        │  ┌──────────────────────────┐                      │
│        │  │ Queues actives           │                      │
│        │  │ [table avec queues]      │                      │
│        │  └──────────────────────────┘                      │
│        │                              │                     │
│        │  ┌──────────────────────────┐                      │
│        │  │ Tickets récents          │                      │
│        │  │ [table avec tickets]     │                      │
│        │  └──────────────────────────┘                      │
│        │                              │                     │
└────────┴──────────────────────────────┴─────────────────────┘
```

**Sections dynamiques** (affichées au clic):
1. **Dashboard** - Stats principales
2. **Queues** - Gestion des files
3. **Establishments** - Gestion des établissements
4. **Statistics** - Analyses détaillées
5. **Settings** - Paramètres utilisateur

**Composants**:
- ✅ Sidebar navigation (5 items)
- ✅ Topbar avec user info
- ✅ 4 Stats cards
- ✅ Tableaux de données
- ✅ Boutons d'action

**API Calls**:
```
GET /queues
GET /tickets
GET /stats
GET /establishments
```

---

### 3. INTERFACE CLIENT - CRÉATION DE TICKET
**Fichier**: `client/client-ticket-new.html`  
**URL**: `/client/client-ticket-new.html`  
**Authentification**: ❌ Non requise

```
┌────────────────────────────────────────────────────┐
│                                                    │
│         CRÉER UN TICKET                            │
│                                                    │
│         ┌────────────────────────┐                │
│         │   [Scanner QR]         │                │
│         │   [Caméra]             │                │
│         └────────────────────────┘                │
│                                                    │
│              OU                                    │
│                                                    │
│         ┌────────────────────────┐                │
│         │ Code de queue          │                │
│         │ [________________]     │                │
│         │ [Créer un ticket]      │                │
│         └────────────────────────┘                │
│                                                    │
│  ┌──────────────────────────────────┐             │
│  │      VOTRE NUMÉRO: 042           │             │
│  │      File: Accueil               │             │
│  │      Établissement: Mairie       │             │
│  │      Status: En attente          │             │
│  │      Heure: 14:35                │             │
│  │                                  │             │
│  │ [Nouveau ticket]  [Enregistrer]  │             │
│  └──────────────────────────────────┘             │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Fonctionnalités**:
- ✅ QR Scanner (html5-qrcode)
- ✅ Manual code entry
- ✅ Création de ticket
- ✅ Affichage du numéro (GRAND)
- ✅ Détails du ticket
- ✅ WebSocket real-time
- ✅ Statut du ticket

**API Calls**:
```
POST /tickets/public/create
GET  /queues/:id/status
```

**WebSocket**:
```
ticket_called
status_changed
```

---

### 4. ÉCRAN D'ATTENTE PUBLIC
**Fichier**: `display/display-new.html`  
**URL**: `/display/display-new.html?queue=UUID&establishment=UUID`  
**Authentification**: ❌ Non requise  
**Usage**: Écran grand public

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│              EN COURS                    │ 14:35             │
│                                          │ Lundi 5 janvier   │
│                                          │                   │
│              042                         │ ✓ EN LIGNE        │
│        (TRÈS GRAND - 12rem)              │                   │
│                                          │ Tickets traités   │
│        Accueil                           │ 156               │
│                                          │                   │
│  ──────────────────────────────────────  │ Établissement     │
│         PROCHAINS TICKETS                │ Mairie Centrale   │
│                                          │                   │
│    043     044     045     046     047    │ Mise à jour       │
│                                          │ 14:35:42          │
│                                          │                   │
│                                          │                   │
└──────────────────────────────────────────────────────────────┘
```

**Fonctionnalités**:
- ✅ Ticket courant TRÈS GRAND
- ✅ Prochains tickets (5)
- ✅ Horloge et date
- ✅ Statut du système
- ✅ Statistiques
- ✅ WebSocket real-time
- ✅ Polling API 5sec

**API Calls**:
```
GET /queues/:id
GET /queues/:id/waiting
```

**WebSocket**:
```
queue_updated
ticket_called
```

---

### 5. STATISTIQUES & ANALYSES
**Fichier**: `enterprise/stats-new.html`  
**URL**: `/enterprise/stats-new.html`  
**Authentification**: ✅ Requise

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo] │ STATISTIQUES               │ [👤 Jean] [⚙️]      │
├────────┼──────────────────────────┼─────────────────────┤
│        │                          │                     │
│ Dashboard   [Filtrer] [24h] [7j] [30j] [An]            │
│ Statistics                                              │
│        │                          │                     │
│        │  ┌──────────────┬──────────────┐               │
│        │  │ 1,234        │ 12 min       │               │
│        │  │ Tickets      │ Attente      │               │
│        │  └──────────────┴──────────────┘               │
│        │  ┌──────────────┬──────────────┐               │
│        │  │ 98%          │ 14:00        │               │
│        │  │ Satisfaction │ Peak Hour    │               │
│        │  └──────────────┴──────────────┘               │
│        │                          │                     │
│        │  ┌─────────────────────┐                       │
│        │  │   Activité (Line)   │                       │
│        │  │   [Graph Chart.js]  │                       │
│        │  └─────────────────────┘                       │
│        │                          │                     │
│        │  ┌──────────────┬──────────────┐               │
│        │  │ Distribution │ Distribution │               │
│        │  │ Queues (Pie) │ Étabts (Donut)              │
│        │  │ [Chart]      │ [Chart]      │               │
│        │  └──────────────┴──────────────┘               │
│        │                          │                     │
│        │  ┌─────────────────────────────────┐           │
│        │  │ Comparaison Queues (Table)      │           │
│        │  │ [Queue│Tickets│Attente│Status] │           │
│        │  │ [Data rows...]                  │           │
│        │  └─────────────────────────────────┘           │
│        │                          │                     │
└────────┴──────────────────────────┴─────────────────────┘
```

**Filtres temporels**:
- ✅ 24 heures
- ✅ 7 jours
- ✅ 30 jours
- ✅ 1 année

**Graphiques** (Chart.js):
- ✅ Activité des tickets (Line chart)
- ✅ Distribution queues (Pie chart)
- ✅ Distribution établissements (Doughnut)

**Métriques**:
- ✅ Tickets traités
- ✅ Temps d'attente moyen
- ✅ Taux de satisfaction
- ✅ Heure de pointe

**API Calls**:
```
GET /stats?period=day
GET /stats/queues
GET /stats/establishments
```

---

## 🎯 Flux de navigation

### Nouvelle visite
```
Client arrive
    ↓
Page d'accueil (client-ticket-new.html)
    ↓
Scanner QR ou code manuel
    ↓
Création ticket
    ↓
Affichage numéro
    ↓
Suivi WebSocket
```

### Manager/Entreprise
```
Manager arrive
    ↓
sign-in-modern.html
    ↓
Connexion
    ↓
dashboard-new.html
    ↓
Navigation (Queues/Stats/Settings)
    ↓
Gestion des données
    ↓
Déconnexion
```

### Écran public
```
Installation écran
    ↓
display-new.html?queue=X&establishment=Y
    ↓
Affichage temps réel
    ↓
Updates via WebSocket + API polling
    ↓
Affichage continu
```

---

## 📐 Grille de responsive

### Breakpoints
```
Desktop:   > 1200px  (2 colonnes sidebar+content)
Tablet:    768px-1200px (1,5 colonnes)
Mobile:    < 768px   (1 colonne, sidebar fixe/hidden)
```

### Adaptations par page

#### Login
```
Desktop: Carte centrée 400px
Tablet:  Carte 90% largeur
Mobile:  Fullscreen
```

#### Dashboard
```
Desktop: Sidebar 260px + content
Tablet:  Sidebar 200px + content
Mobile:  Sidebar hidden, hamburger menu
```

#### Client Ticket
```
Desktop: Carte centrée
Tablet:  Carte 90%
Mobile:  Fullscreen, stacking vertical
```

#### Display
```
Desktop: 2 colonnes (2fr 1fr)
Tablet:  1 colonne, stack vertical
Mobile:  1 colonne, fonts réduites
```

#### Stats
```
Desktop: 2 colonnes grilles
Tablet:  1,5 colonnes
Mobile:  1 colonne, charts réduits
```

---

## 🎨 Éléments d'interface

### Boutons
- Primaire: `#667eea` sur `#fff`
- Secondaire: `#fff` sur `#gray-200`
- Danger: `#fff` sur `#dc2626`
- Success: `#fff` sur `#16a34a`

### Cartes
- Fond blanc avec shadow
- Border radius: 8px
- Padding: 24px
- Hover: Shadow augmentée

### Tables
- Header gris clair
- Rows alternées sans stripe
- Hover effet gris clair
- Action buttons petits

### Formulaires
- Inputs avec border gris
- Focus blue indigo + light shadow
- Labels uppercase petit
- Validation en rouge

### Badges
- Success: vert clair / texte vert foncé
- Warning: orange clair / texte orange foncé
- Danger: rouge clair / texte rouge foncé

---

## 📱 Composants mobiles

### Navigation
- Sidebar → Hamburger menu
- Topbar reste visible
- Back button si nested

### Inputs
- Largeur 100%
- Padding augmenté (touch friendly)
- Font size 16px (évite zoom)

### Tables
- Horizontal scroll
- Colonnes réduites
- Actions en dropdown

### Graphiques
- Hauteur réduite
- Font size réduite
- Legend en bas

---

## 🔄 États dynamiques

### Sidebar
```
Normal  → Gris clair fond
Hover   → Gris moyen fond
Active  → Bleu indigo fond + blanc texte
```

### Tableaux
```
Row normal  → Blanc
Row hover   → Gris très clair
Row active  → Gris clair + border bleu
```

### Formulaires
```
Input normal  → Border gris
Input focus   → Border bleu + shadow bleu
Input error   → Border rouge + background rouge clair
Input success → Border vert + background vert clair
```

### Buttons
```
Normal  → État par défaut
Hover   → Couleur foncée + shadow
Active  → Transform down 2px
Disabled → Opacity 0.5 + cursor not-allowed
```

---

## ✨ Animations

### Page transitions
```
Entrée: Fade in 0.3s
Sortie: Fade out 0.2s
```

### Modal
```
Entrée: Scale 0.9 → 1 + fade in
Sortie: Scale 1 → 0.9 + fade out
```

### Buttons
```
Hover: Transform up 2px
Click: Transform down 1px
```

### Loading
```
Spinner: Rotation infinie
Pulse: Opacity 1 ↔ 0.7
```

---

## 📋 Checklist de cohérence

- [ ] Toutes les pages utilisent les CSS variables
- [ ] Tous les boutons suivent le style global
- [ ] Toutes les cartes ont la même ombre
- [ ] Tous les espacements sont cohérents
- [ ] Toutes les animations durent 0.3s
- [ ] Tous les inputs sont identiques
- [ ] Toutes les tables ont le même style
- [ ] Tous les messages d'erreur sont rouges
- [ ] Tous les messages de succès sont verts
- [ ] Responsive fonctionne sur tous
