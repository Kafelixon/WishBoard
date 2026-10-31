import type { LucideProps } from "lucide-react";
import {
  toWishlistIconName,
  wishlistIcons,
} from "@/lib/wishlistIcons";
import type { WishlistIconName } from "@/lib/wishlistIcons";
import { cn } from "@/lib/utils";

interface IconProps extends Omit<LucideProps, "ref"> {
  name: WishlistIconName;
}

const Icon = ({ name, ...props }: IconProps) => {
  const LucideIcon = wishlistIcons[toWishlistIconName(name)];

  return <LucideIcon {...props} />;
};

export default Icon;

interface WishlistIconBadgeProps {
  name: WishlistIconName;
  /** `#rrggbb`; falls back to the theme color. */
  color?: string;
  className?: string;
  iconClassName?: string;
}

/** A wishlist's icon on a tinted tile, in its chosen color. */
export const WishlistIconBadge = ({
  name,
  color,
  className,
  iconClassName = "size-6",
}: WishlistIconBadgeProps) => (
  <div
    className={cn(
      "flex size-12 shrink-0 items-center justify-center rounded-xl",
      !color && "bg-primary/10 text-primary",
      className,
    )}
    style={color ? { color, backgroundColor: `${color}1a` } : undefined}
  >
    <Icon name={name} className={iconClassName} aria-hidden="true" />
  </div>
);
