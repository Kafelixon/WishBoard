// common.ts TODO: rename
import { UserState, User } from "@/lib/types";
import { useSelector } from "react-redux";

export const useUser = (): User | null => {
  const userState: UserState = useSelector(
    (state: { user: UserState }) => state.user,
  );
  console.log("userState", userState);
  return userState.user || null;
};

export const useUserId = (): string => {
  const userState: UserState = useSelector(
    (state: { user: UserState }) => state.user,
  );
  return userState.user?.uid || "";
};

export const useUserName = (): string => {
  const userState: UserState = useSelector(
    (state: { user: UserState }) => state.user,
  );
  return userState.user?.displayName || "";
};
