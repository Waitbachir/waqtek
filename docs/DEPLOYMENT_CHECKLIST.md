# WaQtek Frontend - Deployment & Testing Checklist

## ✅ Pré-déploiement

### Configuration

- [ ] **API_URL** - Vérifier dans tous les fichiers JS:
  - [ ] `js/dashboard.js` - Ligne ~2
  - [ ] `js/client-new.js` - Ligne ~6
  - [ ] `js/display.js` - Ligne ~5
  - [ ] `js/stats.js` - Ligne ~5
  
  ```javascript
  // AVANT (Développement)
  const API_URL = 'http://192.168.1.6:5000';
  
  // APRÈS (Production)
  const API_URL = 'https://api.waqtek.com';
  ```

- [ ] **WebSocket URL** - Vérifier dans:
  - [ ] `js/client-new.js` - connectWebSocket()
  - [ ] `js/display.js` - connectWebSocket()
  - [ ] S'assure que le port est correct (5000 par défaut)

- [ ] **Fichiers statiques** - Vérifier les chemins:
  - [ ] CSS imports dans les HTML
  - [ ] JS imports dans les HTML
  - [ ] Images/assets références

### Build & Minification

- [ ] Minifier les CSS:
  ```bash
  # Utiliser CSSNano ou similar
  # Réduire global.css et layout.css
  ```

- [ ] Minifier les JavaScript:
  ```bash
  # Utiliser UglifyJS ou Terser
  # Réduire tous les fichiers JS
  ```

- [ ] Minifier les HTML:
  ```bash
  # Utiliser html-minifier
  # Réduire tous les fichiers HTML
  ```

### Assets

- [ ] Compresser les images (si présentes)
- [ ] Optimiser les polices (si utilisées)
- [ ] Vérifier les icones SVG inline
- [ ] Tester sur slow 3G (DevTools)

### HTTPS & Sécurité

- [ ] Configurer HTTPS (certificate SSL/TLS)
- [ ] Rediriger HTTP → HTTPS
- [ ] Headers de sécurité:
  - [ ] `Content-Security-Policy`
  - [ ] `X-Frame-Options: DENY`
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `Strict-Transport-Security`

### CORS

- [ ] Vérifier la configuration CORS du backend:
  ```javascript
  // Backend (app.js ou server.js)
  const cors = require('cors');
  app.use(cors({
      origin: ['https://waqtek.com', 'https://app.waqtek.com'],
      credentials: true
  }));
  ```

- [ ] Tester les appels cross-origin

### Cache HTTP

- [ ] Configurer les headers Cache-Control:
  ```
  # Fichiers statiques (CSS, JS, images)
  Cache-Control: public, max-age=31536000
  
  # HTML
  Cache-Control: public, max-age=3600
  
  # API responses
  Cache-Control: no-cache, no-store, must-revalidate
  ```

---

## 🧪 Tests fonctionnels

### Page de connexion

- [ ] **Formulaire**
  - [ ] Email requis
  - [ ] Password requis
  - [ ] Email validation
  - [ ] Submit disabled pendant chargement

- [ ] **Login successful**
  - [ ] Correct email/password → Redirects dashboard
  - [ ] Token stocké dans localStorage
  - [ ] User data stockée
  - [ ] Cookies sécurisés (si utilisés)

- [ ] **Login failed**
  - [ ] Mauvais credentials → Message d'erreur
  - [ ] Email invalide → Message
  - [ ] Server down → Message
  - [ ] Error message caché après 5 secondes

- [ ] **Remember me**
  - [ ] Checkbox functional
  - [ ] Credentials préfillées au retour

- [ ] **Forgot password**
  - [ ] Lien vers reset password
  - [ ] Reset flow fonctionne

### Dashboard

- [ ] **Navigation**
  - [ ] Sidebar links change de page
  - [ ] Active state visible
  - [ ] Mobile: hamburger menu fonctionne

- [ ] **Data loading**
  - [ ] Stats cards affichent les bonnes données
  - [ ] Tables se remplissent
  - [ ] Loading spinners visibles
  - [ ] Pas d'erreurs 401 (expired token)

- [ ] **Queues**
  - [ ] List affichée correctement
  - [ ] Bouton "Créer queue" fonctionne
  - [ ] Bouton "Éditer" ouvre le formulaire
  - [ ] Bouton "Supprimer" confirmation + suppression

- [ ] **Establishments**
  - [ ] List affichée
  - [ ] CRUD opérations OK

- [ ] **Logout**
  - [ ] Bouton logout visible
  - [ ] localStorage cleared
  - [ ] Redirection vers login
  - [ ] Cannot access dashboard sans token

### Client Ticket

- [ ] **Scanner QR**
  - [ ] Caméra s'active
  - [ ] Scanner lit les codes
  - [ ] Fallback manuel si pas de caméra

