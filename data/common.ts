// common.ts TODO: rename
// import { useState, useEffect } from "react";
// import { auth } from "../src/firebaseSetup";
import { UserState } from "../src/types";
import { useSelector } from "react-redux";

export const useUserId = (): string => {
  const userState: UserState = useSelector(
    (state: { user: UserState }) => state.user,
  );
  return userState.user?.uid || "";
};
