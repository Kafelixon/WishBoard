import { WishlistItem } from "@/lib/types";
import { useEffect, useState } from "react";
import { addItemToWishlist, fetchWishlistItems } from "@/lib/wishlistHandlers";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface WishlistItemsTableProps {
  isAddMode: boolean;
  onCancelAddMode: () => void;
  wishlistId: string;
  userId: string | null;
}

export default function WishlistItemsTable({
  isAddMode,
  onCancelAddMode,
  wishlistId,
  userId,
}: WishlistItemsTableProps) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [productName, setProductName] = useState("");
  const [averagePrice, setAveragePrice] = useState("");
  const [link, setLink] = useState("");
  const [userWishlist, setUserWishlist] = useState<WishlistItem[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (isAddMode) {
      setProductName("");
      setAveragePrice("");
      setLink("");
    }
  }, [isAddMode]);

  useEffect(() => {
    if (wishlistId) {
      void fetchWishlistItems(wishlistId).then((data) => {
        if (data) setUserWishlist(data);
        setIsFetching(false);
      });
    }
  }, [wishlistId]);

  const cards = userWishlist
    ? [...userWishlist]
        .sort(
          (a, b) =>
            parseFloat(a.price.replace("~", "")) -
            parseFloat(b.price.replace("~", ""))
        )
        .map((item) => (
          <div className="glass-fg flex items-center border pl-2.5 pr-5 py-2.5 rounded-lg border-solid border-gray-300">
            <img
              src={item.image}
              alt="Product Image"
              className="size-28 mr-2.5 object-cover bg-white border border-gray-300 rounded-lg"
            />
            <div className="flex flex-col">
              <h2 className="font-semibold mt-0 mb-1 mx-0">{item.name}</h2>
              <p className=" text-gray-500 mt-0 mb-[5px] mx-0">
                Average Price: {item.price} zł
              </p>
              <a
                className="no-underline text-blue-600"
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Link
              </a>
            </div>
          </div>
        ))
    : [];

  const addListing = async () => {
    if (!userId || !wishlistId) {
      console.error("User ID or Wishlist ID is missing");
      return;
    }
    try {
      setIsAdding(true);
      await addItemToWishlist(userId, wishlistId, {
        name: productName.trim(),
        price: averagePrice,
        link: link,
        image: "https://via.placeholder.com/150",
      });
      setIsAdding(false);
      toast({ title: "Item added successfully." });
      await cancelAddMode();
    } catch (error) {
      setIsAdding(false);
      console.error(error);
      toast({
        title: "Failed to add item to wishlist.",
        variant: "destructive",
      });
    }
  };

  const cancelAddMode = async () => {
    if (onCancelAddMode) onCancelAddMode();
    await fetchWishlistItems(wishlistId).then((data) => {
      if (data) setUserWishlist(data);
    });
  };

  const addCard = (
    <div className="glass-fg flex items-center justify-between border pl-2.5 pr-5 py-2.5 rounded-lg border-solid border-gray-300">
      <div className="size-28 mr-2.5 bg-gray-300 border border-gray-300 rounded-lg"></div>
      <div className="flex-grow">
        <form className="flex flex-col gap-1">
          <Input
            type="text"
            className="h-8"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Product Name"
          />
          <Input
            type="number"
            className="h-8"
            value={averagePrice}
            onChange={(e) => setAveragePrice(e.target.value)}
            placeholder="Average Price"
          />
          <Input
            type="text"
            className="h-8"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Link"
          />
        </form>
      </div>

      <div className="flex flex-grow flex-col justify-between min-h-full">
        <Button color="primary" onClick={() => void cancelAddMode()}>
          Cancel
        </Button>
        <Button color="primary" onClick={() => void addListing()}>
          {isAdding ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Add listing"
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div
      className="flex flex-col gap-2.5"
    >
      {isAddMode && userId && addCard}
      {isFetching ? "Loading..." : cards}
    </div>
  );
}
