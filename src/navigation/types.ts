import type { ConfirmationResult } from '@react-native-firebase/auth';

export type AuthStackParamList = {
  PhoneEntry: undefined;
  Otp: { phoneNumber: string; confirmation: ConfirmationResult };
};

export type AppStackParamList = {
  OwnerHome: undefined;
  TenantHome: undefined;
  Ledger: { tenancyId: string };
};
