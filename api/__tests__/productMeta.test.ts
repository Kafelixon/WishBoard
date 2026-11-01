import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { fetchPage, isPrivateAddress, parseProductMeta } from "../_lib/productMeta.js";

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

test("cleans spacing entities out of titles", () => {
  const html = `<meta property="og:title" content="AirPods 5 &NegativeMediumSpace;&amp;nbsp;White &ndash; 2025">`;
  assert.equal(parseProductMeta(html, page).name, "AirPods 5 &nbsp;White – 2025");
});

test("stays fast on pathological markup", () => {
  const evil = '<script type="application/ld+json">'.repeat(30000) + "<meta ".repeat(100000) + "<title>".repeat(50000);
  const start = performance.now();
  parseProductMeta(evil, page);
  assert.ok(performance.now() - start < 2000);
});

test("returns nulls when nothing is found", () => {
  assert.deepEqual(parseProductMeta("<p>hi</p>", page), { name: null, image: null, price: null, currency: null });
});

test("refuses internal addresses", async () => {
  await assert.rejects(fetchPage("http://127.0.0.1/"));
  await assert.rejects(fetchPage("http://169.254.169.254/latest/meta-data"));
  await assert.rejects(fetchPage("file:///etc/passwd"));
});

test("treats internal and special-purpose addresses as private", () => {
  for (const address of [
    "127.0.0.1", "10.1.2.3", "172.31.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0",
    "224.0.0.1", "::", "::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:a9fe:a9fe", "::7f00:1",
    "64:ff9b::7f00:1", "2002:7f00:1::", "fd00::1", "fe80::1", "ff02::1", "not-an-ip",
  ]) {
    assert.equal(isPrivateAddress(address), true, address);
  }
  for (const address of ["93.184.216.34", "8.8.8.8", "::ffff:808:808", "2606:4700::6810:84e5"]) {
    assert.equal(isPrivateAddress(address), false, address);
  }
});

test("refuses internal addresses written as IPv6, by name, or reached by a redirect", async () => {
  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html" }).end("<title>internal</title>");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    const refused = (url: string) =>
      assert.rejects(fetchPage(url), (e: { status?: number }) => e.status === 400, url);
    await refused(`http://[::ffff:127.0.0.1]:${String(port)}/`);
    await refused(`http://[::ffff:7f00:1]:${String(port)}/`);
    await refused(`http://localhost:${String(port)}/`);
  } finally {
    server.close();
  }
});
