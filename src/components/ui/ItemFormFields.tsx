import { FC, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { TKey } from "@/i18n";
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

const FIELDS: {
  label: TKey;
  id: string;
  field: string;
  type: string;
  placeholder: TKey;
  inputMode: "decimal" | "url" | undefined;
}[] = [
  {
    label: "itemForm.name",
    id: "productName",
    field: "name",
    type: "text",
    placeholder: "itemForm.namePlaceholder",
    inputMode: undefined,
  },
  {
    label: "itemForm.price",
    id: "averagePrice",
    field: "price",
    type: "number",
    placeholder: "itemForm.optional",
    inputMode: "decimal",
  },
  {
    label: "itemForm.link",
    id: "link",
    field: "link",
    type: "text",
    placeholder: "itemForm.linkPlaceholder",
    inputMode: "url",
  },
  {
    label: "itemForm.image",
    id: "image",
    field: "image",
    type: "text",
    placeholder: "itemForm.imagePlaceholder",
    inputMode: "url",
  },
];

export const ItemFormFields: FC<ItemFormFieldsProps> = ({
  currentItem,
  handleItemChange,
}) => {
  const { t } = useTranslation();
  const {
    register,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useFormContext();
  const [fetching, setFetching] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<string | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  // What the last fetch overwrote, so it can be taken back.
  const [undoValues, setUndoValues] = useState<Partial<WishlistItem> | null>(null);

  /** Fills name and image from the product link where empty, and sets the price and currency. */
  const fetchDetails = async () => {
    const link = normalizeUrl(getValues("link") as string);
    if (!link || !isValidWebUrl(link)) {
      setFetchMessage(t("itemForm.fetchNeedsLink"));
      setFetchFailed(true);
      return;
    }
    setFetching(true);
    setFetchMessage(null);
    setFetchFailed(false);
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
          ? t("itemForm.fetchFilled")
          : t("itemForm.fetchNothing"),
      );
    } catch (error) {
      setFetchMessage(error instanceof Error ? error.message : t("itemForm.fetchFailed"));
      setFetchFailed(true);
    } finally {
      setFetching(false);
    }
  };
  const currency = (watch("currency", currentItem.currency) as string | undefined) ?? DEFAULT_CURRENCY;
  const publicField = watch("public", currentItem.public) as boolean;
  const mostWantedField = (watch("mostWanted", currentItem.mostWanted) as boolean | undefined) ?? false;

  const undoFetch = () => {
    if (!undoValues) return;
    for (const [key, value] of Object.entries(undoValues)) {
      setValue(key, value, { shouldDirty: true, shouldValidate: true });
    }
    handleItemChange(undoValues);
    setUndoValues(null);
    setFetchMessage(t("itemForm.undone"));
  };

  return (
    <>
      {FIELDS.map(({ label, id, field, type, placeholder, inputMode }) => (
        <div className="grid gap-2" key={id}>
          <Label htmlFor={id}>{t(label)}</Label>
          <div className="relative">
            <Input
              id={id}
              type={type}
              placeholder={t(placeholder)}
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
                aria-label={t("itemForm.currency")}
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
                {t("itemForm.fetch")}
              </Button>
              {fetchMessage && (
                <p
                  role={fetchFailed ? "alert" : "status"}
                  className={`text-sm ${fetchFailed ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {fetchMessage}
                </p>
              )}
              {undoValues && (
                <Button type="button" variant="ghost" size="sm" onClick={undoFetch}>
                  {t("itemForm.undo")}
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
      <div className="grid gap-2">
        <Label htmlFor="itemNotes">{t("itemForm.notes")}</Label>
        <textarea
          id="itemNotes"
          rows={2}
          maxLength={500}
          placeholder={t("itemForm.notesPlaceholder")}
          aria-invalid={errors.notes ? true : undefined}
          aria-describedby={errors.notes ? "itemNotes-error" : undefined}
          {...register("notes")}
          onChange={(e) => { handleItemChange({ notes: e.target.value }); }}
          className="flex w-full resize-y rounded-xl border border-input bg-card px-3.5 py-2.5 text-base text-foreground shadow-[inset_0_1px_2px_hsl(28_30%_20%/0.05)] transition-colors placeholder:text-muted-foreground/70 hover:border-foreground/30 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive"
        />
        {errors.notes && (
          <p id="itemNotes-error" role="alert" className="text-sm text-destructive">
            {errors.notes.message as string}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="itemQuantity">{t("itemForm.quantity")}</Label>
        <Input
          id="itemQuantity"
          type="number"
          inputMode="numeric"
          min={1}
          max={99}
          step={1}
          className="w-28"
          aria-invalid={errors.quantity ? true : undefined}
          aria-describedby={errors.quantity ? "itemQuantity-error" : undefined}
          {...register("quantity")}
          onChange={(e) => {
            // NaN while the field is empty; validation and saving treat that as 1.
            handleItemChange({ quantity: e.target.valueAsNumber });
          }}
        />
        {errors.quantity && (
          <p id="itemQuantity-error" role="alert" className="text-sm text-destructive">
            {errors.quantity.message as string}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/50 px-4 py-3">
        <div className="space-y-0.5">
          <Label htmlFor="itemMostWanted">{t("itemForm.mostWanted")}</Label>
          <p className="text-sm text-muted-foreground">
            {t("itemForm.mostWantedHint")}
          </p>
        </div>
        <Switch
          id="itemMostWanted"
          checked={mostWantedField}
          onCheckedChange={() => { handleItemChange({ mostWanted: !mostWantedField }); }}
        />
      </div>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/50 px-4 py-3">
        <div className="space-y-0.5">
          <Label htmlFor="itemPublic">{t("itemForm.public")}</Label>
          <p className="text-sm text-muted-foreground">
            {t("itemForm.publicHint")}
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
