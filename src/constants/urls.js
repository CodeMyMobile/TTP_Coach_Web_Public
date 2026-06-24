export const API_URL = import.meta.env?.VITE_API_URL;

export const SHOPIFY_URL = "https://garage-dummy.myshopify.com"; // dummy shopify store

// Coach supplies — The Tennis Garage Shopify storefront. Checkout runs on Shopify
// (a pre-filled cart permalink), so no backend/commerce code lives in this app.
export const COACH_SUPPLIES_SHOP_ORIGIN = "https://thetennisgarage.com";

// Product page (kept as a reference / fallback).
export const COACH_SUPPLIES_URL = `${COACH_SUPPLIES_SHOP_ORIGIN}/products/tennis-coach-supplies`;

// The three "Tennis Coach Supplies" variants shown in the in-app selector.
export const COACH_SUPPLIES_ITEMS = [
  { key: 'restring', name: 'Restring', price: 20, variantId: '47255984341163' },
  { key: 'restring_strings', name: 'Restring + strings', price: 30, variantId: '47255984373931' },
  { key: 'case_balls', name: 'Case of balls', price: 80, variantId: '47255984406699' }
];

export const STOREFRONT_ACCESS_TOKEN = "541d9c003f6446f595944b4de71f9100"; // dummy garage shopify
export const AS_USER_KEY = `async_user_key`;
export const SHOPIFY_API_VERSION = '2024-04';
