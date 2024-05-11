import React, { useState, useEffect } from "react";
import { createWishlist, findWishlistsByOwner } from "@/lib/wishlistHandlers";
import { Wishlist } from "@/lib/types";
import { useUserId, useUserName } from "@/lib/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import {
  WishlistCard,
  WishlistCardSkeleton,
} from "@/components/ui/wishlist-card";
import { WishlistEditDialog } from "./WishlistEditDialog";
import { Pencil, X } from "lucide-react";

export const UserWishlists: React.FC = () => {
  const [wishlists, setWishlists] = useState<Wishlist[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentItem, setCurrentItem] = useState<Wishlist>({
    id: "",
    name: "",
    author: "",
    icon: "shopping-cart",
    updateTimestamp: Date.now(),
  });
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
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

  const handleItemChange = (changes: Partial<Wishlist>) =>
    setCurrentItem((current) => ({ ...current, ...changes }));

  const handleAddWishlist = async () => {
    if (!userId) return;

    const newWishlistName = currentItem.name;
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
        <WishlistCard
          key={wishlist.id}
          wishlist={wishlist}
          editMode={editMode}
          handleEdit={() => console.log("Edit Wishlist")}
        ></WishlistCard>
      ));
    }
    return <p className="p-2">You don't have any wishlists yet.</p>;
  };

  return (
    <Card className="shadow-lg glass">
      <CardHeader className="h-22">
        <CardTitle className="h-10 flex justify-between items-center">
          Your Wishlists
          {userId && (
            <div className="flex gap-1">
              <Button onClick={() => setDialogOpen(true)}>Add new</Button>
              <Button
                className="p-2"
                variant={!editMode ? "default" : "destructive"}
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? <X /> : <Pencil />}
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <WishlistEditDialog
        isOpen={dialogOpen}
        isSubmitting={false}
        action="Add"
        setDialogOpen={setDialogOpen}
        handleAction={handleAddWishlist}
        onUpdate={handleItemChange}
        wishlist={currentItem}
      />
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
