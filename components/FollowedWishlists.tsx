import React, { useState, useEffect } from "react";
import { fetchFollowedWishlists } from "../data/wishlistHandlers";
import StyledCard from "./StyledCard";
import { useUserId } from "../data/common";

export const FollowedWishlists: React.FC = () => {
  const [followedWishlists, setFollowedWishlists] = useState<string[] | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const userId = useUserId();

  useEffect(() => {
    if (userId) {
      setIsLoading(true);
      void fetchFollowedWishlists(userId).then((data) => {
        setFollowedWishlists(data);
        setIsLoading(false);
      });
    } else {
      setFollowedWishlists(null);
      setIsLoading(false);
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
      <h2 style={{ alignSelf: "start" }}>Followed Wishlists</h2>

      {followedWishlists && followedWishlists.length > 0 ? (
        <ul>
          {followedWishlists.map((wishlistId) => (
            <li key={wishlistId}>
              <a href={`/wishlist/${wishlistId}`}>{wishlistId}</a>
            </li>
          ))}
        </ul>
      ) : (
        <p>You are not following any wishlists.</p>
      )}
    </StyledCard>
  );
};
