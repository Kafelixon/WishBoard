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

const FIELDS = [
  {
    label: "Name",
    id: "productName",
    field: "name",
    type: "text",
    placeholder: "Linen throw blanket",
    inputMode: undefined,
  },
  {
    label: "Average price",
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
  {
    label: "Image URL",
    id: "image",
    field: "image",
    type: "text",
    placeholder: "Optional, https://…",
    inputMode: "url" as const,
  },
];

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
      {FIELDS.map(({ label, id, field, type, placeholder, inputMode }) => (
        <div className="grid gap-2" key={id}>
          <Label htmlFor={id}>{label}</Label>
          <div className="relative">
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
              className={type === "number" ? "pr-10" : undefined}
            />
            {type === "number" && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                zł
              </span>
            )}
          </div>
          {errors[field] && (
            <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
              {errors[field].message as string}
            </p>
          )}
        </div>
      ))}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/50 px-4 py-3">
        <div className="space-y-0.5">
          <Label htmlFor="itemPublic">Public</Label>
          <p className="text-sm text-muted-foreground">
            Anyone with the link can see it. Turn off to keep it just for you.
          </p>
        </div>
        <Switch
          id="itemPublic"
          checked={publicField}
          onCheckedChange={() => { handleItemChange({ public: !publicField }); }}
        />
      </div>
    </>
  );
};
