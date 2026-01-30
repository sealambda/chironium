import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { queryClient } from "@/app/providers/query-client";
import type { User } from "@/gql/graphql";
import { fetchCurrentUser } from "../api/user-api";

export const USER_QUERY_KEY = ["user", "current"] as const;

type UserStoreState = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  setFromQuery: (payload: {
    user: User | null;
    isLoading: boolean;
    error: Error | null;
  }) => void;
  refreshUser: () => Promise<User>;
};

export const useUserStore = create<UserStoreState>()(
  devtools(
    (set) => ({
      user: null,
      isLoading: true,
      error: null,
      setFromQuery: ({ user, isLoading, error }) => {
        set({ user, isLoading, error }, false, "user/sync");
      },
      refreshUser: async () => {
        set({ error: null }, false, "user/refresh:start");
        const user = await queryClient.fetchQuery({
          queryKey: USER_QUERY_KEY,
          queryFn: fetchCurrentUser,
          staleTime: 0,
        });
        set({ user, isLoading: false }, false, "user/refresh:success");
        return user;
      },
    }),
    { name: "UserStore", enabled: import.meta.env.DEV },
  ),
);
