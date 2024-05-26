import { FC } from "react";
import { WishlistItem } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "./switch";

interface ItemFormFieldsProps {
  currentItem: WishlistItem;
  handleItemChange: (changes: Partial<WishlistItem>) => void;
}

export const ItemFormFields: FC<ItemFormFieldsProps> = ({
  currentItem,
  handleItemChange,
}) => (
  <>
    {[
      {
        label: "Product Name",
        id: "productName",
        value: currentItem.name,
        type: "text",
        field: "name",
      },
      {
        label: "Image URL",
        id: "image",
        value: currentItem.image,
        type: "text",
        field: "image",
      },
      {
        label: "Average Price",
        id: "averagePrice",
        value: currentItem.price,
        type: "number",
        field: "price",
      },
      {
        label: "Link",
        id: "link",
        value: currentItem.link,
        type: "text",
        field: "link",
      },
    ].map(({ label, id, value, type, field }) => (
      <div className="grid grid-cols-4 items-center gap-4 h-10" key={id}>
        <Label htmlFor={id} className="text-right">
          {label}
        </Label>
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) =>
            handleItemChange({
              [field]:
                type === "number" ? parseFloat(e.target.value) : e.target.value,
            })
          }
          className="col-span-3"
        />
      </div>
    ))}
    <div className="grid grid-cols-4 items-center gap-4 h-10">
      <Label htmlFor="itemPublic" className="text-right">
        Public
      </Label>
      <Switch
        id="itemPublic"
        checked={currentItem.public}
        onCheckedChange={() =>
          handleItemChange({ public: !currentItem.public })
        }
      />
    </div>
  </>
);
