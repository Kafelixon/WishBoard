import { FC } from "react";
import { useFormContext } from "react-hook-form";
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
}) => {
  const {
    register,
    formState: { errors },
    watch,
  } = useFormContext();
  const publicField = watch("public", currentItem.public) as boolean;

  return (
    <>
      {[
        {
          label: "Product Name",
          id: "productName",
          field: "name",
          type: "text",
        },
        { label: "Image URL", id: "image", field: "image", type: "text" },
        {
          label: "Average Price",
          id: "averagePrice",
          field: "price",
          type: "number",
        },
        { label: "Link", id: "link", field: "link", type: "text" },
      ].map(({ label, id, field, type }) => (
        <div className="grid grid-cols-4 items-center gap-4 h-10" key={id}>
          <Label htmlFor={id} className="text-right">
            {label}
          </Label>
          <Input
            id={id}
            type={type}
            {...register(field)}
            onChange={(e) => handleItemChange({ [field]: e.target.value })}
            className="col-span-3"
          />
          <span className="text-red-600">
            {errors[field]?.message as string}
          </span>
        </div>
      ))}
      <div className="grid grid-cols-4 items-center gap-4 h-10">
        <Label htmlFor="itemPublic" className="text-right">
          Public
        </Label>
        <Switch
          id="itemPublic"
          checked={publicField}
          onCheckedChange={() => handleItemChange({ public: !publicField })}
        />
      </div>
    </>
  );
};
