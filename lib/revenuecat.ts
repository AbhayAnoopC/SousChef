// lib/revenuecat.ts
import Purchases, { CustomerInfo } from "react-native-purchases";

export async function getCustomerInfoSafe(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    console.log("RevenueCat getCustomerInfo error", e);
    return null;
  }
}

export async function getIsPro(): Promise<boolean> {
  const info = await getCustomerInfoSafe();
  return !!info?.entitlements?.active?.pro;
}

export async function getPackages() {
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    return current?.availablePackages ?? [];
  } catch (e) {
    console.log("RevenueCat getOfferings error", e);
    return [];
  }
}
