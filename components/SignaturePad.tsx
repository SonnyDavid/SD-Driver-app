import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { captureRef } from "react-native-view-shot";

import { flow } from "@/components/DriverFlowUI";

type Point = { x: number; y: number };

function pointsToPath(points: Point[]) {
  if (points.length < 2) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

type SignaturePadProps = {
  onSave: (uri: string) => void | Promise<void>;
  onClear?: () => void;
  savedUri?: string | null;
  height?: number;
  disabled?: boolean;
  onSigningChange?: (signing: boolean) => void;
  storageFolder?: string;
};

export function SignaturePad({
  onSave,
  onClear,
  savedUri,
  height = 160,
  disabled = false,
  onSigningChange,
  storageFolder = "signatures",
}: SignaturePadProps) {
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [locked, setLocked] = useState(!!savedUri);
  const [isSaving, setIsSaving] = useState(false);
  const padRef = useRef<View>(null);

  const canDraw = !locked && !isSaving && !disabled;
  const hasInk = strokes.some((s) => s.length > 1) || currentStroke.length > 1;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canDraw,
        onMoveShouldSetPanResponder: () => canDraw,
        onStartShouldSetPanResponderCapture: () => canDraw,
        onMoveShouldSetPanResponderCapture: () => canDraw,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          onSigningChange?.(true);
          const { locationX, locationY } = evt.nativeEvent;
          setCurrentStroke([{ x: locationX, y: locationY }]);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          setCurrentStroke((prev) => [...prev, { x: locationX, y: locationY }]);
        },
        onPanResponderRelease: () => {
          onSigningChange?.(false);
          setCurrentStroke((prev) => {
            if (prev.length > 1) setStrokes((s) => [...s, prev]);
            return [];
          });
        },
        onPanResponderTerminate: () => {
          onSigningChange?.(false);
          setCurrentStroke((prev) => {
            if (prev.length > 1) setStrokes((s) => [...s, prev]);
            return [];
          });
        },
      }),
    [canDraw, onSigningChange]
  );

  function handleClear() {
    setStrokes([]);
    setCurrentStroke([]);
    setLocked(false);
    onClear?.();
  }

  async function handleSave() {
    if (locked || disabled) return;
    if (!hasInk || !padRef.current) {
      Alert.alert("Signature required", "Please draw a signature before saving.");
      return;
    }

    setIsSaving(true);
    try {
      const tmpUri = await captureRef(padRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      const baseDir = FileSystem.documentDirectory;
      let dest = tmpUri;
      if (baseDir) {
        const dir = `${baseDir}${storageFolder}/`;
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        dest = `${dir}signature-${Date.now()}.png`;
        await FileSystem.copyAsync({ from: tmpUri, to: dest });
      }
      setLocked(true);
      await onSave(dest);
    } catch {
      Alert.alert("Save failed", "Could not save the signature. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const displayUri = locked && savedUri ? savedUri : null;

  return (
    <View style={styles.wrap}>
      <View
        ref={padRef}
        style={[styles.pad, { height }]}
        collapsable={false}
        {...(canDraw ? panResponder.panHandlers : {})}
      >
        {displayUri ? (
          <Image source={{ uri: displayUri }} style={styles.savedImage} resizeMode="contain" />
        ) : (
          <>
            <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
              {[...strokes, currentStroke]
                .filter((stroke) => stroke.length > 1)
                .map((stroke, index) => (
                  <Path
                    key={`stroke-${index}`}
                    d={pointsToPath(stroke)}
                    stroke="#FFFFFF"
                    strokeWidth={2.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
            </Svg>
            {!hasInk ? (
              <>
                <Text style={styles.placeholder}>Draw Signature Here</Text>
                <View style={styles.baseline} />
              </>
            ) : (
              <View style={styles.baseline} />
            )}
          </>
        )}
        {disabled ? (
          <View style={styles.disabledOverlay}>
            <Feather name="lock" size={18} color={flow.muted} />
            <Text style={styles.disabledText}>Verify PIN to unlock signature</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, disabled && styles.actionBtnDisabled]}
          onPress={handleClear}
          activeOpacity={0.88}
          disabled={isSaving || disabled}
        >
          <Text style={styles.actionText}>Clear Signature</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.saveBtn,
            (locked || isSaving || disabled) && styles.actionBtnDisabled,
          ]}
          onPress={handleSave}
          activeOpacity={0.88}
          disabled={locked || isSaving || disabled}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={flow.cyan} />
          ) : (
            <>
              <Feather name="save" size={12} color={flow.cyan} />
              <Text style={[styles.actionText, styles.saveText]}>Save Signature</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  pad: {
    borderRadius: flow.radius,
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  savedImage: { width: "100%", height: "100%" },
  placeholder: {
    color: flow.muted2,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    position: "absolute",
    top: "38%",
  },
  baseline: {
    position: "absolute",
    bottom: 28,
    left: 16,
    right: 16,
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderColor: flow.line,
  },
  disabledOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,3,4,0.82)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
  },
  disabledText: {
    color: flow.muted,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: flow.line,
    backgroundColor: flow.panel,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  saveBtn: {
    borderColor: flow.cyan,
    backgroundColor: "rgba(20,200,243,0.12)",
  },
  actionBtnDisabled: { opacity: 0.55 },
  actionText: { color: flow.text, fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  saveText: { color: flow.cyan },
});
