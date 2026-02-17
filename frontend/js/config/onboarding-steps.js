(function () {
  const onboardingFlows = {
    ADMIN: {
      key: "admin_main_v1",
      pages: ["admin-dashboard.html"],
      steps: [
        {
          id: "welcome",
          title: "Bienvenue dans votre dashboard Admin",
          content: "Ce guide rapide vous montre les fonctions cles pour piloter votre etablissement."
        },
        {
          id: "menu",
          target: ".enterprise-menu-root",
          title: "Navigation principale",
          content: "Utilisez ce menu pour basculer rapidement entre les pages.",
          placement: "bottom"
        },
        {
          id: "stats",
          target: ".stats",
          title: "Indicateurs importants",
          content: "Ici vous suivez etablissements, queues, tickets et plan en temps reel."
        },
        {
          id: "ticket_management",
          target: ".quick a[href=\"ticket-management.html\"]",
          title: "Gestion des tickets",
          content: "Entrez ici pour appeler, servir ou marquer absent un ticket."
        },
        {
          id: "take_ticket",
          target: ".enterprise-menu-links a[href*=\"client/take-ticket.html\"]",
          title: "Prendre un ticket",
          content: "Cette page sert a creer des tickets depuis la borne ou la tablette."
        },
        {
          id: "pos_ticket",
          target: ".quick a[href=\"../client/pos-ticket.html\"]",
          title: "POS Ticket",
          content: "Le mode POS permet la prise de ticket locale et les flux avec acces distant."
        }
      ]
    },
    MANAGER: {
      key: "manager_main_v1",
      pages: ["manager-dashboard.html"],
      steps: [
        {
          id: "welcome",
          title: "Bienvenue dans votre dashboard Manager",
          content: "Ce guide montre comment operer les queues et tickets pas a pas."
        },
        {
          id: "menu",
          target: ".enterprise-menu-root",
          title: "Menu de navigation",
          content: "Depuis ce menu, ouvrez ticket management, display TV et prise de ticket."
        },
        {
          id: "establishment",
          target: ".context",
          title: "Etablissement actif",
          content: "Les donnees affichees ici correspondent a votre etablissement uniquement."
        },
        {
          id: "queues",
          target: "#queuesGrid",
          title: "Choisir une queue",
          content: "Cliquez sur une queue. Une popup de guichet libre s'ouvrira automatiquement."
        },
        {
          id: "counter_popup",
          target: "#counterModal",
          title: "Selection du guichet",
          content: "Choisissez un guichet disponible puis continuez vers Ticket Management.",
          placement: "top"
        },
        {
          id: "call_ticket",
          target: ".quick a[href=\"ticket-management.html\"]",
          title: "Appeler un ticket",
          content: "Dans Ticket Management, utilisez \"Appeler le prochain\", puis \"Servi\" ou \"Absent\"."
        },
        {
          id: "take_ticket",
          target: ".enterprise-menu-links a[href*=\"client/take-ticket.html\"]",
          title: "Prendre un ticket",
          content: "Cette page permet de creer un ticket local ou avec acces distant (50 DA)."
        }
      ]
    }
  };

  window.WAQTEK_ONBOARDING_FLOWS = onboardingFlows;
})();
