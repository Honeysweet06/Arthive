
/**
 * ARTHIVE — CENTRAL APPLICATION INTEGRATION
 * Full-stack service connection layer
 *
 * Connects:
 * 1. Firebase Authentication
 * 2. Supabase Database
 * 3. Favorites Management
 * 4. ArtHive AI Assistant
 * 5. Museum Discovery
 * 6. Creator and Founder Services
 */

import {
  currentFirebaseUser,
  isFirebaseConfigured,
  observeFirebaseAuth,
  registerFirebaseAccount,
  signInFirebaseAccount,
  signOutFirebaseAccount,
  synchronizeFirebaseAccount
} from "./lib/firebaseAuth.js";

import {
  supabase,
  isSupabaseConfigured,
  fetchDiscoveryData
} from "./lib/supabase.js";

import {
  getFavorites,
  isFavorite,
  toggleFavorite
} from "./lib/favorites.js";

import {
  loadAssistantConfig,
  sendAssistantMessage,
  loadAssistantSessions,
  loadAssistantHistory,
  sendAssistantFeedback,
  submitSupportRequest
} from "./lib/aiAssistant.js";


/* =========================================
   APPLICATION STATUS
========================================= */

export const ArtHiveApp = {

  name: "ArtHive Digital Museum",

  version: "1.0.0",

  get status() {
    return {
      firebase: isFirebaseConfigured,
      supabase: isSupabaseConfigured,
      authenticated: !!currentFirebaseUser(),
      emailVerified:
        currentFirebaseUser()?.emailVerified ?? false
    };
  }

};


/* =========================================
   AUTHENTICATION SERVICES
========================================= */

export const AuthService = {

  currentUser() {
    return currentFirebaseUser();
  },

  async register(email, password, displayName) {
    return registerFirebaseAccount(
      email,
      password,
      displayName
    );
  },

  async login(email, password) {
    const user = await signInFirebaseAccount(
      email,
      password
    );

    if (!user.emailVerified) {
      throw new Error(
        "Please verify your email before accessing private features."
      );
    }

    await synchronizeFirebaseAccount(user);

    return user;
  },

  async logout() {
    return signOutFirebaseAccount();
  },

  observe(callback) {
    return observeFirebaseAuth(callback);
  }

};


/* =========================================
   DATABASE SERVICES
========================================= */

export const DatabaseService = {

  async getDiscoveryData() {

    if (!supabase || !isSupabaseConfigured) {
      throw new Error(
        "Supabase database is not configured."
      );
    }

    return fetchDiscoveryData();
  },

  getClient() {
    return supabase;
  }

};


/* =========================================
   FAVORITES SERVICES
========================================= */

export const FavoritesService = {

  getAll() {
    return getFavorites();
  },

  exists(id) {
    return isFavorite(id);
  },

  toggle(artwork) {
    const added = toggleFavorite(artwork);

    window.dispatchEvent(
      new CustomEvent("arthive:favorites-updated", {
        detail: {
          artwork,
          added,
          favorites: getFavorites()
        }
      })
    );

    return added;
  }

};


/* =========================================
   AI ASSISTANT SERVICES
========================================= */

export const AIService = {

  async initialize() {
    return loadAssistantConfig();
  },

  async ask(message, sessionId, history = []) {

    if (!message?.trim()) {
      throw new Error("Please enter a message.");
    }

    return sendAssistantMessage(
      message.trim(),
      sessionId,
      history
    );
  },

  async getSessions() {
    return loadAssistantSessions();
  },

  async getHistory(sessionId) {
    return loadAssistantHistory(sessionId);
  },

  async feedback(messageId, rating) {
    return sendAssistantFeedback(
      messageId,
      rating
    );
  },

  async contactSupport(subject, message) {
    return submitSupportRequest(subject, message);
  }

};


/* =========================================
   APPLICATION INITIALIZATION
========================================= */

export async function initializeArtHive() {

  console.info("Initializing ArtHive...");

  const status = ArtHiveApp.status;

  console.table(status);

  if (!status.firebase) {
    console.warn(
      "Firebase authentication is not configured."
    );
  }

  if (!status.supabase) {
    console.warn(
      "Supabase database is not configured."
    );
  }

  window.dispatchEvent(
    new CustomEvent("arthive:initialized", {
      detail: status
    })
  );

  return {
    application: ArtHiveApp.name,
    status,
    initialized: true
  };

}


/* =========================================
   GLOBAL APPLICATION EVENTS
========================================= */

window.addEventListener(
  "online",
  () => {
    console.info("ArtHive connection restored.");
  }
);

window.addEventListener(
  "offline",
  () => {
    console.warn(
      "ArtHive is currently offline."
    );
  }
);
