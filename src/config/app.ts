/**
 * Non-secret, typed application settings. Safe to import anywhere.
 * Security-sensitive invariants are hardcoded here and cannot be toggled
 * via environment variables.
 */
export const app = {
  name: "Autocode",
  description: "AI-assisted code maintenance",

  projects: {
    nameMinLength: 1,
    nameMaxLength: 100,
    descriptionMaxLength: 1000,
  },

  tasks: {
    titleMinLength: 1,
    titleMaxLength: 200,
    descriptionMaxLength: 5000,
  },

  repositories: {
    nameMinLength: 1,
    nameMaxLength: 100,
  },

  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
    recentProjectsCount: 5,
  },

  auth: {
    passwordMinLength: 8,
    passwordMaxLength: 72,
    /** Fallback redirect after a successful sign-in / email confirmation. */
    defaultRedirectPath: "/dashboard",
    /** Where unauthenticated users are sent. */
    signInPath: "/sign-in",
  },
} as const;

export type AppConfig = typeof app;
