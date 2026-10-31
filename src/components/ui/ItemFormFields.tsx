import { FC, useState } from "react";
import { useFormContext } from "react-hook-form";
import { WishlistItem } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "./switch";
import { Loader2 } from "lucide-react";
import { fetchProductMeta } from "@/lib/wishlistHandlers";
import { isValidWebUrl, normalizeUrl } from "@/lib/url";
import { DEFAULT_CURRENCY, currencyOptions } from "@/lib/currency";

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
    setValue,
    getValues,
  } = useFormContext();
  const [fetching, setFetching] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<string | null>(null);
  // What the last fetch overwrote, so it can be taken back.
  const [undoValues, setUndoValues] = useState<Partial<WishlistItem> | null>(null);

  /** Fills name and image from the product link where empty, and sets the price and currency. */
  const fetchDetails = async () => {
    const link = normalizeUrl(getValues("link") as string);
    if (!link || !isValidWebUrl(link)) {
      setFetchMessage("Add a valid link first.");
      return;
    }
    setFetching(true);
    setFetchMessage(null);
    setUndoValues(null);
    try {
      const meta = await fetchProductMeta(link);
      const changes: Partial<WishlistItem> = {};
      if (meta.name && !(getValues("name") as string)) changes.name = meta.name;
      if (meta.image && !(getValues("image") as string)) changes.image = meta.image;
      // The shop's price replaces any typed one (Undo brings it back); name and image only fill gaps.
      if (meta.price !== null) {
        changes.price = meta.price;
        // The price is only meaningful in the currency the shop quoted it in.
        if (meta.currency) changes.currency = meta.currency;
      }
      const previous: Record<string, unknown> = {};
      for (const key of Object.keys(changes)) previous[key] = getValues(key);
      for (const [key, value] of Object.entries(changes)) {
        setValue(key, value, { shouldDirty: true, shouldValidate: true });
      }
      handleItemChange(changes);
      setUndoValues(Object.keys(changes).length > 0 ? (previous) : null);
      setFetchMessage(
        Object.keys(changes).length > 0
          ? "Filled in what we could find."
          : "Nothing new found on that page.",
      );
    } catch (error) {
      setFetchMessage(error instanceof Error ? error.message : "Couldn't fetch details.");
    } finally {
      setFetching(false);
    }
  };
  const currency = (watch("currency", currentItem.currency) as string | undefined) ?? DEFAULT_CURRENCY;
  const publicField = watch("public", currentItem.public) as boolean;

  const undoFetch = () => {
    if (!undoValues) return;
    for (const [key, value] of Object.entries(undoValues)) {
      setValue(key, value, { shouldDirty: true, shouldValidate: true });
    }
    handleItemChange(undoValues);
    setUndoValues(null);
    setFetchMessage("Put your earlier values back.");
  };

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
              className={type === "number" ? "pr-20" : undefined}
            />
            {type === "number" && (
              <select
                aria-label="Currency"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-transparent py-1 pl-1 text-sm text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                {...register("currency")}
                onChange={(e) => { handleItemChange({ currency: e.target.value }); }}
              >
                {currencyOptions(currency).map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            )}
          </div>
          {errors[field] && (
            <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
              {errors[field].message as string}
            </p>
          )}
          {field === "link" && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={fetching}
                onClick={() => void fetchDetails()}
              >
                {fetching && <Loader2 className="animate-spin" aria-hidden="true" />}
                Fetch details from link
              </Button>
              {fetchMessage && (
                <p role="status" className="text-sm text-muted-foreground">
                  {fetchMessage}
                </p>
              )}
              {undoValues && (
                <Button type="button" variant="ghost" size="sm" onClick={undoFetch}>
                  Undo
                </Button>
              )}
            </div>
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
