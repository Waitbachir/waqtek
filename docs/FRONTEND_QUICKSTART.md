# WaQtek Frontend - Quick Start Guide

## 🎯 Démarrage rapide

### 1. Architecture

```
frontend/
├── css/
│   ├── global.css          # Design system complet
│   ├── layout.css          # Layouts réutilisables
│   ├── client.css          # Styles client (ancien)
│   ├── display.css         # Styles écran d'attente
│   └── enterprise.css      # Styles enterprise
├── js/
│   ├── dashboard.js        # Dashboard principal
│   ├── client-new.js       # Client - Création tickets
│   ├── display.js          # Écran d'attente
│   ├── stats.js            # Statistiques
│   └── supabase.js         # Config Supabase
├── enterprise/
│   ├── sign-in-modern.html      # Login moderne
│   ├── dashboard-new.html  # Dashboard moderne
│   ├── stats-new.html      # Stats moderne
│   └── ...
├── client/
│   ├── client-ticket-new.html  # Client moderne
│   └── ...
├── display/
│   └── display-new.html    # Écran d'attente moderne
└── components/
    └── forms.html          # Formulaires réutilisables
```

### 2. Configuration d'API

**Fichier**: `js/dashboard.js`, `js/client-new.js`, etc.

```javascript
const API_URL = 'http://192.168.1.6:5000'; // À modifier selon l'environnement
```

### 3. Variables CSS principales

```css
/* Couleurs */
--primary: #667eea;           /* Bleu indigo */
--secondary: #764ba2;         /* Violet */
--success: #16a34a;           /* Vert */
--danger: #dc2626;            /* Rouge */
--warning: #ea580c;           /* Orange */

/* Espacements */
--spacing-sm: 0.5rem;         /* 8px */
--spacing-md: 1rem;           /* 16px */
--spacing-lg: 1.5rem;         /* 24px */
--spacing-xl: 2rem;           /* 32px */
--spacing-2xl: 2.5rem;        /* 40px */

/* Typographie */
--font-primary: 'Segoe UI', Tahoma, sans-serif;
--font-mono: 'Courier New', monospace;
--font-size-base: 1rem;       /* 16px */
--font-size-sm: 0.875rem;     /* 14px */
--font-size-lg: 1.125rem;     /* 18px */

/* Ombres */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);

/* Animations */
--transition-fast: 0.15s ease;
--transition-base: 0.3s ease;
--transition-slow: 0.5s ease;
```

## 🔑 Authentification

### Login Flow

```javascript
// 1. Récupérer token et user
const token = localStorage.getItem('waqtek_token');
const user = JSON.parse(localStorage.getItem('waqtek_user'));

// 2. Envoyer le token avec chaque requête
headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
}

// 3. Déconnexion
localStorage.removeItem('waqtek_token');
localStorage.removeItem('waqtek_user');
window.location.href = 'sign-in-modern.html';
```

## 📡 Appels API

### Pattern standard

```javascript
async function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem('waqtek_token');
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    let url = API_URL + endpoint;
    if (options.params) {
        url += '?' + new URLSearchParams(options.params).toString();
    }

    const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}
```

### Exemples

```javascript
// GET
const queues = await fetchAPI('/queues');

// POST
const ticket = await fetchAPI('/tickets/public/create', {
    method: 'POST',
    body: { queue_id: 'uuid', client_id: 'uuid' }
});

// PUT
await fetchAPI(`/queues/${id}`, {
    method: 'PUT',
    body: { name: 'New name' }
});

// DELETE
await fetchAPI(`/queues/${id}`, {
    method: 'DELETE'
});

// Avec paramètres
const stats = await fetchAPI('/stats', {
    params: { period: 'day' }
});
```

## 🎨 Composants CSS

### Boutons

```html
<!-- Primaire -->
<button class="btn btn-primary">Créer</button>

<!-- Secondaire -->
<button class="btn btn-secondary">Annuler</button>

<!-- Danger -->
<button class="btn btn-danger">Supprimer</button>

<!-- Succès -->
<button class="btn btn-success">Valider</button>

<!-- Tailles -->
<button class="btn btn-primary btn-sm">Petit</button>
<button class="btn btn-primary btn-lg">Grand</button>

<!-- État -->
<button class="btn btn-primary" disabled>Désactivé</button>
```

### Cartes

