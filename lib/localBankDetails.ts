import AsyncStorage from "@react-native-async-storage/async-storage";

export type LocalBankDetails = {
  bankName: string;
  accountNumber: string;
  sortCode: string;
};

const DEFAULT_BANK_DETAILS: LocalBankDetails = {
  bankName: "HSBC",
  accountNumber: "12344321",
  sortCode: "40-47-21",
};

function storageKey(driverId: string) {
  return `sd_bank_details_${driverId}`;
}

export function maskAccountNumber(accountNumber: string) {
  const digits = accountNumber.replace(/\D/g, "");
  const last4 = digits.slice(-4) || "4321";
  return `•••• ${last4}`;
}

export function maskSortCode(sortCode: string) {
  const parts = sortCode.replace(/[^\d-]/g, "").split("-").filter(Boolean);
  if (parts.length >= 3) {
    return `••-••-${parts[2].slice(-2)}`;
  }
  const digits = sortCode.replace(/\D/g, "");
  if (digits.length >= 2) {
    return `••-••-${digits.slice(-2)}`;
  }
  return "••-••-21";
}

export async function loadLocalBankDetails(driverId: string): Promise<LocalBankDetails> {
  const raw = await AsyncStorage.getItem(storageKey(driverId));
  if (!raw) return { ...DEFAULT_BANK_DETAILS };
  try {
    return { ...DEFAULT_BANK_DETAILS, ...(JSON.parse(raw) as LocalBankDetails) };
  } catch {
    return { ...DEFAULT_BANK_DETAILS };
  }
}

export async function saveLocalBankDetails(
  driverId: string,
  details: LocalBankDetails
): Promise<LocalBankDetails> {
  const next = {
    bankName: details.bankName.trim(),
    accountNumber: details.accountNumber.replace(/\D/g, ""),
    sortCode: details.sortCode.trim(),
  };
  await AsyncStorage.setItem(storageKey(driverId), JSON.stringify(next));
  return next;
}
