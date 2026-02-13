# WaQtek Frontend - Documentation Complète

## 📋 Vue d'ensemble

Le frontend WaQtek a été complètement modernisé avec une interface utilisateur professionnelle et réactive. Le système est basé sur une architecture modulaire avec CSS variables, composants réutilisables et JavaScript vanilla.

## 🎨 Design System

### Fichiers CSS

#### 1. **css/global.css** - Système de design global
- **Variables CSS**: Couleurs, espacements, typographie, ombres, transitions
- **Palette de couleurs**:
  - Primaire: `#667eea` (Bleu indigo)
  - Secondaire: `#764ba2` (Violet)
  - Succès: `#16a34a` (Vert)
  - Erreur: `#dc2626` (Rouge)
  - Avertissement: `#ea580c` (Orange)
- **Typographie**: Système à 6 niveaux (h1-h6) avec sizing adaptatif
- **Composants**: Boutons, cartes, badges, alertes, formulaires
- **Utilitaires**: Grilles, flexbox, spacing, animations
- **Animations**: fadeIn, slideIn, spin, pulse, blink

#### 2. **css/layout.css** - Layouts réutilisables
- **Sidebar Navigation**: Layout fixe avec menu actif
- **Topbar**: Barre supérieure avec espace utilisateur
- **Dashboard Layout**: Grille 2 colonnes (sidebar + contenu)
- **Tables**: Styling professionnel avec hover effects
- **Modales**: Animations douces d'apparition/disparition
- **Responsive**: Points de rupture à 1200px, 768px, 480px

### Palette de couleurs globales

```css
/* Primaires */
--primary: #667eea;
--primary-dark: #5568d3;
--primary-light: #f5f7ff;

/* Grises */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-700: #374151;
--gray-900: #111827;

/* États */
--success: #16a34a;
--danger: #dc2626;
--warning: #ea580c;
--info: #0ea5e9;
```

## 🏗️ Structure des pages

### 1. **Authentification**

**Fichier**: `enterprise/sign-in-modern.html`

- Interface de connexion moderne avec gradient
- Gestion des credentials (email/password)
- Mémorisation du mot de passe
- Gestion des erreurs avec messages explicites
- Stockage du token JWT et des données utilisateur

**Flows**:
```
1. Utilisateur entre email/password
2. Soumission au POST /auth/login
3. Réception du token JWT
4. Stockage dans localStorage
5. Redirection vers dashboard
```

### 2. **Dashboard Principal**

**Fichier**: `enterprise/dashboard-new.html` + `js/dashboard.js`

**Sections**:
- **Sidebar Navigation**: 5 pages principales
  - Dashboard (statistiques rapides)
  - Queues (gestion des files)
  - Établissements (gestion des lieux)
  - Statistiques (analyses détaillées)
  - Paramètres (compte et préférences)

- **Stats Cards**: 4 métriques clés
  - Tickets en attente
  - Moyenne d'attente
  - Taux de satisfaction
  - Tickets traités aujourd'hui

- **Listes de données**:
  - Table des queues avec actions
  - Table des tickets récents
  - Statut de chaque queue

**Fonctionnalités JavaScript**:
```javascript
// Initialisation
initAuth()              // Vérification du token
setupEventListeners()   // Écoute des événements
navigateTo(page)       // Navigation entre pages

// Chargement des données
loadDashboardData()    // Toutes les données
loadStats()            // Statistiques
loadQueues()           // Listes des queues
loadRecentTickets()    // Tickets récents

// Utilitaires
logout()               // Déconnexion
fetchAPI()             // Appels API avec auth
```

### 3. **Interface Client - Création de tickets**

**Fichier**: `client/client-ticket-new.html` + `js/client-new.js`

**Fonctionnalités**:
- **Scanner QR Code**: 
  - Initialisation automatique de la caméra
  - Lecture des codes QR pour identifier les queues
  - Fallback manuel si scanner échoue
  
- **Création de ticket**:
  - POST `/tickets/public/create`
  - Génération d'un client_id unique (UUID)
  - Affichage du numéro de ticket créé
  
- **Suivi en temps réel**:
  - WebSocket pour les mises à jour
  - Affichage du statut du ticket
  - Notification quand le ticket est appelé

