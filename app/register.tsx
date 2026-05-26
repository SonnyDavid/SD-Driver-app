import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type VehicleType = "car" | "van" | "motorcycle";

export default function RegisterScreen() {
  const { register } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [vehicleReg, setVehicleReg] = useState("");
  const [vehiclePhotoUri, setVehiclePhotoUri] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function pickVehiclePhoto() {
    Alert.alert("Vehicle Photo", "Choose an option", [
      {
        text: "Camera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") { Alert.alert("Permission required", "Camera access is needed."); return; }
          const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [4, 3] });
          if (!result.canceled && result.assets[0]) setVehiclePhotoUri(result.assets[0].uri);
        },
      },
      {
        text: "Photo Gallery",
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") { Alert.alert("Permission required", "Photo library access is needed."); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [4, 3] });
          if (!result.canceled && result.assets[0]) setVehiclePhotoUri(result.assets[0].uri);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function validate(): string | null {
    if (!name.trim()) return "Full name is required";
    if (!email.trim() || !email.includes("@")) return "Valid email is required";
    if (!phone.trim() || phone.length < 8) return "Valid phone number is required";
    if (!password || password.length < 6) return "Password must be at least 6 characters";
    if (password !== confirmPassword) return "Passwords do not match";
    if (!vehicleReg.trim()) return "Vehicle registration number is required";
    if (!vehiclePhotoUri) return "Vehicle photo is required to complete registration";
    return null;
  }

  async function handleRegister() {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setLoading(true);
    const result = await register({ name, email, phone, password, vehicleType, vehicleRegistration: vehicleReg, vehiclePhotoUri });
    setLoading(false);
    if (result.success && result.driverId) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: "/register-success", params: { driverId: result.driverId, name: name.trim(), vehicleRegistration: vehicleReg.trim().toUpperCase() } });
    } else {
      setError(result.error ?? "Registration failed. Please try again.");
    }
  }

  const VEHICLES: { key: VehicleType; label: string; icon: string }[] = [
    { key: "car", label: "Car", icon: "truck" },
    { key: "van", label: "Van", icon: "package" },
    { key: "motorcycle", label: "Motorcycle", icon: "wind" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={colors.foreground} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.foreground }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Register as an SD driver</Text>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>PERSONAL INFORMATION</Text>

            {[
              { label: "Full Name", value: name, setter: setName, placeholder: "John Smith", icon: "user", keyboardType: "default" as const, autoCapitalize: "words" as const },
              { label: "Email Address", value: email, setter: setEmail, placeholder: "john@example.com", icon: "mail", keyboardType: "email-address" as const, autoCapitalize: "none" as const },
              { label: "Phone Number", value: phone, setter: setPhone, placeholder: "+1 555 000 0000", icon: "phone", keyboardType: "phone-pad" as const, autoCapitalize: "none" as const },
            ].map((field) => (
              <View key={field.label} style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>{field.label}</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: field.value ? colors.primary : colors.border }]}>
                  <Feather name={field.icon as any} size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    value={field.value}
                    onChangeText={(t) => { field.setter(t); setError(""); }}
                    keyboardType={field.keyboardType}
                    autoCapitalize={field.autoCapitalize}
                    autoCorrect={false}
                  />
                </View>
              </View>
            ))}

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Password</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: password ? colors.primary : colors.border }]}>
                <Feather name="lock" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(""); }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword((p) => !p)}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Confirm Password</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: confirmPassword ? (confirmPassword === password ? colors.success : colors.destructive) : colors.border }]}>
                <Feather name="lock" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Re-enter password"
                  placeholderTextColor={colors.mutedForeground}
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>VEHICLE INFORMATION</Text>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Vehicle Type</Text>
            <View style={styles.vehicleRow}>
              {VEHICLES.map((v) => (
                <TouchableOpacity
                  key={v.key}
                  style={[
                    styles.vehicleBtn,
                    { borderColor: vehicleType === v.key ? colors.primary : colors.border, backgroundColor: vehicleType === v.key ? colors.primary + "20" : colors.input },
                  ]}
                  onPress={() => setVehicleType(v.key)}
                >
                  <Feather name={v.icon as any} size={22} color={vehicleType === v.key ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.vehicleLabel, { color: vehicleType === v.key ? colors.primary : colors.mutedForeground }]}>{v.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Registration Number</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: vehicleReg ? colors.primary : colors.border }]}>
                <Feather name="hash" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="e.g. ABC-1234"
                  placeholderTextColor={colors.mutedForeground}
                  value={vehicleReg}
                  onChangeText={(t) => { setVehicleReg(t.toUpperCase()); setError(""); }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 4 }]}>Vehicle Photo</Text>
            <Text style={[styles.photoNote, { color: colors.mutedForeground }]}>Required — must be uploaded before registration</Text>

            <TouchableOpacity
              style={[styles.photoUploadBtn, { borderColor: vehiclePhotoUri ? colors.success : colors.primary, backgroundColor: colors.input }]}
              onPress={pickVehiclePhoto}
            >
              {vehiclePhotoUri ? (
                <Image source={{ uri: vehiclePhotoUri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Feather name="camera" size={32} color={colors.primary} />
                  <Text style={[styles.photoLabel, { color: colors.primary }]}>Upload Vehicle Photo</Text>
                  <Text style={[styles.photoSub, { color: colors.mutedForeground }]}>Camera or Gallery</Text>
                </View>
              )}
            </TouchableOpacity>
            {vehiclePhotoUri && (
              <TouchableOpacity onPress={pickVehiclePhoto} style={styles.changePhotoBtn}>
                <Text style={[styles.changePhotoText, { color: colors.primary }]}>Change Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "20", borderColor: colors.destructive + "40" }]}>
              <Feather name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>CREATE ACCOUNT</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace("/login")}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, gap: 16 },
  backBtn: { marginBottom: 16, width: 40 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
  section: { borderRadius: 18, borderWidth: 1, padding: 20, gap: 14 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.5, marginBottom: 4 },
  fieldGroup: { gap: 7 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8 },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1.5, height: 50, paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  vehicleRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  vehicleBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, gap: 6 },
  vehicleLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  photoNote: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: -8, marginBottom: 4 },
  photoUploadBtn: { borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", overflow: "hidden", minHeight: 140 },
  photoPreview: { width: "100%", height: 180 },
  photoPlaceholder: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 28 },
  photoLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  photoSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  changePhotoBtn: { alignItems: "center", paddingVertical: 6 },
  changePhotoText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  submitBtn: { height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 8 },
  submitText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 1 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 4, marginBottom: 8 },
  footerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  footerLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
