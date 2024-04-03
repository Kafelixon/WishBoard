import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchFollowedWishlists,
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

  if (!wishlistInfo) {
    return <div>Loading...</div>;
  }

  const FollowButton: React.FC = () => {
    if (isWishlistOwner || !userId) {
      return null;
    }
    void fetchFollowedWishlists(userId).then((wishlists) => {
      console.log("wishlists: ", wishlists);
    });
    console.log("isFollowing: ", isFollowing);

    if (isFollowing) {
      return (
        <Button
          onClick={() => {
            void unfollowWishlist(userId, wishlistId).then(() => {
              void isFollowingWishlist(userId, wishlistId).then(
                (isFollowing) => {
                  setIsFollowing(isFollowing);
                  if (!isFollowing) {
                    toast({
                      title: "You are no longer following this wishlist",
                    });
                  }
                }
              );
            });
          }}
        >
          Unfollow
        </Button>
      );
    }

    return (
      <Button
        onClick={() => {
          void followWishlist(userId, wishlistId).then(() => {
            void isFollowingWishlist(userId, wishlistId).then((isFollowing) => {
              setIsFollowing(isFollowing);
              if (isFollowing) {
                toast({ title: "You are now following this wishlist" });
              }
            });
          });
        }}
      >
        Follow
      </Button>
    );
  };

  return (
    <Card className="my-32 shadow-lg glass w-[95vw] md:w-[60vw] lg:w-[45vw]">
      <CardHeader className="h-22 pb-0">
        <CardTitle className="flex justify-between items-center">
          <div className="flex flex-col align-top">
            <h2 className="font-semibold">{wishlistInfo.wishlistName}</h2>
            {wishlistInfo.author && (
              <p className="text-gray-500 text-sm text-left">
                {wishlistInfo.author}
              </p>
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