- [ ] **Ticket creation**
  - [ ] Code scanné → POST request
  - [ ] Manual entry → POST request
  - [ ] Numéro de ticket affiché (GRAND)
  - [ ] Détails du ticket affichés

- [ ] **Real-time updates**
  - [ ] WebSocket connecté
  - [ ] Statut change en temps réel
  - [ ] Notification "Votre tour!" si appelé

- [ ] **Error handling**
  - [ ] Invalid code → Message d'erreur
  - [ ] Network error → Retry button
  - [ ] Camera permission denied → Message explicite

### Display Screen

- [ ] **URL parameters**
  - [ ] ?queue=UUID affiche la bonne queue
  - [ ] ?establishment=UUID affiche le bon établissement
  - [ ] Missing params → Error message

- [ ] **Ticket display**
  - [ ] Ticket courant très visible (12rem)
  - [ ] Prochains tickets affichés (5 max)
  - [ ] Numéros formatés (001, 002, etc.)

- [ ] **Real-time updates**
  - [ ] WebSocket connecté
  - [ ] Ticket change en temps réel
  - [ ] Polling API toutes les 5 sec

- [ ] **Side info**
  - [ ] Horloge met à jour chaque seconde
  - [ ] Date correcte
  - [ ] Statut système (en ligne/hors ligne)
  - [ ] Stats queue correctes

- [ ] **Reconnection**
  - [ ] Si WebSocket tombe → Reconnect auto
  - [ ] Statut passe en orange (attente)
  - [ ] Reconnect réussit → Statut vert

### Statistics

- [ ] **Filters**
  - [ ] Boutons 24h, 7j, 30j, an cliquables
  - [ ] Active state visible
  - [ ] Data réchargée au changement

- [ ] **Charts**
  - [ ] Activité chart affichée (ligne)
  - [ ] Queue distribution affichée (pie)
  - [ ] Établissement distribution affichée (doughnut)
  - [ ] Hover sur chart affiche infos
  - [ ] Legend visible et clickable

- [ ] **Metrics**
  - [ ] Total tickets correct
  - [ ] Temps moyen correct
  - [ ] Satisfaction rate correct
  - [ ] Peak hour correct

- [ ] **Table**
  - [ ] Données affichées
  - [ ] Tri possible (si implémenté)
  - [ ] Pagination possible (si implémenté)

### Formulaires

- [ ] **Queue form**
  - [ ] Ouverture du formulaire (modal)
  - [ ] Inputs remplissables
  - [ ] Submit crée la queue
  - [ ] Validation: nom requis
  - [ ] Success message
  - [ ] Dashboard updated après création

- [ ] **Establishment form**
  - [ ] Identique à queue form
  - [ ] Tous les champs remplissables
  - [ ] Validation OK
  - [ ] CRUD fonctionne

- [ ] **Settings form**
  - [ ] Profil editable
  - [ ] Mot de passe changeable
  - [ ] Notifications toggleables
  - [ ] Sauvegarde en base de données

---

## 📱 Tests de responsive

### Desktop (1920x1080)
- [ ] Layout 2-colonnes complet
- [ ] Sidebar visible 260px
- [ ] Content areas espacés
- [ ] Charts affichés côte à côte
- [ ] Tableaux sans scroll horizontal

### Tablet (768px)
- [ ] Layout adapté
- [ ] Sidebar peut être réduit
- [ ] 1 colonne pour charts
- [ ] Textes lisibles
- [ ] Boutons cliquables (50px+)

### Mobile (375px - iPhone)
- [ ] Sidebar caché/hamburger
- [ ] 1 colonne unique
- [ ] Textes ajustés
- [ ] Images responsive
- [ ] Touches au moins 44x44px
- [ ] Scroll vertical OK
- [ ] Formulaires usables
- [ ] Pas de scroll horizontal

### iOS
- [ ] Safari compatible
- [ ] Viewport settings OK
- [ ] `-webkit-` prefixes OK
- [ ] Touch events OK
- [ ] Camera access OK (scanner)

### Android
- [ ] Chrome compatible
- [ ] Camera access OK
- [ ] Touch events OK
- [ ] No native scrollbar issues

---

## ⚡ Performance

### Lighthouse Audit
- [ ] Performance: > 80
- [ ] Accessibility: > 90
- [ ] Best Practices: > 90
- [ ] SEO: > 90
- [ ] Copier le rapport

### PageSpeed
- [ ] First Contentful Paint: < 1.5s
- [ ] Largest Contentful Paint: < 2.5s
- [ ] Cumulative Layout Shift: < 0.1
- [ ] Time to Interactive: < 3.5s

### Bundle Size
- [ ] CSS total: < 100KB (gzipped)
- [ ] JS total: < 200KB (gzipped)
- [ ] HTML: < 50KB
- [ ] Images: < 500KB total