**Flux utilisateur**:
```
1. Client scanne le QR code (ou entre manuellement)
2. Sélection de la queue
3. Création du ticket
4. Affichage du numéro (format: 001, 002, etc.)
5. Attente avec suivi en temps réel
```

### 4. **Écran d'Affichage - Queue Display**

**Fichier**: `display/display-new.html` + `js/display.js`

**Affichage grand écran**:
- Ticket actuellement appelé (TRÈS GRAND)
- Prochains tickets en attente
- Horloge et date
- Statut du système (en ligne/hors ligne)
- Statistiques de la queue

**Paramètres URL**:
```
display-new.html?queue=UUID&establishment=UUID
```

**Mise à jour**:
- Polling API toutes les 5 secondes
- WebSocket pour les changements en temps réel
- Reconnexion automatique en cas de perte

### 5. **Statistiques & Analyses**

**Fichier**: `enterprise/stats-new.html` + `js/stats.js`

**Graphiques** (via Chart.js):
- **Ligne**: Activité des tickets (24h/7j/30j/1an)
- **Pie**: Distribution par queue
- **Doughnut**: Distribution par établissement

**Métriques**:
- Total des tickets traités
- Temps d'attente moyen
- Taux de satisfaction
- Heure de pointe

**Filtrage**:
- 24 heures
- 7 derniers jours
- 30 derniers jours
- Année complète

**Tableau comparatif**:
- Performance de chaque queue
- Nombre de tickets
- Temps moyen
- Statut (Bon/Moyen/Élevé)

### 6. **Formulaires & CRUD**

**Fichier**: `components/forms.html`

**Formulaires inclus**:

1. **Queue Form**
   - Nom de la queue
   - Description
   - Capacité maximale
   - Statut (Active/Pausée/Fermée)

2. **Establishment Form**
   - Nom
   - Adresse complète
   - Téléphone et email
   - Informations de contact

3. **Settings Form**
   - Profil utilisateur
   - Sécurité (changement mot de passe)
   - Notifications

**Fonctionnalités**:
- Validation côté client
- Messages d'erreur/succès
- Spinner de chargement
- Modales réutilisables
- Gestion des submit asynchrone

## 📡 API Integration

### Endpoints utilisés

```javascript
// Authentification
POST   /auth/login               // Connexion
POST   /auth/register            // Inscription
POST   /auth/logout              // Déconnexion

// Tickets
GET    /tickets                  // Lister les tickets
POST   /tickets/public/create    // Créer un ticket (client)
GET    /queues/:id/waiting       // Tickets en attente
PUT    /tickets/:id/status       // Mettre à jour le statut

// Queues
GET    /queues                   // Lister les queues
GET    /queues/:id               // Détail d'une queue
POST   /queues                   // Créer une queue
PUT    /queues/:id               // Mettre à jour
DELETE /queues/:id               // Supprimer

// Établissements
GET    /establishments           // Lister
POST   /establishments           // Créer
PUT    /establishments/:id       // Mettre à jour
DELETE /establishments/:id       // Supprimer

// Statistiques
GET    /stats                    // Statistiques globales
GET    /stats/queues             // Stats par queue
GET    /stats/establishments     // Stats par établissement
```

### Headers d'authentification

```javascript
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

## 🔧 Utilisation des fichiers

### Intégration dans le dashboard

```html
<!-- Inclure les CSS -->
<link rel="stylesheet" href="css/global.css">
<link rel="stylesheet" href="css/layout.css">

<!-- Inclure les JavaScript -->
<script src="js/dashboard.js"></script>

<!-- Inclure les formulaires -->
<script src="components/forms.html"></script>

<!-- Pour les statistiques -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="js/stats.js"></script>
```

## 🎯 Patterns utilisés

### 1. Initialisation

```javascript
function init() {
    // 1. Vérifier l'authentification
    checkAuth();
    
    // 2. Charger les données
    loadData();
    
    // 3. Mettre en place les event listeners
    setupEventListeners();
}

