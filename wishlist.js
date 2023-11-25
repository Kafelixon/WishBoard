const wishlistContainer = document.getElementById("wishlist-container");

async function loadWishlist() {
  try {
    const response = await fetch("wishlist.json");
    const data = await response.json();
    createWishlistCards(data);
  } catch (error) {
    console.error("Error:", error);
  }
}

function createWishlistCards(wishlist) {
  wishlist.sort((a, b) => a.price.replace("~", "") - b.price.replace("~", ""));

  const cardsFragment = document.createDocumentFragment();

  wishlist.forEach((item) => {
    const card = document.createElement("div");
    card.classList.add("wishlist-card");

    const image = document.createElement("img");
    image.src = item.image;
    image.alt = "Product Image";
    card.appendChild(image);

    const info = document.createElement("div");
    info.classList.add("info");

    const name = document.createElement("h2");
    name.textContent = item.name;
    info.appendChild(name);

    const price = document.createElement("p");
    price.textContent = `Average Price: ${item.price} zł`;
    info.appendChild(price);

    const link = document.createElement("a");
    link.href = item.link;
    link.textContent = "Link";
    link.target = "_blank";
    info.appendChild(link);

    card.appendChild(info);
    cardsFragment.appendChild(card);
  });

  wishlistContainer.appendChild(cardsFragment);
}

loadWishlist();