```html
<div class="card">
    <div class="card-header">
        <h3>Titre</h3>
    </div>
    <div class="card-body">
        Contenu
    </div>
    <div class="card-footer">
        Pied de page
    </div>
</div>
```

### Badges

```html
<span class="badge badge-primary">Primary</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-danger">Danger</span>
<span class="badge badge-warning">Warning</span>
```

### Alertes

```html
<div class="alert alert-info">
    Information message
</div>
<div class="alert alert-success">
    Success message
</div>
<div class="alert alert-warning">
    Warning message
</div>
<div class="alert alert-danger">
    Error message
</div>
```

## 📊 WebSocket

### Connexion

```javascript
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:5000`;

    socket = new WebSocket(wsUrl);

    socket.addEventListener('open', () => {
        console.log('Connected');
        // S'abonner à des événements
        socket.send(JSON.stringify({
            action: 'subscribe_queue',
            queue_id: 'uuid'
        }));
    });

    socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        // Traiter le message
    });

    socket.addEventListener('close', () => {
        // Reconnexion
        setTimeout(connectWebSocket, 3000);
    });
}
```

### Messages types

```javascript
// Ticket appelé
{
    "type": "ticket_called",
    "ticket_number": 42,
    "queue_id": "uuid"
}

// Queue mise à jour
{
    "type": "queue_updated",
    "queue_id": "uuid",
    "data": { ... }
}

// Statut du ticket changé
{
    "type": "status_changed",
    "ticket_id": "uuid",
    "status": "called"
}
```

## 🎯 Patterns courants

### Navigation entre pages

```javascript
function navigateTo(page) {
    // Masquer toutes les pages
    document.querySelectorAll('[data-page]').forEach(p => {
        p.style.display = 'none';
    });

    // Afficher la page sélectionnée
    const pageElement = document.querySelector(`[data-page="${page}"]`);
    if (pageElement) {
        pageElement.style.display = 'block';
    }

    // Mettre à jour le menu actif
    document.querySelectorAll('[data-page-link]').forEach(link => {
        link.classList.toggle('active', link.dataset.pageLik === page);
    });
}
```

### Gestion des formulaires

```javascript
const form = document.getElementById('myForm');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetchAPI('/endpoint', {
            method: 'POST',
            body: data
        });

        showSuccess('Succès!');
        // Rediriger ou recharger
    } catch (error) {
        showError(error.message);
    }
});

// Helpers
function showSuccess(message) {
    const div = document.createElement('div');
    div.className = 'alert alert-success';
    div.textContent = message;
    document.body.appendChild(div);
}

function showError(message) {
    const div = document.createElement('div');
    div.className = 'alert alert-danger';
    div.textContent = message;
    document.body.appendChild(div);
}
```

### Tableau dynamique

```javascript
function updateTable(data) {
    const tbody = document.querySelector('table tbody');
    
    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>
                <button onclick="edit('${item.id}')">Éditer</button>
                <button onclick="delete('${item.id}')">Supprimer</button>
            </td>
        </tr>
    `).join('');
}
```

## 🔧 Débogage

### Console

```javascript
// Vérifier le token
console.log(localStorage.getItem('waqtek_token'));

// Vérifier l'utilisateur
console.log(JSON.parse(localStorage.getItem('waqtek_user')));

// Vérifier les appels API
fetch(...).then(r => r.json()).then(console.log);
```

### Network Tab (F12)
- Vérifier les requêtes HTTP
- Vérifier les headers d'autorisation
- Vérifier les codes de réponse

### Elements Tab (F12)
- Inspecter les éléments
- Vérifier les classes CSS appliquées
- Modifier temporairement le CSS

## ✅ Checklist de mise en production

- [ ] Remplacer `API_URL` par l'URL de production
- [ ] Activer HTTPS
- [ ] Minifier CSS et JavaScript
- [ ] Configurer les headers CORS
- [ ] Configurer le cache HTTP
- [ ] Tester sur mobile
- [ ] Tester sans JavaScript
- [ ] Configurer un CDN
- [ ] Ajouter les analytics
- [ ] Tester la performance

## 📞 Ressources

- **CSS Global**: `frontend/css/global.css`
- **Layout**: `frontend/css/layout.css`
- **Documentation complète**: `docs/FRONTEND_README.md`
- **Backend**: `docs/dev-guide.md`
