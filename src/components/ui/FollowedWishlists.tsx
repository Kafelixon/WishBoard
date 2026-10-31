import React, { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  usePageTitle(t("following.title"));
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
          title: t("following.loadFailed"),
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [userId, toast, t]);

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
        toast({ title: t("following.renameFailed"), variant: "destructive" });
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  return (
    <>
      <PageHeader
        eyebrow={t("following.eyebrow")}
        title={t("following.title")}
        description={t("following.description")}
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
          title={t("following.emptyTitle")}
          description={t("following.emptyDescription")}
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
