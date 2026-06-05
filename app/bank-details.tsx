import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import {
  Card,
  Field,
  HeaderBar,
  PrimaryButton,
  ScreenShell,
  flow,
  safeBottom,
  safeTop,
} from "@/components/DriverFlowUI";
import { useAuth } from "@/contexts/AuthContext";
import {
  loadLocalBankDetails,
  saveLocalBankDetails,
  type LocalBankDetails,
} from "@/lib/localBankDetails";

export default function BankDetailsScreen() {
  const { driver } = useAuth();
  const [bankName, setBankName] = useState("HSBC");
  const [accountNumber, setAccountNumber] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!driver?.id) return;
    loadLocalBankDetails(driver.id).then((details) => {
      setBankName(details.bankName);
      setAccountNumber(details.accountNumber);
      setSortCode(details.sortCode);
      setLoading(false);
    });
  }, [driver?.id]);

  async function handleSave() {
    if (!driver?.id) return;
    if (!bankName.trim() || !accountNumber.trim() || !sortCode.trim()) {
      Alert.alert("Missing details", "Please complete all bank detail fields.");
      return;
    }

    setSaving(true);
    try {
      const saved = await saveLocalBankDetails(driver.id, {
        bankName,
        accountNumber,
        sortCode,
      } satisfies LocalBankDetails);
      setBankName(saved.bankName);
      setAccountNumber(saved.accountNumber);
      setSortCode(saved.sortCode);
      Alert.alert("Saved", "Bank details saved locally.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.page, { paddingTop: safeTop() + 8, paddingBottom: safeBottom() + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <HeaderBar title="Bank Details" subtitle="Update payout account" onBack={() => router.back()} />
          <Card style={{ gap: flow.space.md, marginTop: flow.space.sm }}>
            <Field
              label="Bank Name"
              icon="briefcase"
              value={bankName}
              onChangeText={setBankName}
              placeholder="Bank Name"
              editable={!loading}
            />
            <Field
              label="Account Number"
              icon="hash"
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="Account Number"
              keyboardType="number-pad"
              editable={!loading}
            />
            <Field
              label="Sort Code"
              icon="grid"
              value={sortCode}
              onChangeText={setSortCode}
              placeholder="Sort Code"
              editable={!loading}
            />
            <PrimaryButton
              label={saving ? "SAVING..." : "SAVE BANK DETAILS"}
              icon="save"
              onPress={handleSave}
              disabled={loading || saving}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: flow.space.page, gap: flow.space.sm },
});
