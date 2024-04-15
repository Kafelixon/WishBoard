import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FollowStateChanger,
  fetchWishlistById,
  followWishlist,
  isFollowingWishlist,
  isOwnerOfWishlist,
  unfollowWishlist,
  wishlistExists,
} from "@/lib/wishlistHandlers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WishlistItemsTable from "@/components/ui/WishlistTable";
import { useUserId } from "@/lib/common";
import { Wishlist } from "@/lib/types";
import { Button } from "./button";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "./skeleton";

export const WishlistPage: React.FC = () => {
  const { wishlistId: paramId } = useParams();
  const [wishlistId, setWishlistId] = useState<string | null>(paramId || null);
  const [isWishlistOwner, setIsWishlistOwner] = useState<boolean>(false);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [wishlistInfo, setWishlistInfo] = useState<Wishlist | null>(null);
  const { toast } = useToast();
  const userId = useUserId();

  useEffect(() => {
    if (userId && wishlistId) {
      void wishlistExists(wishlistId).then((exists) => {
        if (!exists) {
          setWishlistId(null);
        }
      });
      if (wishlistId) {
        void isOwnerOfWishlist(userId, wishlistId).then((isOwner) => {
          setIsWishlistOwner(isOwner);
        });
        void isFollowingWishlist(userId, wishlistId).then((isFollowing) => {
          setIsFollowing(isFollowing);
        });
      }
    }
  }, [userId, wishlistId]);

  useEffect(() => {
    if (wishlistId) {
      void fetchWishlistById(wishlistId).then((info) => {
        setWishlistInfo(info);
      });
    }
  }, [wishlistId]);

  if (!wishlistId) {
    return <div>Wishlist not found</div>;
  }

  const FollowButton: React.FC = () => {
    const handleFollowChange = (
      followAction: FollowStateChanger,
      successMessage: string,
      errorMessage: string
    ) => {
      followAction(userId, wishlistId)
        .then(() => {
          return isFollowingWishlist(userId, wishlistId);
        })
        .then((following) => {
          setIsFollowing(following);
          toast({ title: successMessage });
        })
        .catch(() => {
          toast({ title: errorMessage });
        });
    };

    const handleFollow = () =>
      handleFollowChange(
        followWishlist,
        "You are now following this wishlist",
        "Failed to follow this wishlist"
      );

    const handleUnfollow = () =>
      handleFollowChange(
        unfollowWishlist,
        "You are no longer following this wishlist",
        "Failed to unfollow this wishlist"
      );

    if (isWishlistOwner || !userId) {
      return null;
    }
    
    return (
      <Button onClick={isFollowing ? handleUnfollow : handleFollow}>
        {isFollowing ? "Unfollow" : "Follow"}
      </Button>
    );
  };

  return (
    <Card className="shadow-lg glass w-full md:w-[60vw] lg:w-[45vw] m-auto">
      <CardHeader className="h-22 pb-0">
        <CardTitle className="flex justify-between items-center">
          <div className="flex flex-col align-top">
            {!wishlistInfo ? (
              <>
                <Skeleton className="w-40 h-4 mb-2" />
                <Skeleton className="w-10 h-4" />
              </>
            ) : (
              <>
                <h2 className="font-semibold">{wishlistInfo.wishlistName}</h2>
                {wishlistInfo.author && (
                  <p className="text-gray-500 text-sm text-left">
                    {wishlistInfo.author}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="flex items-center">
            <FollowButton />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 md:p-5">
        <WishlistItemsTable
          canEditWishlist={isWishlistOwner}
          userId={userId}
          wishlistId={wishlistId}
        />
      </CardContent>
    </Card>
  );
};
