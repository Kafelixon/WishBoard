import { FormControl, Button, Input, Stack } from "@mui/joy";
import Sheet from "@mui/joy/Sheet";
import { WishlistItem } from "../src/types";
import { useState } from "react";
import { addItemToWishlist } from "../data/wishlistHandlers";

interface WishlistTableProps {
  response: {
    data: WishlistItem[] | null;
  };
  isAddMode?: boolean;
  onCancelAddMode?: () => void;
  wishlistId?: string;
}

export default function WishlistTable({
  response,
  isAddMode,
  onCancelAddMode,
  wishlistId,
}: WishlistTableProps) {
  const [productName, setProductName] = useState("");
  const [averagePrice, setAveragePrice] = useState("");
  const [link, setLink] = useState("");

  const cards = response.data
    ? [...response.data]
        .sort(
          (a, b) =>
            parseFloat(a.price.replace("~", "")) -
            parseFloat(b.price.replace("~", "")),
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
    try {
      addItemToWishlist(userId, wishlistId, {
        name: productName,
        price: averagePrice,
        link: link,
        image: "https://via.placeholder.com/150",
      });
    } catch (error: any) {
      console.error("Error adding new item:", error);
      alert(error.message);
    }
  };

  const cancelAddMode = () => {
    if (onCancelAddMode) onCancelAddMode();
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
          <Stack direction="row" justifyContent="space-between">
            <Button color="primary" onClick={cancelAddMode}>
              Cancel
            </Button>
            <Button color="primary" onClick={addListing}>
              Add listing
            </Button>
          </Stack>
        </FormControl>
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
      {isAddMode && addCard}
      {cards}
    </Sheet>
  );
}
