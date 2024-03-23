import { FormControl, Button, Input, Stack } from "@mui/joy";
import Sheet from "@mui/joy/Sheet";
import { WishlistItem } from "../src/types";
import { useEffect, useState } from "react";
import {
  addItemToWishlist,
  fetchWishlistItems,
} from "../data/wishlistHandlers";
import toast from "react-hot-toast";

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
          <div className="wishlist-card">
            <img src={item.image} alt="Product Image" />
            <div className="info">
              <h2>{item.name}</h2>
              <p>Average Price: {item.price} zł</p>
              <a href={item.link} target="_blank" rel="noopener noreferrer">
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
      toast.success("Item added successfully.");
      await cancelAddMode();
    } catch (error) {
      setIsAdding(false);
      console.error(error);
      toast.error("Failed to add item to wishlist.");
    }
  };

  const cancelAddMode = async () => {
    if (onCancelAddMode) onCancelAddMode();
    await fetchWishlistItems(wishlistId).then((data) => {
      if (data) setUserWishlist(data);
    });
  };

  const addCard = (
    <div className="wishlist-card">
      <img src="https://via.placeholder.com/150" alt="Product Image" />
      <div className="info">
        <FormControl sx={{ width: "100%", flexDirection: "column", gap: 1 }}>
          <Input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Product Name"
          />
          <Input
            type="number"
            value={averagePrice}
            onChange={(e) => setAveragePrice(e.target.value)}
            placeholder="Average Price"
          />
          <Input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Link"
          />
        </FormControl>

        <Stack direction="row" justifyContent="space-between">
          <Button color="primary" onClick={() => void cancelAddMode()}>
            Cancel
          </Button>
          <Button
            color="primary"
            loading={isAdding}
            onClick={() => void addListing()}
          >
            Add listing
          </Button>
        </Stack>
      </div>
    </div>
  );

  return (
    <Sheet
      sx={{
        borderRadius: "8px",
        "--TableCell-height": "40px",
        // the number is the amount of the header rows.
        "--TableHeader-height": "calc(1 * var(--TableCell-height))",
        maxHeight: "60vh",
        overflow: "auto",
        backgroundSize: "100% 40px",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "local, local, scroll, scroll",
        backgroundPosition:
          "0 var(--TableHeader-height), 0 100%, 0 var(--TableHeader-height), 0 100%",
        backgroundColor: "rgba(255, 255, 255, 0.4)", // semi-transparent white
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
        boxShadow: "0 8px 32px 0 rgba(31, 38, 31, 0.17)",
      }}
    >
      {isAddMode && userId && addCard}
      {isFetching ? "Loading..." : cards}
    </Sheet>
  );
}
