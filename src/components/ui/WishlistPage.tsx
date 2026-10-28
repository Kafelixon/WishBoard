import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FollowStateChanger,
  fetchWishlistView,
  followWishlist,
  isFollowingWishlist,
  unfollowWishlist,
  type WishlistView,
} from "@/lib/wishlistHandlers";
import { NotFound } from "@/components/ui/NotFound";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WishlistItemsTable from "@/components/ui/WishlistTable";
import { useUserId } from "@/lib/common";
import { WishlistItem } from "@/lib/types";
import { Button } from "./button";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "./skeleton";
import { Share2 } from "lucide-react";
import { usePageTitle } from "@/lib/usePageTitle";

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
      "You are now following this wishlist",
      "Failed to follow this wishlist",
    );
  };

  const handleUnfollow = () => {
    handleFollowChange(
      unfollowWishlist,
      false,
      "You are no longer following this wishlist",
      "Failed to unfollow this wishlist",
    );
  };

  if (isWishlistOwner || !userId) {
    return null;
  }

  return (
    <Button onClick={isFollowing ? handleUnfollow : handleFollow}>
      {isFollowing ? "Unfollow" : "Follow"}
    </Button>
  );
}

function ShareButton({
  wishlistId,
  toast,
}: {
  wishlistId: string;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const handleShare = () => {
    const url = `${window.location.origin}/wishlist/${wishlistId}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast({ title: "Link copied", description: "Anyone with it can view the public items." });
      })
      .catch(() => {
        toast({
          title: "Could not copy the link",
          description: "Copy the address from your browser's address bar instead.",
          variant: "destructive",
        });
      });
  };

  return (
    <Button variant="outline" onClick={handleShare} className="gap-1.5">
      <Share2 className="size-4" aria-hidden="true" />
      Share
    </Button>
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
    wishlistInfo?.name ?? (state.status === "missing" ? "Wishlist not found" : "Wishlist");
  usePageTitle(pageTitle);

  if (state.status === "missing") {
    return (
      <NotFound
        title="Wishlist not found"
        message="This wishlist does not exist or has been deleted."
      />
    );
  }
  if (state.status === "error") {
    return (
      <NotFound
        title="Could not load wishlist"
        message="Something went wrong while loading this wishlist. Please try again."
      />
    );
  }


  return (
    <Card className="glass w-full md:w-[60vw] lg:w-[45vw] m-auto">
      <CardHeader className="h-22 pb-0">
        <CardTitle className="flex justify-between items-center">
          <div className="flex flex-col gap-1 align-top">
            {!wishlistInfo ? (
              <>
                <Skeleton className="w-40 h-4 mb-2" />
                <Skeleton className="w-10 h-4" />
              </>
            ) : (
              <>
                <h1 className="font-display text-2xl font-semibold">
                  {wishlistInfo.name}
                </h1>
                {wishlistInfo.author && (
                  <p className="text-muted-foreground text-sm text-left">
                    {wishlistInfo.author}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {wishlistInfo && (
              <ShareButton wishlistId={wishlistId} toast={toast} />
            )}
            <FollowButton
              isWishlistOwner={isWishlistOwner || state.status !== "ready"}
              isFollowing={isFollowing}
              userId={userId}
              wishlistId={wishlistId}
              setIsFollowing={setIsFollowing}
              toast={toast}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <WishlistItemsTable
          canEditWishlist={isWishlistOwner}
          isLoading={state.status === "loading"}
          items={items}
          onItemsChange={setItems}
          userId={userId}
          wishlistId={wishlistId}
        />
      </CardContent>
    </Card>
  );
};
