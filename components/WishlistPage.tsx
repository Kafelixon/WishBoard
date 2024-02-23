import { Button, Stack } from "@mui/joy";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchWishlist, followWishlist } from "../data/wishlistHandlers";
import { auth } from "../src/firebaseSetup";
import { WishlistItem } from "../src/types";
import StyledCard from "./StyledCard";
import WishlistTable from "./WishlistTable";

export const Wishlist: React.FC = () => {
  const { wishlistId } = useParams();
  const [userWishlist, setUserWishlist] = useState<WishlistItem[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddMode, setIsAddMode] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setUserWishlist(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (userId) {
      console.log(wishlistId);
      setIsLoading(true);
      if (!wishlistId) {
        return;
      }
      fetchWishlist(wishlistId).then((data) => {
        setUserWishlist(data);
        setIsLoading(false);
      });
    }
  }, [userId]);

  if (!userId) {
    return <p>Please sign in to view your personal wishlist.</p>;
  }

  if (isLoading) {
    return <p>Loading...</p>;
  }

  const handleAddNewListing = () => {
    setIsAddMode(true);
    followWishlist(userId, "wishlist1");
  };

  const cancelAddMode = () => {
    setIsAddMode(false);
  };

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 1, sm: 2, md: 4, pt: 7 }}
      marginX={{ xs: 10, sm: 20, md: 50, pt: 100 }}
      justifyContent="center"
      alignItems="center"
      mt={6}
    >
      <StyledCard>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          width={"-webkit-fill-available"}
          px={2}
        >
          <h1 style={{ alignSelf: "start", paddingRight: 10 }}>
            Personal Wishlist
          </h1>
          {!isAddMode && (
            <Stack direction="row" gap={1}>
              <Button onClick={handleAddNewListing}>Add new</Button>
            </Stack>
          )}
        </Stack>
        <WishlistTable
          response={{ data: userWishlist }}
          isAddMode={isAddMode}
          onCancelAddMode={cancelAddMode}
        />
      </StyledCard>
    </Stack>
  );
};
