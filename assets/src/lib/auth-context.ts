import { createContext } from "react";
import type { AuthState } from "./auth-types";

/**
 * Authentication context for providing auth state throughout the app.
 * @internal - Use the useAuth hook instead of consuming this directly.
 */
export const AuthContext = createContext<AuthState | null>(null);
