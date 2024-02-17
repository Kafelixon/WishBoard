import React, { useState, useEffect } from "react";
import WishlistTable from "./WishlistTable";
import {
  fetchUserWishlist,
  // removeFromUserWishlist,
} from "../data/userWishlist";
import { WishlistItem } from "../src/types";
import { auth } from "../src/firebaseSetup";
import { Button, Stack } from "@mui/joy";
import StyledCard from "./StyledCard";

export const Wishlist: React.FC = () => {
  const [userWishlist, setUserWishlist] = useState<WishlistItem[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
      setIsLoading(true);
      fetchUserWishlist(userId).then((data) => {
        setUserWishlist(data);
        setIsLoading(false);
      });
    }
  }, [userId]);

  // const removeSelected = async () => {
  //   if (!userId) {
  //     console.error("User ID is missing.");
  //     return;
  //   }
  //   const confirmDelete = window.confirm(
  //     "Are you sure you want to delete these records? This cannot be undone."
  //   );
  //   if (confirmDelete) {
  //     try {
  //       await removeFromUserWishlist(userId, selectedRecords);
  //       setUserWishlist((prev) =>
  //         prev
  //           ? prev.filter(
  //               (record) => !selectedRecords.includes(record.id.toString())
  //             )
  //           : null
  //       );

  //       setSelectedRecords([]);
  //       setIsEditMode(false);
  //     } catch (error) {
  //       console.error("Error removing selected records:", error);
  //     }
  //   }
  // };

  // const cancelEditMode = () => {
  //   setSelectedRecords([]);
  //   setIsEditMode(false);
  // };

  if (!userId) {
    return <p>Please sign in to view your personal wishlist.</p>;
  }

  if (isLoading) {
    return <p>Loading...</p>;
  }

  const handleAddNewListing = () => {
    console.log("Add new button clicked");
    // TODO: Add new listing functionality
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
        {userWishlist && userWishlist.length > 0 ? (
          <>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              width={"-webkit-fill-available"}
              px={2}
            >
              <h1 style={{ alignSelf: "start" }}>Personal Wishlist</h1>
              <Stack direction="row" gap={1}>
                <Button onClick={handleAddNewListing}>Add new</Button>
              </Stack>
            </Stack>
            <WishlistTable response={{ data: userWishlist }} />
          </>
        ) : (
          <p>Your personal dictionary is empty.</p>
        )}
      </StyledCard>
    </Stack>
  );
};
