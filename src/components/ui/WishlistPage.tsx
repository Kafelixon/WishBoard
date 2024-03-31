import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchWishlistAuthor,
  fetchWishlistName,
  isUserWishlistOwner,
} from "@/lib/wishlistHandlers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WishlistItemsTable from "@/components/ui/WishlistTable";
import { useUserId } from "@/lib/common";
import { Button } from "@/components/ui/button";

export const WishlistPage: React.FC = () => {
  const { wishlistId } = useParams();
  const [isAddMode, setIsAddMode] = useState<boolean>(false);
  const [isWishlistOwner, setIsWishlistOwner] = useState<boolean>(false);
  const [wishlistName, setWishlistName] = useState<string>("");
  const [wishlistAuthor, setWishlistAuthor] = useState<string>("");
  const userId = useUserId();

  useEffect(() => {
    if (userId && wishlistId) {
      void isUserWishlistOwner(userId, wishlistId).then((isOwner) => {
        setIsWishlistOwner(isOwner);
      });
    }
  }, [userId, wishlistId]);

  useEffect(() => {
    if (wishlistId) {
      void fetchWishlistName(wishlistId).then((name) => {
        setWishlistName(name);
      });
      void fetchWishlistAuthor(wishlistId).then((author) => {
        setWishlistAuthor(author);
      });
    }
  }, [wishlistId]);

  if (!wishlistId) {
    return <div>Wishlist not found</div>;
  }

  return (
    <Card className="my-32 shadow-lg glass w-[95vw] md:w-[60vw] lg:w-[45vw]">
      <CardHeader className="h-22">
        <CardTitle className="h-10 flex justify-between items-center">
          <div className="flex flex-col align-top">
            <h2 className="font-semibold mb-0">{wishlistName}</h2>
            {wishlistAuthor && (
              <p className="text-gray-500 text-sm text-left">
                {wishlistAuthor}
              </p>
            )}
          </div>
          {!isAddMode && userId && isWishlistOwner && (
            <div className="flex flex-row gap-1 pl-5">
              <Button
                onClick={() => {
                  setIsAddMode(true);
                }}
              >
                Add new
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 md:p-5">
        <WishlistItemsTable
          isAddMode={isAddMode}
          onCancelAddMode={() => {
            setIsAddMode(false);
          }}
          userId={userId}
          wishlistId={wishlistId}
        />
      </CardContent>
    </Card>
    // <StyledStack>
    //   <Card>
    //     <div className="flex flex-row justify-between items-center w-full px-2">
    //       <div className="flex flex-col align-top">
    //         <h2 className="font-semibold mb-0">{wishlistName}</h2>
    // {wishlistAuthor && (
    //   <p className="text-gray-500 text-sm text-left">
    //     {wishlistAuthor}
    //   </p>
    // )}
    //       </div>
    //       {!isAddMode && userId && isWishlistOwner && (
    //         <div className="flex flex-row gap-1 pl-5">
    //           <Button onClick={handleAddNewListing}>Add new</Button>
    //         </div>
    //       )}
    //     </div>
    //     <WishlistItemsTable
    //       isAddMode={isAddMode}
    //       onCancelAddMode={cancelAddMode}
    //       userId={userId}
    //       wishlistId={wishlistId}
    //     />
    //   </Card>
    // </StyledStack>
  );
};
