import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { queryClient } from "@/app/providers/query-client";
import { fetchCurrentUser, type UserProfile } from "@/features/user/api/user-api";
import { USER_QUERY_KEY } from "@/shared/utils/query-keys";

type UserStoreState = {
  user: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  setFromQuery: (payload: {
    user: UserProfile | null;
    isLoading: boolean;
    error: Error | null;
  }) => void;
  refreshUser: () => Promise<UserProfile>;
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
