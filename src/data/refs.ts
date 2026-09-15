import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from '@react-native-firebase/firestore';
import type { PaymentId, RentPeriodId, TenancyId, UserId } from '@domain/ids';
import { docConverter } from './converter';
import { firestoreDb } from './firestore';
import { paymentDocSchema, type PaymentDoc } from './schemas/payment';
import { rentPeriodDocSchema, type RentPeriodDoc } from './schemas/rentPeriod';
import { tenancyDocSchema, type TenancyDoc } from './schemas/tenancy';
import { userDocSchema, type UserDoc } from './schemas/user';

const usersConverter = docConverter(userDocSchema);
const tenanciesConverter = docConverter(tenancyDocSchema);
const rentPeriodsConverter = docConverter(rentPeriodDocSchema);
const rentPaymentsConverter = docConverter(paymentDocSchema);

// --- users -------------------------------------------------------------

export const usersCol = (): CollectionReference<UserDoc> =>
  collection(firestoreDb(), 'users').withConverter(usersConverter);

export const userDocRef = (id: UserId): DocumentReference<UserDoc> => doc(usersCol(), id);

// --- tenancies -----------------------------------------------------------

export const tenanciesCol = (): CollectionReference<TenancyDoc> =>
  collection(firestoreDb(), 'tenancies').withConverter(tenanciesConverter);

export const tenancyDocRef = (id: TenancyId): DocumentReference<TenancyDoc> =>
  doc(tenanciesCol(), id);

// --- rent periods --------------------------------------------------------

export const rentPeriodsCol = (): CollectionReference<RentPeriodDoc> =>
  collection(firestoreDb(), 'rentPeriods').withConverter(rentPeriodsConverter);

export const rentPeriodDocRef = (id: RentPeriodId): DocumentReference<RentPeriodDoc> =>
  doc(rentPeriodsCol(), id);

// --- rent payments ---------------------------------------------------------

export const rentPaymentsCol = (): CollectionReference<PaymentDoc> =>
  collection(firestoreDb(), 'rentPayments').withConverter(rentPaymentsConverter);

export const paymentDocRef = (id: PaymentId): DocumentReference<PaymentDoc> =>
  doc(rentPaymentsCol(), id);
