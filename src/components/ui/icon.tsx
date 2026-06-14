import type { LucideProps } from "lucide-react";
import {
  toWishlistIconName,
  wishlistIcons,
} from "@/lib/wishlistIcons";
import type { WishlistIconName } from "@/lib/wishlistIcons";

interface IconProps extends Omit<LucideProps, "ref"> {
  name: WishlistIconName;
}

const Icon = ({ name, ...props }: IconProps) => {
  const LucideIcon = wishlistIcons[toWishlistIconName(name)];

  return <LucideIcon {...props} />;
};

export default Icon;
