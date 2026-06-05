import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { flow } from "@/components/DriverFlowUI";
import { useAuth } from "@/contexts/AuthContext";

export default function TabLayout() {
  const { driver, isLoading } = useAuth();

  if (isLoading) return null;

  if (!driver) {
    console.log("User session:", null);
    console.log("Auth state:", driver);
    console.log("Navigating to splash");
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: flow.cyan,
        tabBarInactiveTintColor: flow.muted,
        tabBarStyle: {
          backgroundColor: flow.panel,
          borderTopColor: flow.line,
          borderTopWidth: 1,
          height: Platform.OS === "web" ? 78 : 72,
          paddingBottom: Platform.OS === "web" ? 28 : 10,
          paddingTop: 7,
          borderTopLeftRadius: flow.radius,
          borderTopRightRadius: flow.radius,
          position: "absolute",
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontFamily: "Inter_600SemiBold",
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Feather name="grid" size={19} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Available",
          tabBarIcon: ({ color }) => <Feather name="inbox" size={19} color={color} />,
        }}
      />
      <Tabs.Screen
        name="deliveries"
        options={{
          title: "My Deliveries",
          tabBarIcon: ({ color }) => <Feather name="shopping-bag" size={19} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="currency-gbp-circle-outline" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Feather name="user" size={19} color={color} />,
        }}
      />
    </Tabs>
  );
}
