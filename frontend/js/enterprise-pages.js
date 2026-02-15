(function () {
  const enterprisePages = [
    {
      id: "operations-dashboard",
      slug: "operations-dashboard",
      label: "Operations Dashboard",
      path: "enterprise/operations-dashboard.html",
      allowedRoles: ["ADMIN", "MANAGER", "WAQTEK_TEAM"]
    },
    {
      id: "sign-in",
      slug: "sign-in",
      label: "Sign In",
      path: "enterprise/sign-in.html",
      allowedRoles: ["PUBLIC"]
    },
    {
      id: "ticket-management",
      slug: "ticket-management",
      label: "Ticket Management",
      path: "enterprise/ticket-management.html",
      allowedRoles: ["ADMIN", "MANAGER"]
    },
    {
      id: "analytics-dashboard",
      slug: "analytics-dashboard",
      label: "Analytics Dashboard",
      path: "enterprise/analytics-dashboard.html",
      allowedRoles: ["ADMIN", "WAQTEK_TEAM"]
    },
    {
      id: "queue-display",
      slug: "queue-display",
      label: "Queue Display",
      path: "queue-display.html",
      allowedRoles: ["ADMIN", "MANAGER"]
    },
    {
      id: "pos-ticket",
      slug: "pos-ticket",
      label: "POS Ticket",
      path: "client/pos-ticket.html",
      allowedRoles: ["ADMIN", "MANAGER"]
    },
    {
      id: "take-ticket",
      slug: "take-ticket",
      label: "Prendre un ticket",
      path: "client/take-ticket.html",
      allowedRoles: ["ADMIN", "MANAGER"]
    }
  ];

  window.ENTERPRISE_PAGES = enterprisePages;
})();
