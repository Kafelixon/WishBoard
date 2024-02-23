import React, { useState, useEffect } from "react";
import { fetchFollowedWishlists } from "../data/wishlistHandlers";
import { auth } from "../src/firebaseSetup";
import StyledCard from "./StyledCard";

export const FollowedWishlists: React.FC = () => {
  const [followedWishlists, setFollowedWishlists] = useState<string[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setFollowedWishlists(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (userId) {
      setIsLoading(true);
      fetchFollowedWishlists(userId).then((data) => {
        setFollowedWishlists(data);
        setIsLoading(false);
      });
    }
  }, [userId]);

  if (!userId) {
    return <p>Please sign in to view your followed wishlists.</p>;
  }

  if (isLoading) {
    return <p>Loading...</p>;
  }

  return (
    <StyledCard>
      {followedWishlists && followedWishlists.length > 0 ? (
        <ul>
          {followedWishlists.map((wishlistId) => (
            <li key={wishlistId}>{wishlistId}</li>
          ))}
        </ul>
      ) : (
        <p>You are not following any wishlists.</p>
      )}
    </StyledCard>
  );
};