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
          placeholder: "",
          inputMode: undefined,
        },
        {
          label: "Image URL",
          id: "image",
          field: "image",
          type: "text",
          placeholder: "Optional, https://…",
          inputMode: "url" as const,
        },
        {
          label: "Average Price",
          id: "averagePrice",
          field: "price",
          type: "number",
          placeholder: "Optional",
          inputMode: "decimal" as const,
        },
        {
          label: "Link",
          id: "link",
          field: "link",
          type: "text",
          placeholder: "Optional, where to buy it",
          inputMode: "url" as const,
        },
      ].map(({ label, id, field, type, placeholder, inputMode }) => (
        <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1" key={id}>
          <Label htmlFor={id} className="text-right">
            {label}
          </Label>
          <Input
            id={id}
            type={type}
            placeholder={placeholder}
            inputMode={inputMode}
            min={type === "number" ? 0 : undefined}
            step={type === "number" ? "any" : undefined}
            aria-invalid={errors[field] ? true : undefined}
            aria-describedby={errors[field] ? `${id}-error` : undefined}
            {...register(field)}
            onChange={(e) => { handleItemChange({ [field]: e.target.value }); }}
            className={`col-span-3 ${errors[field] ? "border-destructive" : ""}`}
          />
          <span
            id={`${id}-error`}
            role={errors[field] ? "alert" : undefined}
            className="col-start-2 col-span-3 text-destructive text-xs"
          >
            {errors[field]?.message as string}
          </span>
        </div>
      ))}
      <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
        <Label htmlFor="itemPublic" className="text-right">
          Public
        </Label>
        <Switch
          id="itemPublic"
          checked={publicField}
          onCheckedChange={() => { handleItemChange({ public: !publicField }); }}
        />
      </div>
    </>
  );
};
