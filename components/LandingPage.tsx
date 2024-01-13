import { Typography, Stack } from "@mui/joy";
import StyledCard from "../components/StyledCard";

export const LandingPage = () => {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 1, sm: 2, md: 4, pt: 7 }}
      marginX={{ xs: 10, sm: 20, md: 50, pt: 100 }}
      justifyContent="center"
      alignItems="center"
      mt={12}
    >
      <StyledCard>
        <Typography
          level="h1"
          fontWeight="xl"
          textAlign="center"
          sx={{ mb: 4, mt: 1 }}
        >
          Simple Wishlist
        </Typography>
        <div style={{}}>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
            euismod, sapien vel bibendum bibendum, elit sapien bibendum sapien,
            vel bibendum sapien elit sed sapien. Sed euismod, sapien vel
            bibendum bibendum, elit sapien bibendum sapien, vel bibendum sapien
            elit sed sapien.
          </p>
          <p>
            Nullam euismod, sapien vel bibendum bibendum, elit sapien bibendum
            sapien, vel bibendum sapien elit sed sapien. Sed euismod, sapien vel
            bibendum bibendum, elit sapien bibendum sapien, vel bibendum sapien
            elit sed sapien. Sed euismod, sapien vel bibendum bibendum, elit
            sapien bibendum sapien, vel bibendum sapien elit sed sapien.
          </p>
          <p>
            Etiam euismod, sapien vel bibendum bibendum, elit sapien bibendum
            sapien, vel bibendum sapien elit sed sapien. Sed euismod, sapien vel
            bibendum bibendum, elit sapien bibendum sapien, vel bibendum sapien
            elit sed sapien. Sed euismod, sapien vel bibendum bibendum, elit
            sapien bibendum sapien, vel bibendum sapien elit sed sapien.
          </p>
        </div>
      </StyledCard>
    </Stack>
  );
};