document.addEventListener('DOMContentLoaded', init);
```

### 2. Appels API

```javascript
async function fetchAPI(endpoint, options = {}) {
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const response = await fetch(API_URL + endpoint, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : null
    });

    if (!response.ok) handleError(response);
    return response.json();
}
```

### 3. WebSocket

```javascript
function connectWebSocket() {
    socket = new WebSocket('ws://host:5000');
    
    socket.onopen = () => console.log('Connected');
    socket.onmessage = (event) => handleMessage(event.data);
    socket.onerror = (error) => handleError(error);
    socket.onclose = () => reconnect();
}
```

### 4. Gestion des erreurs

```javascript
try {
    const data = await fetchAPI('/endpoint');
    updateUI(data);
} catch (error) {
    showError('Message d\'erreur à l\'utilisateur');
    console.error(error);
}
```

## 📱 Responsive Design

### Points de rupture

```css
/* Desktop */
@media (max-width: 1200px) {
    /* Ajustements pour tablettes */
}

/* Tablette */
@media (max-width: 768px) {
    /* Ajustements pour mobile */
    .display-layout { grid-template-columns: 1fr; }
    .sidebar { position: fixed; transform: translateX(-100%); }
}

/* Mobile */
@media (max-width: 480px) {
    /* Ajustements pour petit mobile */
    font-size: réduit;
    padding: réduit;
}
```

## 🔐 Sécurité

- **JWT Tokens**: Stockés dans `localStorage`
- **Bearer Authentication**: Tous les appels API incluent le token
- **CORS**: Configuré côté backend
- **HTTPS**: À implémenter en production

## ✨ Fonctionnalités avancées

### 1. Real-time Updates
- WebSocket pour les mises à jour instantanées
- Synchronisation automatique entre clients
- Gestion des reconnexions

### 2. Offline Support
- Les données critiques sont cachées
- Rechargement automatique au reconnexion
- Feedback utilisateur clair

### 3. Animations douces
- Transitions sur tous les éléments interactifs
- Animations d'apparition/disparition
- Feedbacks visuels (hover, focus, active)

### 4. Accessibilité
- Contraste suffisant
- Navigation au clavier
- Labels explicites

## 📝 Guide d'utilisation

### Pour les clients

1. **Scanner QR**: Pointez votre téléphone vers le QR code de la queue
2. **Attendre**: Votre ticket s'affiche avec un numéro
3. **Écouter**: Vous serez notifié quand ce sera votre tour

### Pour les managers

1. **Dashboard**: Vue d'ensemble en temps réel
2. **Queues**: Créer et gérer les files d'attente
3. **Statistiques**: Analyser la performance
4. **Paramètres**: Configurer votre compte

### Pour l'affichage public

```html
<!-- URL à ouvrir sur un écran grand format -->
display-new.html?queue=<QUEUE_UUID>&establishment=<ESTABLISHMENT_UUID>
```

## 🚀 Déploiement

### Configuration

Modifier l'API_URL dans chaque fichier JS:
```javascript
const API_URL = 'https://api.waqtek.com'; // Production
```

### Optimisations

- Minification des CSS/JS
- Compression des images
- Cache HTTP
- CDN pour les libraires externes

## 📚 Technologies utilisées

- **HTML5**: Structure sémantique
- **CSS3**: Grid, Flexbox, Variables, Animations
- **JavaScript Vanilla**: Pas de frameworks lourds
- **Chart.js**: Visualisation des données
- **html5-qrcode**: Scanner QR
- **WebSocket**: Communication temps réel
- **LocalStorage**: Persistance des données

## 🐛 Dépannage

### Le login ne fonctionne pas
- Vérifier que l'API est accessible
- Vérifier les credentials
- Vérifier la console pour les erreurs CORS

### WebSocket ne se connecte pas
- Vérifier que le serveur WebSocket est lancé
- Vérifier le port (par défaut 5000)
- Vérifier les logs du backend

### Les statistiques ne s'affichent pas
- Vérifier que Chart.js est chargé
- Vérifier que l'endpoint `/stats` retourne des données
- Vérifier les logs de la console

## 📞 Support

Pour toute question ou problème, consultez:
1. La console du navigateur (F12)
2. Les logs du serveur backend
3. La documentation du backend (dev-guide.md)
