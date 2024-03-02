import React, { useEffect, useState } from "react";
import { auth } from "../src/firebaseSetup";
import { FollowedWishlists } from "./FollowedWishlists";
import StyledCard from "./StyledCard";
import StyledStack from "./StyledStack";
import { UserWishlists } from "./UserWishlists";

export const UserWishlistsOverview: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (userId) {
      console.log(userId);
    }
  }, [userId]);

  return (
    <StyledStack>
      <StyledCard sx={{ display: "grid", gap: "1rem" }}>
        <FollowedWishlists />
        <UserWishlists />
      </StyledCard>
    </StyledStack>
  );
};
