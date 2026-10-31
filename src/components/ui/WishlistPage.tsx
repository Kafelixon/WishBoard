import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FollowStateChanger,
  fetchWishlistView,
  followWishlist,
  isFollowingWishlist,
  unfollowWishlist,
  type WishlistView,
} from "@/lib/wishlistHandlers";
import { NotFound } from "@/components/ui/NotFound";
import WishlistItemsTable from "@/components/ui/WishlistTable";
import { useUserId } from "@/lib/common";
import { WishlistItem } from "@/lib/types";
import { Button } from "./button";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "./skeleton";
import { ArrowLeft, Heart, Link2, Share } from "lucide-react";
import { Link } from "react-router-dom";
import { usePageTitle } from "@/lib/usePageTitle";
import { PageHeader } from "@/components/ui/page";
import { WishlistIconBadge } from "@/components/ui/icon";

interface FollowButtonProps {
  isWishlistOwner: boolean;
  isFollowing: boolean;
  userId: string;
  wishlistId: string;
  setIsFollowing: React.Dispatch<React.SetStateAction<boolean>>;
  toast: ReturnType<typeof useToast>["toast"];
}

function FollowButton({
  isWishlistOwner,
  isFollowing,
  userId,
  wishlistId,
  setIsFollowing,
  toast,
}: FollowButtonProps) {
  const { t } = useTranslation();
  const handleFollowChange = (
    followAction: FollowStateChanger,
    nowFollowing: boolean,
    successMessage: string,
    errorMessage: string,
  ) => {
    followAction(userId, wishlistId)
      .then(() => {
        setIsFollowing(nowFollowing);
        toast({ title: successMessage });
      })
      .catch((error: unknown) => {
        console.error(error);
        toast({ title: errorMessage, variant: "destructive" });
      });
  };

  const handleFollow = () => {
    handleFollowChange(
      followWishlist,
      true,
      t("wishlistPage.nowFollowing"),
      t("wishlistPage.followFailed"),
    );
  };

  const handleUnfollow = () => {
    handleFollowChange(
      unfollowWishlist,
      false,
      t("wishlistPage.noLongerFollowing"),
      t("wishlistPage.unfollowFailed"),
    );
  };

  if (isWishlistOwner || !userId) {
    return null;
  }

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      onClick={isFollowing ? handleUnfollow : handleFollow}
    >
      <Heart className={isFollowing ? "fill-current" : undefined} aria-hidden="true" />
      {isFollowing ? t("wishlistPage.following") : t("wishlistPage.follow")}
    </Button>
  );
}

function ShareButtons({
  wishlistId,
  title,
  toast,
}: {
  wishlistId: string;
  title: string;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const { t } = useTranslation();
  const url = `${window.location.origin}/wishlist/${wishlistId}`;
  // Phones (and some desktop browsers) have a native share sheet.
  const canShare = "share" in navigator;

  const copyLink = () => {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast({ title: t("card.copied"), description: t("card.copiedDescription") });
      })
      .catch(() => {
        toast({
          title: t("card.copyFailed"),
          description: t("card.copyFailedDescription"),
          variant: "destructive",
        });
      });
  };

  const share = () => {
    navigator.share({ title, url }).catch((error: unknown) => {
      // Closing the share sheet is not an error; anything else falls back to copying.
      if (error instanceof DOMException && error.name === "AbortError") return;
      copyLink();
    });
  };

  return (
    <>
      {canShare && (
        <Button variant="outline" onClick={share}>
          <Share aria-hidden="true" />
          {t("wishlistPage.share")}
        </Button>
      )}
      <Button variant="outline" onClick={copyLink}>
        <Link2 aria-hidden="true" />
        {t("wishlistPage.copyLink")}
      </Button>
    </>
  );
}

type LoadState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error" }
  | { status: "ready"; view: WishlistView };

/** Remounts the page content per wishlist and user so load state starts fresh. */
export const WishlistPage: React.FC = () => {
  const { wishlistId = "" } = useParams();
  const userId = useUserId();
  return (
    <WishlistPageContent
      key={`${wishlistId}:${userId}`}
      wishlistId={wishlistId}
      userId={userId}
    />
  );
};

const WishlistPageContent: React.FC<{ wishlistId: string; userId: string }> = ({
  wishlistId,
  userId,
}) => {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchWishlistView(wishlistId, userId || null),
      userId ? isFollowingWishlist(userId, wishlistId) : false,
    ])
      .then(([view, following]) => {
        if (cancelled) return;
        if (!view) {
          setState({ status: "missing" });
          return;
        }
        setItems(view.items);
        setIsFollowing(following);
        setState({ status: "ready", view });
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [userId, wishlistId]);

  const wishlistInfo = state.status === "ready" ? state.view.info : null;
  const isWishlistOwner = state.status === "ready" && state.view.isOwner;
  const pageTitle =
    wishlistInfo?.name ??
    (state.status === "missing"
      ? t("wishlistPage.missingTitle")
      : t("wishlistPage.fallbackTitle"));
  usePageTitle(pageTitle);

  if (state.status === "missing") {
    return (
      <NotFound
        title={t("wishlistPage.missingTitle")}
        message={t("wishlistPage.missingMessage")}
      />
    );
  }
  if (state.status === "error") {
    return (
      <NotFound
        title={t("wishlistPage.errorTitle")}
        message={t("wishlistPage.errorMessage")}
      />
    );
  }


  return (
    <>
      {isWishlistOwner && (
        <Link
          to="/wishlists"
          className="-mt-4 mb-6 inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("wishlistPage.back")}
        </Link>
      )}
      {!wishlistInfo ? (
        <div className="space-y-3 pb-8" aria-busy="true">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-12 w-72 max-w-full" />
        </div>
      ) : (
        <PageHeader
          eyebrow={
            wishlistInfo.author
              ? t("wishlistPage.byAuthor", { author: wishlistInfo.author })
              : t("wishlistPage.fallbackTitle")
          }
          title={wishlistInfo.name}
          icon={<WishlistIconBadge name={wishlistInfo.icon} color={wishlistInfo.iconColor} />}
          actions={
            <>
              <ShareButtons wishlistId={wishlistId} title={wishlistInfo.name} toast={toast} />
              <FollowButton
                isWishlistOwner={isWishlistOwner || state.status !== "ready"}
                isFollowing={isFollowing}
                userId={userId}
                wishlistId={wishlistId}
                setIsFollowing={setIsFollowing}
                toast={toast}
              />
            </>
          }
        />
      )}
      <WishlistItemsTable
        canEditWishlist={isWishlistOwner}
        isLoading={state.status === "loading"}
        items={items}
        onItemsChange={setItems}
        userId={userId}
        wishlistId={wishlistId}
      />
    </>
  );
};
