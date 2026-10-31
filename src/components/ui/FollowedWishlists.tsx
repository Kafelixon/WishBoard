import React, { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { fetchFollowedWishlists, renameFollowedWishlist } from "@/lib/wishlistHandlers";
import { useUserId } from "@/lib/common";
import { usePageTitle } from "@/lib/usePageTitle";
import { useToast } from "@/components/ui/use-toast";
import { Wishlist } from "@/lib/types";
import { RenameFollowDialog } from "@/components/ui/RenameFollowDialog";
import { EmptyState, PageHeader } from "@/components/ui/page";
import {
  WishlistCard,
  WishlistCardSkeleton,
} from "@/components/ui/wishlist-card";

export const FollowedWishlists: React.FC = () => {
  usePageTitle("Following");
  const [wishlists, setWishlists] = useState<Wishlist[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [renaming, setRenaming] = useState<Wishlist | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
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
  }, [userId, toast]);

  const saveName = (wishlist: Wishlist, customName: string) => {
    if (!userId) return;
    setIsSaving(true);
    renameFollowedWishlist(userId, wishlist.id, customName)
      .then(() => {
        setWishlists(
          (current) =>
            current?.map((w) => {
              if (w.id !== wishlist.id) return w;
              const { customName: _previous, ...rest } = w;
              return customName ? { ...rest, customName } : rest;
            }) ?? null,
        );
        setRenaming(null);
      })
      .catch((error: unknown) => {
        console.error(error);
        toast({ title: "Failed to rename the wishlist", variant: "destructive" });
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  return (
    <>
      <PageHeader
        eyebrow="From friends and family"
        title="Following"
        description="Wishlists you follow, newest changes first."
      />
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
              <WishlistCard wishlist={wishlist} onRename={setRenaming} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Heart aria-hidden="true" />}
          title="Nothing followed yet"
          description="Open a wishlist a friend shared with you and choose Follow. It will show up here."
        />
      )}
      <RenameFollowDialog
        wishlist={renaming}
        isSubmitting={isSaving}
        onSave={saveName}
        onClose={() => {
          setRenaming(null);
        }}
      />
    </>
  );
};
