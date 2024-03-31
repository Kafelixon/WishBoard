import { Card } from "@/components/ui/card";
import StyledStack from "@/components/ui/StyledStack";

export const LandingPage = () => {
  return (
    <StyledStack>
      <Card className="p-5 backdrop-blur-[10px] items-center max-w-[60vw] flex-grow glass">
        <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl text-center p-4">
          Effortlessly Craft & Share Your Dream Wishlist
        </h1>
        <p className="leading-7 text-center pt-2 pb-4">
          At WishBoard, we believe in the power of simplicity. That's why we've
          created a platform where you can effortlessly curate a wishlist that
          reflects your desires, needs, and dreams - all with a few clicks. Say
          goodbye to the hassle and hello to a new world of seamless sharing.
        </p>
        <section className="mainDescription p-4 pb-8">
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            Create, Share, and Stay up-to-date with Ease
          </h3>
          <ul className="leading-7 space-y-6 [&:not(:first-child)]:mt-6">
            <li>
              <b>Effortless Wishlist Creation:</b> With WishBoard, your wishlist
              comes to life. Add items with text, photos, links, and an average
              price. Crafting your dream list has never been easier.
            </li>
            <li>
              <b>Privacy on Your Terms:</b> You have full control. Mark items as
              private, and they stay just between us. Share your list with the
              world or keep your wishes intimate. You decide.
            </li>
            <li>
              <b>Hassle-Free Sharing:</b> Share your wishlist with anyone, no
              strings attached. Viewers don't need an account to see your
              dreams. Just a link, and they're in.
            </li>
            <li>
              <b>Stay Connected: </b>Follow your friends and loved ones. Be the
              first to know when their wishes evolve. WishLinker keeps you
              connected, discreetly notifying you of any changes.
            </li>
            <li>
              <b>Join Our Community: </b>While only registered users can create
              wishlists, everyone is invited to the party. Sign up, follow, and
              be part of a community that celebrates aspirations.
            </li>
          </ul>
        </section>
        <section className="aboutSection p-4 pb-8">
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            WishBoard: Where Wishes Come Alive
          </h3>
          <p className="leading-7 space-y-4 [&:not(:first-child)]:mt-6">
            Dive into a world where wishing is as easy as dreaming. Whether for
            birthdays, weddings, or those just-because moments, WishLinker is
            your companion in celebrating life's milestones and moments. Start
            today. Create your wishlist, share your dreams, and explore the
            endless possibilities that await.
          </p>
        </section>
        <section className="supportSection p-4">
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            We're Here to Support You
          </h3>
          <p className="leading-7 space-y-4 [&:not(:first-child)]:mt-6">
            Got questions or need assistance? Our dedicated support team is here
            to ensure your wishlisting is smooth and enjoyable. Reach out to me
            on linkedin at&nbsp;
            <a href="https://www.linkedin.com/in/piotrszkafel/">
              www.linkedin.com/in/piotrszkafel
            </a>
            .
          </p>
        </section>
      </Card>
    </StyledStack>
  );
};
