export { RegisterScreen as default } from "@/components/DriverFlowScreens";
/*
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
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
type PhotoTarget = "vehicle" | "selfie";

const SD_LOGO = require("@/assets/images/sd-logo.png");

export default function RegisterScreen() {
  const { register } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("van");
  const [vehicleReg, setVehicleReg] = useState("");
  const [vehiclePhotoUri, setVehiclePhotoUri] = useState("");
  const [driverSelfieUri, setDriverSelfieUri] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function pickPhoto(target: PhotoTarget) {
    Alert.alert(target === "vehicle" ? "Vehicle Photo" : "Driver Selfie", "Choose an option", [
      {
        text: "Camera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission required", "Camera access is needed.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [4, 3] });
          if (!result.canceled && result.assets[0]) {
            target === "vehicle" ? setVehiclePhotoUri(result.assets[0].uri) : setDriverSelfieUri(result.assets[0].uri);
          }
        },
      },
      {
        text: "Photo Gallery",
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission required", "Photo library access is needed.");
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [4, 3] });
          if (!result.canceled && result.assets[0]) {
            target === "vehicle" ? setVehiclePhotoUri(result.assets[0].uri) : setDriverSelfieUri(result.assets[0].uri);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function personalError(): string | null {
    if (!firstName.trim()) return "First name is required";
    if (!lastName.trim()) return "Last name is required";
    if (!phone.trim() || phone.length < 8) return "Valid phone number is required";
    if (!email.trim() || !email.includes("@")) return "Valid email is required";
    if (!password || password.length < 6) return "Password must be at least 6 characters";
    if (password !== confirmPassword) return "Passwords do not match";
    return null;
  }

  function validate(): string | null {
    const personal = personalError();
    if (personal) return personal;
    if (!vehicleReg.trim()) return "Vehicle registration number is required";
    if (!vehiclePhotoUri) return "Vehicle photo is required to complete registration";
    if (!driverSelfieUri) return "Selfie verification is required";
    return null;
  }

  async function goToVehicleStep() {
    const err = personalError();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep(2);
  }

  function goToSelfieStep() {
    const personal = personalError();
    if (personal) {
      setError(personal);
      return;
    }
    if (!vehicleReg.trim()) {
      setError("Vehicle registration number is required");
      return;
    }
    if (!vehiclePhotoUri) {
      setError("Vehicle photo is required to continue");
      return;
    }
    setError("");
    setStep(3);
  }

  async function handleRegister() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setLoading(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const result = await register({
      name: fullName,
      email,
      phone,
      password,
      vehicleType,
      vehicleRegistration: vehicleReg,
      vehiclePhotoUri,
    });
    setLoading(false);
    if (result.success && result.driverId) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: "/register-success",
        params: { driverId: result.driverId, name: fullName, vehicleRegistration: vehicleReg.trim().toUpperCase() },
      });
    } else {
      setError(result.error ?? "Registration failed. Please try again.");
    }
  }

  const vehicles: { key: VehicleType; label: string; icon: string; lib?: "fontawesome" }[] = [
    { key: "van", label: "VAN", icon: "truck" },
    { key: "motorcycle", label: "MOTORCYCLE", icon: "motorcycle", lib: "fontawesome" },
    { key: "car", label: "CAR", icon: "car" },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#000", "#080604", "#000"]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 2, paddingBottom: bottomPad + 18 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => (step === 1 ? router.back() : setStep(step === 3 ? 2 : 1))}>
              <Feather name="arrow-left" size={23} color="#FFFFFF" />
            </TouchableOpacity>
            <Image source={SD_LOGO} style={styles.logo} resizeMode="contain" />
            <View style={styles.packageIcon}>
              <Feather name="package" size={24} color={colors.primary} />
            </View>
          </View>

          <Text style={styles.title}>Driver Registration</Text>
          <Text style={styles.subtitle}>
            {step === 1 ? (
              <>
                Create your account to start delivering{"\n"}with <Text style={styles.orange}>SD</Text> Same Day Delivery
              </>
            ) : step === 2 ? (
              "Add your vehicle details and registration photo"
            ) : (
              "Take a clear selfie so we can verify your identity"
            )}
          </Text>

          {step === 1 ? (
            <>
              <View style={styles.form}>
                <Field icon="user" label="First Name" placeholder="Enter your first name" value={firstName} onChangeText={setFirstName} />
                <Field icon="user" label="Last Name" placeholder="Enter your last name" value={lastName} onChangeText={setLastName} />
                <Field icon="phone" label="Phone Number" placeholder="07XXXXXXXXX" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <Field icon="mail" label="Email Address" placeholder="Enter your email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <Field icon="lock" label="Password" placeholder="Create a password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} rightIcon={showPassword ? "eye-off" : "eye"} onRightPress={() => setShowPassword((v) => !v)} />
                <Field icon="lock" label="Confirm Password" placeholder="Confirm your password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} rightIcon={showPassword ? "eye-off" : "eye"} onRightPress={() => setShowPassword((v) => !v)} />
              </View>

              <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed((v) => !v)} activeOpacity={0.8}>
                <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                  {agreed && <Feather name="check" size={14} color="#111" />}
                </View>
                <Text style={styles.termsText}>
                  I agree to the <Text style={styles.orange}>Terms & Conditions</Text> and <Text style={styles.orange}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              {!!error && <ErrorMessage message={error} />}
              <TouchableOpacity style={styles.submitBtn} onPress={goToVehicleStep} activeOpacity={0.86}>
                <Text style={styles.submitText}>CREATE ACCOUNT</Text>
                <Feather name="arrow-right" size={22} color="#111" />
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.replace("/login")}>
                  <Text style={styles.footerLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : step === 2 ? (
            <>
              <Section number="1" title="VEHICLE TYPE">
                <View style={styles.vehicleRow}>
                  {vehicles.map((vehicle) => {
                    const selected = vehicleType === vehicle.key;
                    return (
                      <TouchableOpacity
                        key={vehicle.key}
                        style={[styles.vehicleBtn, selected && styles.vehicleBtnActive]}
                        onPress={() => setVehicleType(vehicle.key)}
                        activeOpacity={0.86}
                      >
                        {vehicle.lib === "fontawesome" ? (
                          <FontAwesome5 name={vehicle.icon as any} size={30} color={selected ? colors.primary : "#8A8A8A"} />
                        ) : (
                          <Feather name={vehicle.icon as any} size={34} color={selected ? colors.primary : "#8A8A8A"} />
                        )}
                        <Text style={[styles.vehicleText, selected && styles.vehicleTextActive]}>{vehicle.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Section>

              <Section number="2" title="VEHICLE REGISTRATION NUMBER">
                <Field icon="credit-card" placeholder="Enter registration number" value={vehicleReg} onChangeText={(text) => setVehicleReg(text.toUpperCase())} autoCapitalize="characters" compact />
                <Text style={styles.exampleText}>Example: AB12 CDE</Text>
              </Section>

              <Section number="3" title="VEHICLE PHOTO (WITH REGISTRATION NUMBER)">
                <PhotoRow uri={vehiclePhotoUri} title="Take a photo of your vehicle" subtitle="Make sure the registration number is clearly visible" onPress={() => pickPhoto("vehicle")} />
              </Section>

              {!!error && <ErrorMessage message={error} />}
              <TouchableOpacity style={styles.submitBtn} onPress={goToSelfieStep} activeOpacity={0.86}>
                <Text style={styles.submitText}>NEXT</Text>
                <Feather name="arrow-right" size={22} color="#111" />
              </TouchableOpacity>

              <View style={styles.secureRow}>
                <Feather name="lock" size={15} color={colors.primary} />
                <Text style={styles.secureText}>Your information is secure and encrypted</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.selfieCard}>
                <Text style={styles.selfieKicker}>Step 3 of 4</Text>
                <Text style={styles.selfieTitle}>Verify Your Identity</Text>
                <Text style={styles.selfieSub}>This helps us confirm you are the registered driver.</Text>
                <TouchableOpacity style={styles.selfieCircle} onPress={() => pickPhoto("selfie")} activeOpacity={0.86}>
                  {driverSelfieUri ? (
                    <>
                      <Image source={{ uri: driverSelfieUri }} style={styles.selfieImage} resizeMode="cover" />
                      <View style={styles.selfieCheck}><Feather name="check" size={18} color="#fff" /></View>
                    </>
                  ) : (
                    <Feather name="camera" size={36} color="#FF6B00" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.selfieCameraBtn} onPress={() => pickPhoto("selfie")} activeOpacity={0.86}>
                  <Feather name="camera" size={17} color="#111" />
                  <Text style={styles.selfieCameraText}>{driverSelfieUri ? "RETAKE SELFIE" : "TAKE SELFIE"}</Text>
                </TouchableOpacity>
              </View>

              {!!error && <ErrorMessage message={error} />}
              <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.65 }]} onPress={handleRegister} disabled={loading} activeOpacity={0.86}>
                {loading ? <ActivityIndicator color="#111" /> : <Text style={styles.submitText}>SUBMIT FOR APPROVAL</Text>}
                {!loading && <Feather name="arrow-right" size={22} color="#111" />}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  icon,
  label,
  rightIcon,
  onRightPress,
  compact,
  ...inputProps
}: {
  icon: string;
  label?: string;
  rightIcon?: string;
  onRightPress?: () => void;
  compact?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={[styles.field, compact && styles.compactField]}>
      <Feather name={icon as any} size={19} color="#FF6B00" style={styles.fieldIcon} />
      <View style={{ flex: 1 }}>
        {!!label && <Text style={styles.fieldLabel}>{label}</Text>}
        <TextInput
          {...inputProps}
          style={styles.input}
          placeholderTextColor="#858585"
          autoCorrect={false}
        />
      </View>
      {!!rightIcon && (
        <TouchableOpacity onPress={onRightPress} style={styles.eyeBtn}>
          <Feather name={rightIcon as any} size={20} color="#8E8E8E" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{number}. {title}</Text>
      {children}
    </View>
  );
}

function PhotoRow({ uri, title, subtitle, onPress }: { uri: string; title: string; subtitle: string; onPress: () => void }) {
  return (
    <View style={styles.photoRow}>
      <TouchableOpacity style={styles.photoPicker} onPress={onPress} activeOpacity={0.86}>
        <Feather name="camera" size={32} color="#FF6B00" />
        <Text style={styles.photoTitle}>{title}</Text>
        <Text style={styles.photoSub}>{subtitle}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.photoPreview} onPress={onPress} activeOpacity={0.86}>
        {uri ? (
          <>
            <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" />
            <View style={styles.checkBadge}>
              <Feather name="check" size={18} color="#fff" />
            </View>
          </>
        ) : (
          <View style={styles.emptyPhoto}>
            <Feather name="image" size={28} color="#555" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <Feather name="alert-circle" size={16} color="#EF4444" />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  header: { minHeight: 92, alignItems: "center", justifyContent: "center" },
  backBtn: { position: "absolute", left: -8, top: 18, width: 40, height: 40, justifyContent: "center" },
  logo: { width: 175, height: 92 },
  packageIcon: { position: "absolute", right: 0, top: 42 },
  title: { color: "#FFFFFF", fontSize: 21, fontFamily: "Inter_700Bold", textAlign: "center", marginTop: -2 },
  subtitle: { color: "#A9A9A9", fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, textAlign: "center", marginTop: 5, marginBottom: 12 },
  orange: { color: "#FF6B00", fontFamily: "Inter_700Bold" },
  form: { gap: 9 },
  field: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#272727",
    backgroundColor: "rgba(12,12,12,0.92)",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
  },
  compactField: { minHeight: 44, borderRadius: 8 },
  fieldIcon: { marginRight: 12 },
  fieldLabel: { color: "#CFCFCF", fontSize: 10, fontFamily: "Inter_500Medium", marginBottom: 3 },
  input: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
  eyeBtn: { paddingLeft: 10 },
  termsRow: { flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 5 },
  checkbox: { width: 22, height: 22, borderWidth: 1.5, borderColor: "#FF6B00", marginRight: 10, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: "#FF6B00" },
  termsText: { color: "#B7B7B7", fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  submitBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 14,
    marginTop: 8,
  },
  submitText: { color: "#111", fontSize: 14, fontFamily: "Inter_700Bold" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 14 },
  footerText: { color: "#D8D8D8", fontSize: 14, fontFamily: "Inter_400Regular" },
  footerLink: { color: "#FF6B00", fontSize: 14, fontFamily: "Inter_700Bold" },
  section: { backgroundColor: "rgba(15,15,15,0.96)", borderWidth: 1, borderColor: "#202020", borderRadius: 7, padding: 9, marginBottom: 7 },
  sectionTitle: { color: "#D8D8D8", fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 8 },
  vehicleRow: { flexDirection: "row", gap: 7 },
  vehicleBtn: { flex: 1, height: 66, borderRadius: 8, borderWidth: 1, borderColor: "#2A2A2A", backgroundColor: "#111", alignItems: "center", justifyContent: "center", gap: 5 },
  vehicleBtnActive: { borderColor: "#FF6B00", backgroundColor: "rgba(255,107,0,0.1)" },
  vehicleText: { color: "#E0E0E0", fontSize: 11, fontFamily: "Inter_700Bold" },
  vehicleTextActive: { color: "#FF6B00" },
  exampleText: { color: "#8E8E8E", fontSize: 11, marginTop: 9, fontFamily: "Inter_400Regular" },
  photoRow: { flexDirection: "row", gap: 8 },
  photoPicker: { flex: 1, minHeight: 110, borderRadius: 8, borderWidth: 1, borderStyle: "dashed", borderColor: "#555", alignItems: "center", justifyContent: "center", padding: 9 },
  photoTitle: { color: "#D8D8D8", fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: 7 },
  photoSub: { color: "#8E8E8E", fontSize: 9, fontFamily: "Inter_400Regular", lineHeight: 13, textAlign: "center", marginTop: 3 },
  photoPreview: { flex: 1, height: 110, borderRadius: 8, backgroundColor: "#161616", overflow: "hidden" },
  photoImage: { width: "100%", height: "100%" },
  emptyPhoto: { flex: 1, alignItems: "center", justifyContent: "center" },
  checkBadge: { position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: "#FF6B00", alignItems: "center", justifyContent: "center" },
  selfieCard: { borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.96)", borderRadius: 8, padding: 14, alignItems: "center" },
  selfieKicker: { color: "#FF6B00", fontSize: 10, fontFamily: "Inter_700Bold", marginBottom: 5 },
  selfieTitle: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold" },
  selfieSub: { color: "#A7A7A7", fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 5, marginBottom: 14 },
  selfieCircle: { width: 156, height: 156, borderRadius: 78, borderWidth: 2, borderColor: "#FF6B00", backgroundColor: "#101010", alignItems: "center", justifyContent: "center", overflow: "hidden", shadowColor: "#FF6B00", shadowOpacity: 0.35, shadowRadius: 16 },
  selfieImage: { width: "100%", height: "100%" },
  selfieCheck: { position: "absolute", right: 12, bottom: 12, width: 30, height: 30, borderRadius: 15, backgroundColor: "#22C55E", alignItems: "center", justifyContent: "center" },
  selfieCameraBtn: { height: 40, borderRadius: 8, backgroundColor: "#FF6B00", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 14, marginTop: 14 },
  selfieCameraText: { color: "#111", fontSize: 12, fontFamily: "Inter_700Bold" },
  secureRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 },
  secureText: { color: "#9B9B9B", fontSize: 12, fontFamily: "Inter_400Regular" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(239,68,68,0.35)", backgroundColor: "rgba(239,68,68,0.12)", marginTop: 8 },
  errorText: { color: "#EF4444", fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
});
*/
