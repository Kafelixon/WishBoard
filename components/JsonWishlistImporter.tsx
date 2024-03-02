import React, { useState } from "react";
import { WishlistItem } from "../src/types";
import { addItemToWishlist } from "../data/wishlistHandlers";
import { useUserId } from "../data/common";

export const WishlistImport: React.FC = () => {
  const [jsonInput, setJsonInput] = useState<string>("");
  const [wishlistId, setWishlistId] = useState("");
  const { userId } = useUserId();

  const handleAddToWishlist = () => {
    try {
      const items = JSON.parse(jsonInput) as WishlistItem[];
      if (Array.isArray(items) && wishlistId && userId) {
        items.forEach((item: WishlistItem) => {
          void addItemToWishlist(userId, wishlistId, item);
        });
      }
    } catch (error) {
      console.error("Invalid JSON input");
    }
  };

  return (
    <div>
      <label htmlFor="jsonInput">JSON:</label>
      <input
        type="text"
        id="jsonInput"
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
      />

      <label htmlFor="wishlistItemId">Wishlist ID:</label>
      <input
        type="text"
        id="wishlistItemId"
        value={wishlistId}
        onChange={(e) => setWishlistId(e.target.value)}
      />

      <button onClick={handleAddToWishlist}>Add to Wishlist</button>
    </div>
  );
};
