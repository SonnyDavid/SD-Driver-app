import { Stack, router } from "expo-router";

import { StyleSheet, Text, View } from "react-native";



import { PrimaryButton, ScreenShell, flow, safeBottom, safeTop } from "@/components/DriverFlowUI";



export default function NotFoundScreen() {

  return (

    <>

      <Stack.Screen options={{ title: "Oops!" }} />

      <ScreenShell>

        <View style={[styles.container, { paddingTop: safeTop(), paddingBottom: safeBottom() + 24 }]}>

          <View style={styles.card}>

            <Text style={styles.kicker}>SD DRIVER APP</Text>

            <Text style={styles.title}>Screen unavailable</Text>

            <Text style={styles.subtitle}>Return to the official driver flow.</Text>

            <PrimaryButton label="BACK TO HOME" onPress={() => router.replace("/")} />

          </View>

        </View>

      </ScreenShell>

    </>

  );

}



const styles = StyleSheet.create({

  container: {

    flex: 1,

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: flow.space.xl,

  },

  card: {

    width: "100%",

    borderWidth: 1,

    borderColor: flow.line,

    borderRadius: flow.radius,

    backgroundColor: "rgba(10,13,18,0.96)",

    padding: flow.space.lg,

    alignItems: "center",

    gap: flow.space.sm,

  },

  kicker: { color: flow.cyan, fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.4 },

  title: { color: flow.text, fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },

  subtitle: { color: flow.muted, fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },

});

