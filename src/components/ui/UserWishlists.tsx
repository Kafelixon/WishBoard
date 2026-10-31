import React, { Suspense, lazy, useState, useEffect } from "react";
import { Plus, Sprout } from "lucide-react";
import {
  createWishlist,
  deleteWishlist,
  findWishlistsByOwner,
  updateWishlist,
} from "@/lib/wishlistHandlers";
import { Wishlist } from "@/lib/types";
import { useUserId, useUserName } from "@/lib/common";
import { usePageTitle } from "@/lib/usePageTitle";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { useToast } from "@/components/ui/use-toast";
import {
  WishlistCard,
  WishlistCardSkeleton,
} from "@/components/ui/wishlist-card";

const loadEditDialog = () => import("./WishlistEditDialog");
// The form needs yup, react-hook-form and the dialog; keep them out of the page's first load.
const WishlistEditDialog = lazy(async () => ({
  default: (await loadEditDialog()).WishlistEditDialog,
}));

export const UserWishlists: React.FC = () => {
  usePageTitle("Your wishlists");
  const userName = useUserName();
  const PLACEHOLDER_ITEM: Wishlist = {
    id: "",
    name: "",
    author: userName,
    icon: "shopping-cart",
    updateTimestamp: 0,
  };

  const [wishlists, setWishlists] = useState<Wishlist[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Becomes true once the dialog code has been fetched in the background, so opening it is instant.
  const [dialogLoaded, setDialogLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentItem, setCurrentItem] = useState<Wishlist>(PLACEHOLDER_ITEM);

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [actionType, setActionType] = useState<"Add" | "Update">("Add");
  const userId = useUserId();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadEditDialog().then(() => {
        setDialogLoaded(true);
      });
    }, 800);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    findWishlistsByOwner(userId)
      .then(setWishlists)
      .catch((error: unknown) => {
        console.error(error);
        toast({ title: "Failed to load your wishlists", variant: "destructive" });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [userId, toast]);

  const runWishlistWrite = async (
    write: () => Promise<void>,
    successMessage: string,
    errorMessage: string,
  ) => {
    if (!userId) return;

    setIsSubmitting(true);
    try {
      await write();
      setWishlists(await findWishlistsByOwner(userId));
      toast({ title: successMessage });
    } catch (error) {
      console.error(error);
      toast({ title: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleItemChange = (changes: Partial<Wishlist>) => {
    setCurrentItem((current) => ({ ...current, ...changes }));
  };

  const handleAddWishlist = async (wishlistToAdd: Wishlist) => {
    if (!wishlistToAdd.name) return;
    await runWishlistWrite(
      () => createWishlist(userId, wishlistToAdd),
      "Wishlist created",
      "Failed to create the wishlist",
    );
  };

  const handleEditWishlist = async (wishlistToUpdate: Wishlist) => {
    await runWishlistWrite(
      () => updateWishlist(userId, wishlistToUpdate),
      "Wishlist updated",
      "Failed to update the wishlist",
    );
  };

  const handleDelete = async () => {
    await runWishlistWrite(
      () => deleteWishlist(userId, currentItem.id),
      "Wishlist deleted",
      "Failed to delete the wishlist",
    );
  };

  const openAddDialog = () => {
    setCurrentItem(PLACEHOLDER_ITEM);
    setActionType("Add");
    setDialogOpen(true);
  };

  const openEditDialog = (wishlist: Wishlist) => {
    setCurrentItem(wishlist);
    setActionType("Update");
    setDialogOpen(true);
  };

  const firstName = userName.split(" ")[0];

  return (
    <>
      <PageHeader
        eyebrow={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        title="Your wishlists"
        description="Keep every occasion in its own list, then share a link when you're ready."
        actions={
          <Button onClick={openAddDialog}>
            <Plus aria-hidden="true" /> New wishlist
          </Button>
        }
      />
      {(dialogOpen || dialogLoaded) && (
      <Suspense fallback={null}>
      <WishlistEditDialog
        isOpen={dialogOpen}
        isSubmitting={isSubmitting}
        actionType={actionType}
        dialogTitle={actionType === "Add" ? "New wishlist" : "Edit wishlist"}
        handleAction={(wishlist) => {
          void (actionType === "Add"
            ? handleAddWishlist(wishlist)
            : handleEditWishlist(wishlist));
        }}
        setDialogOpen={setDialogOpen}
        handleItemChange={handleItemChange}
        handleDelete={() => {
          void handleDelete();
        }}
        wishlist={currentItem}
      />
      </Suspense>
      )}
      {isLoading ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {["a", "b", "c"].map((key) => (
            <li key={key}>
              <WishlistCardSkeleton />
            </li>
          ))}
        </ul>
      ) : wishlists && wishlists.length > 0 ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {wishlists.map((wishlist) => (
            <li key={wishlist.id} className="animate-rise">
              <WishlistCard wishlist={wishlist} onEdit={openEditDialog} />
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={openAddDialog}
              className="flex min-h-44 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-input text-muted-foreground transition-colors hover:border-primary hover:bg-card hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-6" aria-hidden="true" />
              Start a new list
            </button>
          </li>
        </ul>
      ) : (
        <EmptyState
          icon={<Sprout aria-hidden="true" />}
          title="Plant your first wishlist"
          description="Create a list for a birthday, a new home, or just because. You can add items and share it any time."
          action={
            <Button onClick={openAddDialog}>
              <Plus aria-hidden="true" /> New wishlist
            </Button>
          }
        />
      )}
    </>
  );
};