### Network
- [ ] Test sur 4G (DevTools)
- [ ] Test sur 3G slow (DevTools)
- [ ] Offline handling OK

---

## 🔒 Sécurité

### Token & Auth
- [ ] Token valide au login
- [ ] Token inclus dans headers
- [ ] Token refresh fonctionnel (si implémenté)
- [ ] Logout clear localStorage
- [ ] Expired token → redirect login
- [ ] Invalid token → 401 → redirect login

### XSS Prevention
- [ ] Pas d'innerHTML avec user input
- [ ] Tous les inputs échappés
- [ ] API responses validées
- [ ] CSP headers configurés

### CSRF Prevention
- [ ] CSRF tokens générés (si forms)
- [ ] POST/PUT/DELETE nécessite token
- [ ] Same-origin policy OK

### SQL Injection
- [ ] Pas de SQL côté frontend (OK, frontend only)
- [ ] Backend doit utiliser parameterized queries

### Data Protection
- [ ] Données sensibles pas en localStorage plaintext
- [ ] Token avec expiration (si possible)
- [ ] HTTPS enforced
- [ ] No sensitive logs dans console (production)

---

## 📊 Analytics & Monitoring

### Google Analytics (optionnel)
- [ ] GA script inclus
- [ ] Page views tracked
- [ ] Events tracked
- [ ] Goals configurés

### Error Tracking (optionnel)
- [ ] Sentry/Rollbar inclus
- [ ] Errors loggés
- [ ] Sourcemaps configurés

### User Monitoring (optionnel)
- [ ] Session recording (si GDPR compliant)
- [ ] Performance monitoring
- [ ] RUM (Real User Monitoring)

---

## 📝 Documentation

- [ ] README.md updated
- [ ] API documentation à jour
- [ ] Code comments présents
- [ ] JSDoc pour fonctions principales
- [ ] Troubleshooting guide crée
- [ ] Deployment guide crée

---

## 🚀 Déploiement

### Server Setup
- [ ] Node.js 14+ installé
- [ ] npm/yarn installé
- [ ] PM2 ou autre process manager
- [ ] Nginx/Apache configuré
- [ ] SSL certificate installé

### Deploy Process
```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Build (if needed)
npm run build

# 4. Start/restart server
npm start
# ou avec PM2:
pm2 restart app

# 5. Verify
curl https://api.waqtek.com/health
```

### Post-Deploy Checks
- [ ] Frontend accessible
- [ ] API endpoints répondent
- [ ] WebSocket connecte
- [ ] Database connectée
- [ ] Tous les tests passent
- [ ] Logs clean (pas d'erreurs)
- [ ] Performance acceptable

---

## 🐛 Problèmes courants & solutions

### "Cannot find module"
```javascript
// Vérifier les imports:
// ❌ import form from './forms.html'
// ✅ Scripts inclus directement dans HTML
```

### CORS errors
```javascript
// Backend doit inclure:
app.use(cors());
// ou configuré avec options
```

### WebSocket connection refused
```javascript
// Vérifier:
// 1. URL correcte dans le code
// 2. Port ouvert (5000)
// 3. Serveur WebSocket lancé
// 4. Firewall n'bloque pas
```

### Token expiration
```javascript
// Implémenter refresh logic:
if (response.status === 401) {
    // Refresh token ou logout
}
```

### Performance lent
```javascript
// Check:
// 1. API responses < 200ms
// 2. CSS/JS minifiés
// 3. Lazy loading images
// 4. Cache headers OK
```

---

## 📞 Maintenance

### Logs à monitorer
- [ ] Erreurs JavaScript (console)
- [ ] Erreurs API (server logs)
- [ ] WebSocket disconnections
- [ ] Performance metrics
- [ ] User feedback

### Mises à jour
- [ ] Dépendances à jour
- [ ] Security patches
- [ ] Browser compatibility
- [ ] API versioning

### Monitoring
- [ ] Uptime monitoring
- [ ] Performance monitoring
- [ ] Error rate monitoring
- [ ] User activity monitoring

---

## ✨ Post-Launch

### User Testing
- [ ] Feedback des clients
- [ ] Feedback des managers
- [ ] Bug reports
- [ ] Feature requests

### Optimizations
- [ ] A/B testing (si applicable)
- [ ] UX improvements
- [ ] Performance tweaks
- [ ] Mobile optimizations

### Scaling
- [ ] Database indexing
- [ ] API caching
- [ ] CDN configuration
- [ ] Load balancing

---

## 📋 Sign-off Checklist

- [ ] All tests passed
- [ ] Performance acceptable
- [ ] Security reviewed
- [ ] Accessibility checked
- [ ] Documentation complete
- [ ] Team sign-off received
- [ ] Production ready ✅
