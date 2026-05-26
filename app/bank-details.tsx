import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function BankDetailsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [bankName, setBankName] = useState("Barclays");
  const [accountNumber, setAccountNumber] = useState("4821");
  const [sortCode, setSortCode] = useState("20-84-57");

  function handleSave() {
    Alert.alert("Success", "Bank details updated");
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.headerTitle,
            { color: colors.foreground },
          ]}
        >
          Bank Details
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 32,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.label,
                  { color: colors.mutedForeground },
                ]}
              >
                Bank Name
              </Text>

              <TextInput
                value={bankName}
                onChangeText={setBankName}
                placeholder="Bank Name"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.input,
                  {
                    color: colors.foreground,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.label,
                  { color: colors.mutedForeground },
                ]}
              >
                Account Number
              </Text>

              <TextInput
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="number-pad"
                placeholder="Account Number"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.input,
                  {
                    color: colors.foreground,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.label,
                  { color: colors.mutedForeground },
                ]}
              >
                Sort Code
              </Text>

              <TextInput
                value={sortCode}
                onChangeText={setSortCode}
                placeholder="Sort Code"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.input,
                  {
                    color: colors.foreground,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              />
            </View>

            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.button,
                { backgroundColor: colors.primary },
              ]}
            >
              <Feather name="save" size={18} color="#fff" />

              <Text style={styles.buttonText}>
                Save Changes
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    borderBottomWidth: 1,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },

  headerTitle: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },

  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },

  inputGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },

  button: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});