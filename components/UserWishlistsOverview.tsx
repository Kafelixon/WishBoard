import { Stack } from "@mui/joy";
import React, { useEffect, useState } from "react";
import { auth } from "../src/firebaseSetup";
import { FollowedWishlists } from "./FollowedWishlists";
import StyledCard from "./StyledCard";
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
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 1, sm: 2, md: 4, pt: 7 }}
      marginX={{ xs: 5, sm: 20, md: 50, pt: 100 }}
      justifyContent="center"
      alignItems="center"
      mt={12}
      mb={6}
    >
      <StyledCard sx={{ display: "grid", gap: "1rem" }}>
        <FollowedWishlists />
        <UserWishlists />
      </StyledCard>
    </Stack>
  );
};
