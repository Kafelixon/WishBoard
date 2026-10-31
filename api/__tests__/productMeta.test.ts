import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchPage, parseProductMeta } from "../_lib/productMeta.js";

const page = new URL("https://shop.example/p/1");

test("reads JSON-LD product data", () => {
  const html = `<script type="application/ld+json">{"@graph":[{"@type":"Product","name":"Lamp &amp; Co","image":["/a.jpg"],"offers":{"@type":"Offer","price":"49,90","priceCurrency":"eur"}}]}</script>`;
  assert.deepEqual(parseProductMeta(html, page), {
    name: "Lamp & Co",
    image: "https://shop.example/a.jpg",
    price: 49.9,
    currency: "EUR",
  });
});

test("falls back to Open Graph tags", () => {
  const html = `<title>Ignored</title><meta property="og:title" content="Mug"><meta property="og:image" content="https://cdn.example/m.png"><meta property="product:price:amount" content="12.5"><meta property="product:price:currency" content="PLN">`;
  assert.deepEqual(parseProductMeta(html, page), {
    name: "Mug",
    image: "https://cdn.example/m.png",
    price: 12.5,
    currency: "PLN",
  });
});

test("reads a product group's first variant offer", () => {
  const html = `<script type="application/ld+json">{"@type":"ProductGroup","name":"Printer","hasVariant":[{"@type":"Product","offers":{"@type":"Offer","priceCurrency":"EUR","price":599}}]}</script>`;
  assert.deepEqual(parseProductMeta(html, page), { name: "Printer", image: null, price: 599, currency: "EUR" });
});

test("returns nulls when nothing is found", () => {
  assert.deepEqual(parseProductMeta("<p>hi</p>", page), { name: null, image: null, price: null, currency: null });
});

test("refuses internal addresses", async () => {
  await assert.rejects(fetchPage("http://127.0.0.1/"));
  await assert.rejects(fetchPage("http://169.254.169.254/latest/meta-data"));
  await assert.rejects(fetchPage("file:///etc/passwd"));
});
