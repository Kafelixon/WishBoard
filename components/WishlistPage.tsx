import { Button, Stack, Typography } from "@mui/joy";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchWishlistAuthor,
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
  const [wishlistAuthor, setWishlistAuthor] = useState<string>("");
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
      void fetchWishlistName(wishlistId).then((name) => {
        setWishlistName(name);
      });
      void fetchWishlistAuthor(wishlistId).then((author) => {
        setWishlistAuthor(author);
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
          <Stack direction="column" style={{ alignSelf: "start" }}>
            <Typography level="h2" style={{ marginBottom: 0 }}>
              {wishlistName}
            </Typography>
            {wishlistAuthor && (
              <Typography level="body-sm" style={{ margin: 0 }}>
                by {wishlistAuthor}
              </Typography>
            )}
          </Stack>
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
