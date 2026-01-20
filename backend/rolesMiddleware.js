// Ruoli disponibili e loro permessi di default
const ROLE_PERMISSIONS = {
  admin: {
    // Candidati
    candidates_view: true,
    candidates_create: true,
    candidates_edit: true,
    candidates_delete: true,
    // Colloqui
    interviews_view: true,
    interviews_create: true,
    interviews_edit: true,
    interviews_delete: true,
    // Documenti
    documents_view: true,
    documents_upload: true,
    documents_delete: true,
    // Sale
    rooms_view: true,
    rooms_manage: true,
    meetings_view: true,
    meetings_create: true,
    meetings_edit: true,
    meetings_delete: true,
    // Veicoli
    vehicles_view: true,
    vehicles_manage: true,
    bookings_view: true,
    bookings_create: true,
    bookings_edit: true,
    bookings_delete: true,
    // Admin
    users_manage: true,
    settings_manage: true,
    stats_view: true,
    audit_view: true,
    export_data: true
  },
  secretary: {
    candidates_view: true,
    candidates_create: true,
    candidates_edit: true,
    candidates_delete: false,
    interviews_view: true,
    interviews_create: true,
    interviews_edit: true,
    interviews_delete: false,
    documents_view: true,
    documents_upload: true,
    documents_delete: false,
    rooms_view: true,
    rooms_manage: false,
    meetings_view: true,
    meetings_create: true,
    meetings_edit: true,
    meetings_delete: true,
    vehicles_view: true,
    vehicles_manage: false,
    bookings_view: true,
    bookings_create: true,
    bookings_edit: true,
    bookings_delete: true,
    users_manage: false,
    settings_manage: false,
    stats_view: false,
    audit_view: false,
    export_data: false
  },
  viewer: {
    candidates_view: true,
    candidates_create: false,
    candidates_edit: false,
    candidates_delete: false,
    interviews_view: true,
    interviews_create: false,
    interviews_edit: false,
    interviews_delete: false,
    documents_view: true,
    documents_upload: false,
    documents_delete: false,
    rooms_view: true,
    rooms_manage: false,
    meetings_view: true,
    meetings_create: false,
    meetings_edit: false,
    meetings_delete: false,
    vehicles_view: true,
    vehicles_manage: false,
    bookings_view: true,
    bookings_create: false,
    bookings_edit: false,
    bookings_delete: false,
    users_manage: false,
    settings_manage: false,
    stats_view: false,
    audit_view: false,
    export_data: false
  }
};

// Get user permissions (role defaults + custom overrides)
export function getUserPermissions(user) {
  const rolePermissions = ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.viewer;

  // If user has custom permissions, merge them
  let customPermissions = {};
  if (user.permissions) {
    try {
      customPermissions = typeof user.permissions === "string"
        ? JSON.parse(user.permissions)
        : user.permissions;
    } catch (e) {
      customPermissions = {};
    }
  }

  return { ...rolePermissions, ...customPermissions };
}

// Check if user has a specific role
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Non autenticato" });

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Accesso negato" });
    }
    next();
  };
}

// Check if user has a specific permission
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Non autenticato" });

    const permissions = getUserPermissions(req.user);

    if (!permissions[permission]) {
      return res.status(403).json({ message: "Non hai i permessi per questa azione" });
    }
    next();
  };
}

// Check if user has any of the specified permissions
export function requireAnyPermission(...permissionList) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Non autenticato" });

    const permissions = getUserPermissions(req.user);

    const hasPermission = permissionList.some(p => permissions[p]);
    if (!hasPermission) {
      return res.status(403).json({ message: "Non hai i permessi per questa azione" });
    }
    next();
  };
}

// Middleware to add permissions to req.user
export function attachPermissions(req, res, next) {
  if (req.user) {
    req.user.permissions = getUserPermissions(req.user);
  }
  next();
}

export { ROLE_PERMISSIONS };
