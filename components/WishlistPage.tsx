import { Button, Stack } from "@mui/joy";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchWishlistName,
  isUserWishlistOwner,
} from "../data/wishlistHandlers";
import StyledCard from "./StyledCard";
import StyledStack from "./StyledStack";
import WishlistItemsTable from "./WishlistTable";
import { useUserId } from "../data/common";

export const WishlistPage: React.FC = () => {
  const { wishlistId } = useParams();
  const [isAddMode, setIsAddMode] = useState<boolean>(false);
  const [isWishlistOwner, setIsWishlistOwner] = useState<boolean>(false);
  const [wishlistName, setWishlistName] = useState<string>("");
  const userId = useUserId();

  useEffect(() => {
    if (userId && wishlistId) {
      void isUserWishlistOwner(userId, wishlistId).then((isOwner) => {
        setIsWishlistOwner(isOwner);
      });
    }
  }, [userId, wishlistId]);

  useEffect(() => {
    if (wishlistId) {
      console.log("fetching wishlist name");
      void fetchWishlistName(wishlistId).then((name) => {
        setWishlistName(name);
      });
    }
  }, [wishlistId]);

  const handleAddNewListing = () => {
    setIsAddMode(true);
  };

  const cancelAddMode = () => {
    setIsAddMode(false);
  };

  if (!wishlistId) {
    return <div>Wishlist not found</div>;
  }

  return (
    <StyledStack>
      <StyledCard>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          width={"-webkit-fill-available"}
          px={2}
        >
          <h1 style={{ alignSelf: "start" }}>{wishlistName}</h1>
          {!isAddMode && userId && isWishlistOwner && (
            <Stack direction="row" gap={1} sx={{ paddingLeft: 5 }}>
              <Button onClick={handleAddNewListing}>Add new</Button>
            </Stack>
          )}
        </Stack>
        <WishlistItemsTable
          isAddMode={isAddMode}
          onCancelAddMode={cancelAddMode}
          userId={userId}
          wishlistId={wishlistId}
        />
      </StyledCard>
    </StyledStack>
  );
};
