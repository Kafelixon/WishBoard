import { Typography } from "@mui/joy";
import StyledCard from "../components/StyledCard";
import StyledStack from "./StyledStack";

export const LandingPage = () => {
  return (
    <StyledStack>
      <StyledCard sx={{ padding: 5 }}>
        <Typography
          level="h1"
          fontWeight="xl"
          textAlign="center"
          sx={{ my: 1 }}
        >
          Minimal Wishlist
        </Typography>
        <section className="mainDescription">
          <h2>Create and share wishlists easily</h2>
          <p>
            Create a wishlist and share it with your friends and family. They
            can mark items as reserved or bought, so you don't get the same
            present twice.
          </p>
        </section>
        <section className="supportSection">
          <h2>We're Here to Support You</h2>
          <p>
            Got questions or need assistance? Our dedicated support team is here
            to ensure your wishlisting is smooth and enjoyable. Reach out to me
            on linkedin at&nbsp;
            <a href="https://www.linkedin.com/in/piotrszkafel/">
              www.linkedin.com/in/piotrszkafel
            </a>
            .
          </p>
        </section>
      </StyledCard>
    </StyledStack>
  );
};
