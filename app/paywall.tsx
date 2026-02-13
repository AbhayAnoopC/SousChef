import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { getIsPro, getPackages } from "../lib/revenuecat";

export default function PaywallScreen() {
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        const pkgs = await getPackages();
        setPackages(pkgs);
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const purchase = async (pkg: PurchasesPackage) => {
        setBusy(true);
        try {
            const result = await Purchases.purchasePackage(pkg);

            const isPro = !!result?.customerInfo?.entitlements?.active?.pro;
            if (isPro) {
                router.back();
            } else {
                Alert.alert("Purchase completed", "Thanks! Your Pro access will appear shortly.");
            }
        } catch (e: any) {
            // User cancelled is not an error worth spamming
            const msg = e?.message ?? "Purchase failed.";
            if (!String(msg).toLowerCase().includes("cancel")) {
                Alert.alert("Purchase error", msg);
            }
        } finally {
            setBusy(false);
        }
    };

    const restore = async () => {
        setBusy(true);
        try {
            await Purchases.restorePurchases();
            const isPro = await getIsPro();
            if (isPro) router.back();
            else Alert.alert("No purchases found", "We didn’t find an active subscription for this Apple ID.");
        } catch (e: any) {
            Alert.alert("Restore error", e?.message ?? "Could not restore purchases.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <View className="flex-1 bg-surface px-8 pt-20">
            <Text className="text-4xl font-black text-slate-900">Go Pro</Text>
            <Text className="text-slate-500 mt-3 text-lg">
                Unlimited recipes + unlimited chef questions.
            </Text>

            <View className="mt-8 bg-white p-6 rounded-[28px] border border-slate-100">
                {loading ? (
                    <View className="py-10 items-center">
                        <ActivityIndicator />
                        <Text className="text-slate-400 mt-3">Loading plans…</Text>
                    </View>
                ) : packages.length === 0 ? (
                    <View className="py-8">
                        <Text className="text-slate-700 font-bold text-lg">Plans not available yet</Text>
                        <Text className="text-slate-500 mt-2">
                            Finish App Store Connect setup, then import products into RevenueCat (Offering: default).
                        </Text>

                        <TouchableOpacity
                            disabled={busy}
                            onPress={load}
                            className="mt-5 bg-slate-100 py-4 rounded-2xl"
                        >
                            <Text className="text-slate-800 text-center font-bold">Try again</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View>
                        {packages.map((pkg) => {
                            const price = pkg.product.priceString;
                            const title = pkg.product.title || pkg.identifier;

                            return (
                                <TouchableOpacity
                                    key={pkg.identifier}
                                    disabled={busy}
                                    onPress={() => purchase(pkg)}
                                    className="bg-slate-50 border border-slate-200 p-5 rounded-2xl mb-3"
                                >
                                    <Text className="text-slate-900 font-bold text-lg">{title}</Text>
                                    <Text className="text-slate-500 mt-1">{price}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </View>

            <TouchableOpacity
                disabled={busy}
                onPress={restore}
                className="mt-6 py-4 rounded-2xl"
            >
                <Text className="text-center text-slate-500 font-bold">Restore purchases</Text>
            </TouchableOpacity>

            <View className="flex-1" />

            <TouchableOpacity
                onPress={() => router.back()}
                disabled={busy}
                className="mb-10 bg-primary py-5 rounded-[24px]"
            >
                <Text className="text-white text-center text-xl font-bold">
                    {busy ? "Working…" : "Not now"}
                </Text>
            </TouchableOpacity>
        </View>
    );
}
