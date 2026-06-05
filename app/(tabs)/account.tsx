export { ProfileScreen as default } from "@/components/DriverFlowScreens";
/*
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Feather name="chevron-left" size={26} color="#FFFFFF" /></TouchableOpacity>
          <Text style={styles.title}>My Account</Text>
          <TouchableOpacity style={styles.bell}><Feather name="bell" size={19} color="#FFFFFF" /><View style={styles.dot} /></TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{driver?.name?.charAt(0).toUpperCase() || "J"}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{driver?.name || "John Smith"}</Text>
            <Text style={styles.small}>Driver ID</Text>
            <Text style={styles.driverId} numberOfLines={1}>{driver?.driverId || "SD-34567"}</Text>
            <Text style={styles.approved}><Feather name="check-circle" size={13} color="#22C55E" /> {driver?.status === "verified" ? "Approved" : "Pending Review"}</Text>
          </View>
          <Feather name="chevron-right" size={22} color="#777" />
        </View>

        <InfoCard title="Vehicle Information" icon="truck" status="Verified">
          <Row icon="truck" label="Vehicle Type" value={capitalize(driver?.vehicleType || "Van")} />
          <Row icon="credit-card" label="Registration Number" value={driver?.vehicleRegistration || "AB12 CDE"} />
          <Row icon="shield" label="Vehicle Status" value="Verified" green />
        </InfoCard>

        <TouchableOpacity activeOpacity={0.86} onPress={() => router.push("/bank-details")}>
          <InfoCard title="Bank Account" icon="credit-card" status="Verified">
            <Row icon="credit-card" label="Barclays Bank" value="**** **** **** 5432" />
            <Row icon="user" label="Account Holder" value={driver?.name || "John Smith"} />
            <Row icon="hash" label="Sort Code" value="20-45-78" />
            <View style={styles.orangeButton}><Text style={styles.orangeButtonText}>UPDATE BANK ACCOUNT</Text></View>
          </InfoCard>
        </TouchableOpacity>

        <InfoCard title="Payout Settings" icon="settings">
          <Row icon="repeat" label="Payout Method" value="Bank Transfer" />
          <Row icon="calendar" label="Payout Frequency" value="Weekly" />
          <Row icon="pound-sign" label="Minimum Payout" value="£50.00" />
        </InfoCard>

        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}><Feather name="bar-chart-2" size={16} color="#FF6B00" /> Driver Statistics</Text>
          <View style={styles.statsGrid}>
            <Stat label="Completed Deliveries" value={String(completedDeliveries.length || 1247)} color="#FF6B00" />
            <Stat label="Success Rate" value="99.6%" color="#22C55E" />
            <Stat label="Total Earnings" value={`£${(weeklyEarnings || 18542.3).toFixed(2)}`} color="#FF6B00" />
            <Stat label="Member Since" value="May 2026" color="#E879F9" />
          </View>
        </View>

        <InfoCard title="Documents" icon="file-text">
          {["Driving Licence", "Proof of Address", "Vehicle Insurance", "Vehicle Photo", "Selfie Verification", "MOT Certificate"].map((item) => (
            <Row key={item} icon="check-square" label={item} value="Verified" green />
          ))}
          <View style={styles.outlineButton}><Text style={styles.outlineButtonText}>MANAGE DOCUMENTS</Text></View>
        </InfoCard>

        <InfoCard title="Notifications" icon="bell">
          <ToggleRow icon="package" label="New Order" />
          <ToggleRow icon="check-circle" label="Order Accepted" />
          <ToggleRow icon="navigation" label="Navigate To Pickup" />
          <ToggleRow icon="lock" label="PIN Verified" />
          <ToggleRow icon="check" label="Delivery Completed" />
        </InfoCard>

        <InfoCard title="Preferences" icon="settings">
          <Row icon="globe" label="Language" value="English" />
          <Row icon="moon" label="Theme" value="Dark" />
          <Row icon="navigation" label="Navigation App" value="Apple Maps" />
        </InfoCard>

        <InfoCard title="Support" icon="headphones">
          <TouchableOpacity onPress={() => openSupport("email")}><Row icon="help-circle" label="Help Centre" value="Find answers to common questions" /></TouchableOpacity>
          <TouchableOpacity onPress={() => openSupport("call")}><Row icon="phone-call" label="Contact Support" value="Chat or call our support team" /></TouchableOpacity>
          <Row icon="alert-circle" label="Report an Issue" value="Report a problem or give feedback" />
        </InfoCard>

        <View style={styles.statusCard}>
          <Feather name="shield" size={27} color="#22C55E" />
          <View>
            <Text style={styles.statusTitle}>Account Status</Text>
            <Text style={styles.goodStanding}>Good Standing</Text>
            <Text style={styles.small}>You are in good standing. Keep up the great work!</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.86}>
          <Feather name="log-out" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>LOG OUT</Text>
        </TouchableOpacity>
        <View style={{ height: 76 }} />
      </ScrollView>
    </View>
  );
}

function InfoCard({ title, icon, status, children }: { title: string; icon: string; status?: string; children: React.ReactNode }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}><Feather name={icon as any} size={16} color="#FF6B00" /> {title}</Text>
        {!!status && <Text style={styles.statusPill}><Feather name="shield" size={12} color="#22C55E" /> {status}</Text>}
      </View>
      {children}
    </View>
  );
}

function Row({ icon, label, value, green }: { icon: string; label: string; value: string; green?: boolean }) {
  return (
    <View style={styles.row}>
      <Feather name={icon as any} size={16} color="#BDBDBD" />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, green && { color: "#22C55E" }]}>{value}</Text>
      <Feather name="chevron-right" size={16} color="#555" />
    </View>
  );
}

function ToggleRow({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.row}>
      <Feather name={icon as any} size={16} color="#BDBDBD" />
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.switch}><View style={styles.switchKnob} /></View>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { paddingHorizontal: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, minHeight: 36 },
  title: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_700Bold" },
  bell: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", right: 7, top: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: "#EF4444" },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.98)", borderRadius: 8, padding: 10, marginBottom: 8 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#2A2A2A", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 20, fontFamily: "Inter_700Bold" },
  name: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold" },
  small: { color: "#9A9A9A", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  driverId: { color: "#FF6B00", fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 1 },
  approved: { color: "#22C55E", fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  infoCard: { borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.98)", borderRadius: 8, padding: 10, marginBottom: 8 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  cardTitle: { color: "#FF6B00", fontSize: 12, fontFamily: "Inter_700Bold" },
  statusPill: { color: "#22C55E", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 34, borderTopWidth: 1, borderTopColor: "#202020" },
  rowLabel: { color: "#D8D8D8", fontSize: 11, fontFamily: "Inter_500Medium", flex: 1 },
  rowValue: { color: "#FFFFFF", fontSize: 10, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  orangeButton: { height: 38, borderRadius: 7, backgroundColor: "#FF6B00", alignItems: "center", justifyContent: "center", marginTop: 7 },
  orangeButtonText: { color: "#111", fontSize: 12, fontFamily: "Inter_700Bold" },
  outlineButton: { height: 38, borderRadius: 7, borderWidth: 1, borderColor: "#FF6B00", alignItems: "center", justifyContent: "center", marginTop: 7 },
  outlineButtonText: { color: "#FF6B00", fontSize: 12, fontFamily: "Inter_700Bold" },
  statsCard: { borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.98)", borderRadius: 8, padding: 10, marginBottom: 8 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 7 },
  statBox: { width: "49%", borderRadius: 8, backgroundColor: "#101010", padding: 9 },
  statLabel: { color: "#9A9A9A", fontSize: 10, fontFamily: "Inter_400Regular" },
  statValue: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 4 },
  switch: { width: 40, height: 24, borderRadius: 12, backgroundColor: "#FF6B00", padding: 3, alignItems: "flex-end" },
  switchKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFFFFF" },
  statusCard: { flexDirection: "row", gap: 10, borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.98)", borderRadius: 8, padding: 10, marginBottom: 8 },
  statusTitle: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_700Bold" },
  goodStanding: { color: "#22C55E", fontSize: 11, fontFamily: "Inter_700Bold", marginTop: 1 },
  logoutButton: { height: 44, borderRadius: 8, borderWidth: 1, borderColor: "#EF4444", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 2 },
  logoutText: { color: "#EF4444", fontSize: 12, fontFamily: "Inter_700Bold" },
});
*/
