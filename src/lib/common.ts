// common.ts TODO: rename
import { UserState } from "@/lib/types";
import { useSelector } from "react-redux";

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
}