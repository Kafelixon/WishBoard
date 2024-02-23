import React, { useState, useEffect } from "react";
import { createWishlist, findWishlistsByOwner } from "../data/wishlistHandlers";
import { auth } from "../src/firebaseSetup";
import StyledCard from "./StyledCard";
import { Wishlist } from "../src/types";

export const UserWishlists: React.FC = () => {
  const [userWishlists, setUserWishlists] = useState<Wishlist[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setUserWishlists(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (userId) {
      setIsLoading(true);
      findWishlistsByOwner(userId).then((data) => {
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
        await createWishlist(userId, newWishlistName);
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
      <button onClick={handleAddWishlist}>Add Wishlist</button>
      {userWishlists && userWishlists.length > 0 ? (
        <ul>
          {userWishlists.map((wishlist) => (
            <li key={wishlist.id}>{wishlist.name}</li>
          ))}
        </ul>
      ) : (
        <p>You don't have any wishlists.</p>
      )}
    </StyledCard>
  );
};