import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { queryClient } from "@/app/providers/query-client";
import type { AuthState } from "@/shared/types/auth";
import { BACKEND_URL } from "@/shared/utils/auth-utils";
import { fetchCurrentUser } from "../api/auth-api";

export const AUTH_QUERY_KEY = ["auth", "current-user"] as const;

type AuthStoreState = AuthState & {
  setFromQuery: (payload: { user: AuthState["user"]; isLoading: boolean }) => void;
};

export const useAuthStore = create<AuthStoreState>()(
  devtools(
    (set) => ({
      isLoading: true,
      isAuthenticated: false,
      user: null,
      redirectToSignIn: () => {
        window.location.href = `${BACKEND_URL}/sign-in`;
      },
      logout: () => {
        window.location.href = `${BACKEND_URL}/sign-out`;
      },
      refreshUser: async () => {
        try {
          const user = await queryClient.fetchQuery({
            queryKey: AUTH_QUERY_KEY,
            queryFn: fetchCurrentUser,
            staleTime: 0,
          });
          set(
            {
              user: user ?? null,
              isAuthenticated: Boolean(user),
              isLoading: false,
            },
            false,
            "auth/refreshUser",
          );
        } catch (error) {
          set(
            {
              user: null,
              isAuthenticated: false,
              isLoading: false,
            },
            false,
            "auth/refreshUser:error",
          );
          throw error;
        }
      },
      setFromQuery: ({ user, isLoading }) => {
        set(
          {
            user,
            isAuthenticated: Boolean(user),
            isLoading,
          },
          false,
          "auth/sync",
        );
      },
    }),
    { name: "AuthStore", enabled: import.meta.env.DEV },
  ),
);
