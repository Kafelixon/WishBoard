import { FollowedWishlists } from "@/components/ui/FollowedWishlists";
import { UserWishlists } from "@/components/ui/UserWishlists";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = {
  USER_WISHLISTS: 'userWishlists',
  FOLLOWED_WISHLISTS: 'followedWishlists',
};

export const UserWishlistsOverview: React.FC = () => {
  return (
    <Tabs defaultValue={TABS.USER_WISHLISTS} className="w-[400px]">
      <TabsList className="grid w-full grid-cols-2 glass">
        <TabsTrigger value={TABS.USER_WISHLISTS}>Your Wishlists</TabsTrigger>
        <TabsTrigger value={TABS.FOLLOWED_WISHLISTS}>Followed Wishlists</TabsTrigger>
      </TabsList>
      <TabsContent value={TABS.USER_WISHLISTS}>
        <UserWishlists />
      </TabsContent>
      <TabsContent value={TABS.FOLLOWED_WISHLISTS}>
        <FollowedWishlists />
      </TabsContent>
    </Tabs>
  );
};
