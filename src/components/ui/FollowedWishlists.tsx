import React, { useState, useEffect } from "react";
import { fetchFollowedWishlists } from "@/lib/wishlistHandlers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserId } from "@/lib/common";
import { Wishlist } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  WishlistCard,
  WishlistCardSkeleton,
} from "@/components/ui/wishlist-card";

export const FollowedWishlists: React.FC = () => {
  const [wishlists, setWishlists] = useState<Wishlist[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const userId = useUserId();

  useEffect(() => {
    if (!userId) {
      setWishlists(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void fetchFollowedWishlists(userId).then((data) => {
      setWishlists(data);
      setIsLoading(false);
    });
  }, [userId]);

  if (!userId) {
    return <p>Please sign in to view your followed wishlists.</p>;
  }

  const renderWishlists = () => {
    if (wishlists) {
      return wishlists.map((wishlist) => (
        <WishlistCard key={wishlist.id} wishlist={wishlist} handleEdit={() => console.log("Not Implemented")}/> // TODO: Implement handleEdit
      ));
    }
    return <p>You are not following any wishlists yet.</p>;
  };

  return (
    <Card className="shadow-lg glass">
      <CardHeader className="h-22">
        <CardTitle className="h-10 flex justify-start items-center">
          Your Followed Wishlists
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72 w-full rounded-md border place-items-center glass-fg">
          {isLoading
            ? Array(3)
                .fill(null)
                .map((_, index) => <WishlistCardSkeleton key={index} />)
            : renderWishlists()}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
