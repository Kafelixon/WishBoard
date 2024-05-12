import React, { useState, useEffect } from "react";
import {
  createWishlist,
  deleteWishlist,
  findWishlistsByOwner,
  updateWishlist,
} from "@/lib/wishlistHandlers";
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
  const PLACEHOLDER_ITEM: Wishlist = {
    id: "",
    name: "",
    author: useUserName(),
    icon: "shopping-cart",
    updateTimestamp: Date.now(),
  };

  const [wishlists, setWishlists] = useState<Wishlist[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentItem, setCurrentItem] = useState<Wishlist>(PLACEHOLDER_ITEM);

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [actionType, setActionType] = useState<"Add" | "Update">("Add");
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [handleAction, setHandleAction] = useState<
    (wishlist: Wishlist) => void
  >(() => {});
  const [editMode, setEditMode] = useState<boolean>(false);
  const userId = useUserId();
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

  const handleAddWishlist = async (wishlistToAdd: Wishlist) => {
    if (!userId) return;

    const newWishlistName = wishlistToAdd.name;
    if (!newWishlistName) return;

    setIsSubmitting(true);
    await createWishlist(userId, wishlistToAdd);
    setIsSubmitting(false);

    setIsLoading(true);
    setWishlists(await findWishlistsByOwner(userId));
    setIsLoading(false);

    toast({ title: "Wishlist created" });
  };

  const handleEditWishlist = async (wishlistToUpdate: Wishlist) => {
    if (!userId) return;

    setIsSubmitting(true);
    await updateWishlist(userId, wishlistToUpdate);
    setIsSubmitting(false);

    setIsLoading(true);
    setWishlists(await findWishlistsByOwner(userId));
    setIsLoading(false);

    toast({ title: "Wishlist updated" });
  };

  const handleDelete = async () => {
    if (!userId) return;

    setIsSubmitting(true);
    await deleteWishlist(userId, currentItem.id);
    setIsSubmitting(false);
    setIsLoading(true);
    const refreshedWishlists = await findWishlistsByOwner(userId);
    setWishlists(refreshedWishlists);
    setIsLoading(false);
    toast({ title: "Wishlist deleted" });
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
          handleEdit={(wishlist) => {
            setCurrentItem(wishlist);
            setActionType("Update");
            setDialogTitle("Edit Your Wishlist");
            setHandleAction(() => handleEditWishlist);
            setDialogOpen(true);
          }}
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
              <Button
                onClick={() => {
                  setCurrentItem(PLACEHOLDER_ITEM);
                  setActionType("Add");
                  setDialogTitle("Add New Wishlist");
                  setHandleAction(() => handleAddWishlist);
                  setDialogOpen(true);
                }}
              >
                Add new
              </Button>
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
        isSubmitting={isSubmitting}
        actionType={actionType}
        dialogTitle={dialogTitle}
        handleAction={handleAction}
        setDialogOpen={setDialogOpen}
        handleItemChange={handleItemChange}
        handleDelete={handleDelete}
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
