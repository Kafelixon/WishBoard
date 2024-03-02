import { FollowedWishlists } from "./FollowedWishlists";
import StyledCard from "./StyledCard";
import StyledStack from "./StyledStack";
import { UserWishlists } from "./UserWishlists";

export const UserWishlistsOverview: React.FC = () => {
  return (
    <StyledStack>
      <StyledCard sx={{ display: "grid", gap: "1rem" }}>
        <FollowedWishlists />
        <UserWishlists />
      </StyledCard>
    </StyledStack>
  );
};
