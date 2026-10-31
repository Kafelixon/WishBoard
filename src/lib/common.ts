// common.ts TODO: rename
import type { User } from "@/lib/types";
import { useStoredUser } from "@/lib/userStore";

export const useUser = (): User | null => useStoredUser();

export const useUserId = (): string => useStoredUser()?.uid ?? "";

export const useUserName = (): string => useStoredUser()?.displayName ?? "";
