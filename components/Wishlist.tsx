import React, { useState, useEffect } from "react";
import WishlistTable from "./WishlistTable";
import {
  fetchUserWishlist,
  // removeFromUserWishlist,
} from "../data/userWishlist";
import { WishlistItem } from "../src/types";
import { auth } from "../src/firebaseSetup";
import { Stack } from "@mui/joy";
import StyledCard from "./StyledCard";

export const Wishlist: React.FC = () => {
  const [userWishlist, setUserWishlist] = useState<WishlistItem[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // const [isEditMode, setIsEditMode] = useState<boolean>(false);
  // const [selectedRecords, setSelectedRecords] = useState<string[]>([]);

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

  return (
    <StyledCard>
      {userWishlist && (
        <>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            width={"-webkit-fill-available"}
            px={2}
          >
            <h1 style={{ alignSelf: "start" }}>Personal Wishlist</h1>
            {/* {isEditMode ? (
              <Stack direction="row" gap={1}>
                <Button onClick={removeSelected}>Remove</Button>
                <Button onClick={cancelEditMode}>Cancel</Button>
              </Stack>
            ) : (
              <Button onClick={() => setIsEditMode(true)}>Edit</Button>
            )} */}
          </Stack>
          <WishlistTable
            response={{ data: userWishlist }}
            // isEditMode={isEditMode}
            // selectedRecords={selectedRecords}
            // onSelectRecord={(recordId) => {
            //   setSelectedRecords((prev: string[]) => {
            //     if (prev.includes(recordId)) {
            //       return prev.filter((id) => id !== recordId);
            //     } else {
            //       return [...prev, recordId];
            //     }
            //   });
            // }}
          />
        </>
      )}
    </StyledCard>
  );
};
