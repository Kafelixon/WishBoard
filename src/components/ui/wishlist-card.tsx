import React from "react";
import { Wishlist } from "@/lib/types";
import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

type WishlistProps = {
  wishlist: Wishlist;
};

export const WishlistCard: React.FC<WishlistProps> = ({ wishlist }) => {
  const navigate = useNavigate();

  return (
    <div
      className="space-y-1 cursor-pointer"
      onClick={() => navigate(`/wishlist/${wishlist.id}`)}
    >
      <div className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-100">
        <div className="flex items-center space-x-3">
          <Icon name={wishlist.icon} className="w-6 h-6" />
          <div>
            <p className="font-semibold">{wishlist.name}</p>
            <p className="text-gray-500 text-sm text-left">{wishlist.author}</p>
          </div>
        </div>
        <div>
          <p className="text-gray-400 text-sm">
            {new Date(wishlist.updateTimestamp).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export const WishlistCardSkeleton: React.FC = () => (
  <div className="space-y-1">
    <div className="flex items-center justify-between p-5 rounded-lg">
      <div className="flex items-center space-x-3">
        <Skeleton className="size-9" />
        <div>
          <Skeleton className="w-40 h-4 mb-2" />
          <Skeleton className="w-10 h-3" />
        </div>
      </div>
      <div>
        <Skeleton className="w-10 h-3" />
      </div>
    </div>
  </div>
);
