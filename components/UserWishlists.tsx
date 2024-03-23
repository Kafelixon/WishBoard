import React, { useState, useEffect } from "react";
import { createWishlist, findWishlistsByOwner } from "../data/wishlistHandlers";
import StyledCard from "./StyledCard";
import { Wishlist } from "../src/types";
import { Button } from "@mui/joy";
import { useUserId, useUserName } from "../data/common";

export const UserWishlists: React.FC = () => {
  const [userWishlists, setUserWishlists] = useState<Wishlist[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const userId = useUserId();
  const userName = useUserName();

  useEffect(() => {
    if (userId) {
      setIsLoading(true);
      void findWishlistsByOwner(userId).then((data) => {
        setUserWishlists(data);
        setIsLoading(false);
      });
    }
  }, [userId]);

  const handleAddWishlist = async () => {
    if (userId) {
      const newWishlistName = prompt("Enter the name of the new wishlist:");
      if (newWishlistName) {
        setIsLoading(true);
        await createWishlist(userId, userName, newWishlistName);
        const updatedWishlists = await findWishlistsByOwner(userId);
        setUserWishlists(updatedWishlists);
        setIsLoading(false);
      }
    }
  };

  if (!userId) {
    return <p>Please sign in to view your wishlists.</p>;
  }

  if (isLoading) {
    return <p>Loading...</p>;
  }

  return (
    <StyledCard>
      <h2 style={{ alignSelf: "start" }}>Your Wishlists</h2>

      <Button onClick={() => void handleAddWishlist()}>Add new</Button>
      {userWishlists && userWishlists.length > 0 ? (
        <ul>
          {userWishlists.map((wishlist) => (
            <li key={wishlist.id}>
              <a href={`/wishlist/${wishlist.id}`}>{wishlist.name}</a>
            </li>
          ))}
        </ul>
      ) : (
        <p>You don't have any wishlists.</p>
      )}
    </StyledCard>
  );
};
