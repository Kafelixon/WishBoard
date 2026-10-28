import React, { useState, useEffect } from "react";
import { fetchFollowedWishlists } from "@/lib/wishlistHandlers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserId } from "@/lib/common";
import { useToast } from "@/components/ui/use-toast";
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
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    fetchFollowedWishlists(userId)
      .then(setWishlists)
      .catch((error: unknown) => {
        console.error(error);
        toast({
          title: "Failed to load followed wishlists",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast is stable; reload only when the user changes
  }, [userId]);

  if (!userId) {
    return <p>Please sign in to view your followed wishlists.</p>;
  }

  const renderWishlists = () => {
    if (wishlists && wishlists.length > 0) {
      return wishlists.map((wishlist) => (
        <WishlistCard
          key={wishlist.id}
          wishlist={wishlist}
          editMode={false}
          handleEdit={() => { console.log("Not Implemented"); }}
        /> // TODO: Implement handleEdit
      ));
    }
    return <p>You are not following any wishlists yet.</p>;
  };

  return (
    <Card className="glass">
      <CardHeader className="h-22">
        <CardTitle className="h-10 flex justify-start items-center">
          Your Followed Wishlists
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72 w-full rounded-md border place-items-center glass-fg">
          {isLoading
            ? ["followed-skeleton-1", "followed-skeleton-2", "followed-skeleton-3"].map((key) => (
                <WishlistCardSkeleton key={key} />
              ))
            : renderWishlists()}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
