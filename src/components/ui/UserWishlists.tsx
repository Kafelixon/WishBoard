import React, { useState, useEffect } from "react";
import { createWishlist, findWishlistsByOwner } from "@/lib/wishlistHandlers";
import { Wishlist } from "@/lib/types";
import { useUserId, useUserName } from "@/lib/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { WishlistCard, WishlistCardSkeleton } from "@/components/ui/wishlist-card";

export const UserWishlists: React.FC = () => {
  const [wishlists, setWishlists] = useState<Wishlist[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const userId = useUserId();
  const userName = useUserName();
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setWishlists(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void findWishlistsByOwner(userId).then((data) => {
      setWishlists(data);
      setIsLoading(false);
    });
  }, [userId]);

  const handleAddWishlist = async () => {
    if (!userId) return;

    const newWishlistName = prompt("Enter the name of the new wishlist:");
    if (!newWishlistName) return;

    setIsLoading(true);
    await createWishlist(userId, userName, newWishlistName, "shopping-cart");
    const updatedWishlists = await findWishlistsByOwner(userId);
    setWishlists(updatedWishlists);
    setIsLoading(false);
    toast({ title: "Wishlist created" });
  };

  const renderWishlists = () => {
    if (!userId) {
      return <p className="p-2">Please sign in to view your wishlists.</p>;
    }
    if (wishlists) {
      return wishlists.map((wishlist) => (
        <WishlistCard key={wishlist.id} wishlist={wishlist} />
      ));
    }
    return <p className="p-2">You don't have any wishlists yet.</p>;
  };

  return (
    <Card className="shadow-lg glass">
      <CardHeader className="h-22">
        <CardTitle className="h-10 flex justify-between items-center">
          Your Wishlists
          {userId && <Button onClick={handleAddWishlist}>Add new</Button>}
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