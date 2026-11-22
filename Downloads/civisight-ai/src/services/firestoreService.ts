import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type {
  CivicComplaint,
  ComplaintStatus,
  RepairVerification,
  StatusHistoryEntry,
  UserProfile,
} from '../types/civic';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const BOOTSTRAPPED_ADMIN_EMAIL = 'manyacp2@gmail.com';

function timestampToIso(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

export function isBootstrappedAdminEmail(email?: string | null): boolean {
  return (email ?? '').toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL;
}

export async function getOrCreateUserProfile(
  uid: string,
  name: string,
  email: string
): Promise<UserProfile> {
  const userRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      // Check if user also has an explicit /admins grant
      let isAdminUser = data.role === 'admin' || isBootstrappedAdminEmail(email);
      if (!isAdminUser) {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', uid));
          if (adminSnap.exists()) isAdminUser = true;
        } catch {
          // Non-admin read may be denied; safely treat as citizen
        }
      }
      return {
        uid: String(data.uid),
        name: String(data.name || name || 'Citizen User'),
        email: String(data.email || email),
        role: isAdminUser ? 'admin' : 'citizen',
        department: typeof data.department === 'string' ? data.department : undefined,
        createdAt: timestampToIso(data.createdAt),
        updatedAt: timestampToIso(data.updatedAt),
      };
    }

    const assignedRole = isBootstrappedAdminEmail(email) ? 'admin' : 'citizen';
    const cleanName = (name || email.split('@')[0] || 'Citizen').trim().slice(0, 100);
    const cleanEmail = email.trim().slice(0, 160);

    await setDoc(userRef, {
      uid,
      name: cleanName,
      email: cleanEmail,
      role: assignedRole,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      uid,
      name: cleanName,
      email: cleanEmail,
      role: assignedRole,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

export async function updateUserName(uid: string, name: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, {
      name: name.trim().slice(0, 100),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

function mapComplaintDoc(id: string, data: Record<string, unknown>): CivicComplaint {
  return {
    complaintId: String(data.complaintId || id),
    userId: String(data.userId || ''),
    reporterName: String(data.reporterName || 'Citizen'),
    category: data.category as CivicComplaint['category'],
    description: String(data.description || ''),
    imageUrl: String(data.imageUrl || ''),
    location: String(data.location || ''),
    latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
    longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
    nearbyLandmarks: String(data.nearbyLandmarks || ''),
    severity: data.severity as CivicComplaint['severity'],
    severityScore: Number(data.severityScore || 0),
    civicRippleScore: Number(data.civicRippleScore || 0),
    impactAnalysis: data.impactAnalysis as CivicComplaint['impactAnalysis'],
    recommendations: Array.isArray(data.recommendations)
      ? data.recommendations.map((r) => String(r))
      : [],
    status: data.status as ComplaintStatus,
    assignedDepartment: String(data.assignedDepartment || 'Unassigned'),
    resolutionNotes: String(data.resolutionNotes || ''),
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
    isDemo: false,
  };
}

export async function saveComplaintWithHistory(
  complaint: Omit<CivicComplaint, 'createdAt' | 'updatedAt'>
): Promise<CivicComplaint> {
  const safeId = complaint.complaintId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  const complaintRef = doc(db, 'complaints', safeId);
  const submitHistoryId = `HIST-${safeId}-01`;
  const aiHistoryId = `HIST-${safeId}-02`;

  const payload = {
    complaintId: safeId,
    userId: complaint.userId,
    reporterName: complaint.reporterName.slice(0, 100),
    category: complaint.category,
    description: complaint.description.slice(0, 2000),
    imageUrl: complaint.imageUrl.slice(0, 2000),
    location: complaint.location.slice(0, 300),
    ...(typeof complaint.latitude === 'number' ? { latitude: complaint.latitude } : {}),
    ...(typeof complaint.longitude === 'number' ? { longitude: complaint.longitude } : {}),
    nearbyLandmarks: complaint.nearbyLandmarks.slice(0, 500),
    severity: complaint.severity,
    severityScore: Math.max(0, Math.min(100, Math.round(complaint.severityScore))),
    civicRippleScore: Math.max(0, Math.min(100, Math.round(complaint.civicRippleScore))),
    impactAnalysis: {
      ...complaint.impactAnalysis,
      rippleExplanation: complaint.impactAnalysis.rippleExplanation.slice(0, 3000),
    },
    recommendations: complaint.recommendations.slice(0, 10).map((r) => String(r).slice(0, 300)),
    status: complaint.status,
    assignedDepartment: (complaint.assignedDepartment || 'Pending Triage').slice(0, 120),
    resolutionNotes: (complaint.resolutionNotes || '').slice(0, 2000),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    batch.set(complaintRef, payload);

    batch.set(doc(db, 'statusHistory', submitHistoryId), {
      complaintId: safeId,
      complaintUserId: complaint.userId,
      status: 'Submitted',
      remarks: 'Citizen infrastructure report submitted with photographic evidence.',
      updatedBy: complaint.reporterName.slice(0, 100),
      updatedByUid: complaint.userId,
      timestamp: serverTimestamp(),
    });

    if (complaint.status === 'AI Analysed') {
      batch.set(doc(db, 'statusHistory', aiHistoryId), {
        complaintId: safeId,
        complaintUserId: complaint.userId,
        status: 'AI Analysed',
        remarks: `Gemini Vision and Civic Ripple Intelligence completed (Ripple Score: ${payload.civicRippleScore}/100).`,
        updatedBy: 'CIVISIGHT AI Engine',
        updatedByUid: complaint.userId,
        timestamp: serverTimestamp(),
      });
    }

    await batch.commit();

    return {
      ...complaint,
      complaintId: safeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: false,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `complaints/${safeId}`);
  }
}

export function subscribeToComplaints(
  user: UserProfile,
  onData: (complaints: CivicComplaint[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const complaintsCol = collection(db, 'complaints');
  const q =
    user.role === 'admin' && isBootstrappedAdminEmail(user.email)
      ? query(complaintsCol, orderBy('createdAt', 'desc'))
      : query(complaintsCol, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => mapComplaintDoc(d.id, d.data() as Record<string, unknown>));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'complaints');
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function getComplaintById(complaintId: string): Promise<CivicComplaint | null> {
  const cleanId = complaintId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!cleanId) return null;
  const ref = doc(db, 'complaints', cleanId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return mapComplaintDoc(snap.id, snap.data() as Record<string, unknown>);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `complaints/${cleanId}`);
  }
}

export async function getStatusHistoryForComplaint(
  complaintId: string,
  complaintUserId: string
): Promise<StatusHistoryEntry[]> {
  try {
    const q = query(
      collection(db, 'statusHistory'),
      where('complaintId', '==', complaintId),
      where('complaintUserId', '==', complaintUserId)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          historyId: d.id,
          complaintId: String(data.complaintId),
          complaintUserId: String(data.complaintUserId),
          status: data.status as ComplaintStatus,
          remarks: String(data.remarks || ''),
          updatedBy: String(data.updatedBy || ''),
          updatedByUid: String(data.updatedByUid || ''),
          timestamp: timestampToIso(data.timestamp),
          isDemo: false,
        };
      })
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  } catch (error) {
    // Non-owner tracking a complaint by ID cannot list private statusHistory; return empty gracefully
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Missing or insufficient permissions') || msg.includes('permission-denied')) {
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, 'statusHistory');
  }
}

export async function getVerificationsForComplaint(
  complaintId: string,
  complaintUserId: string
): Promise<RepairVerification[]> {
  try {
    const q = query(
      collection(db, 'verifications'),
      where('complaintId', '==', complaintId),
      where('complaintUserId', '==', complaintUserId)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          verificationId: d.id,
          complaintId: String(data.complaintId),
          complaintUserId: String(data.complaintUserId),
          originalImageUrl: String(data.originalImageUrl || ''),
          afterImageUrl: String(data.afterImageUrl || ''),
          result: data.result as RepairVerification['result'],
          visualDifferences: Array.isArray(data.visualDifferences)
            ? data.visualDifferences.map((x) => String(x))
            : [],
          explanation: String(data.explanation || ''),
          confidenceNote: String(data.confidenceNote || ''),
          verifiedByUid: String(data.verifiedByUid || ''),
          createdAt: timestampToIso(data.createdAt),
          isDemo: false,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Missing or insufficient permissions') || msg.includes('permission-denied')) {
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, 'verifications');
  }
}

export async function adminUpdateComplaintStatus(params: {
  complaint: CivicComplaint;
  newStatus: ComplaintStatus;
  assignedDepartment: string;
  resolutionNotes: string;
  adminUser: UserProfile;
}): Promise<void> {
  const { complaint, newStatus, assignedDepartment, resolutionNotes, adminUser } = params;
  const complaintRef = doc(db, 'complaints', complaint.complaintId);
  const historyId = `HIST-${complaint.complaintId}-${Date.now()}`;

  try {
    const batch = writeBatch(db);
    batch.update(complaintRef, {
      status: newStatus,
      assignedDepartment: assignedDepartment.trim().slice(0, 120) || 'Pending Triage',
      resolutionNotes: resolutionNotes.trim().slice(0, 2000),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'statusHistory', historyId), {
      complaintId: complaint.complaintId,
      complaintUserId: complaint.userId,
      status: newStatus,
      remarks:
        resolutionNotes.trim().slice(0, 1000) ||
        `Status updated to ${newStatus} (${assignedDepartment || 'Department assigned'}).`,
      updatedBy: `${adminUser.name} (Admin)`.slice(0, 100),
      updatedByUid: adminUser.uid,
      timestamp: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `complaints/${complaint.complaintId}`);
  }
}

export async function saveRepairVerification(params: {
  complaint: CivicComplaint;
  verification: Omit<RepairVerification, 'createdAt'>;
  verifierName: string;
}): Promise<RepairVerification> {
  const { complaint, verification, verifierName } = params;
  const verificationRef = doc(db, 'verifications', verification.verificationId);
  const complaintRef = doc(db, 'complaints', complaint.complaintId);
  const historyId = `HIST-${complaint.complaintId}-VER-${Date.now()}`;

  const nextStatus: ComplaintStatus =
    verification.result === 'Appears Resolved' ? 'Verified' : complaint.status;

  try {
    const batch = writeBatch(db);
    batch.set(verificationRef, {
      verificationId: verification.verificationId,
      complaintId: complaint.complaintId,
      complaintUserId: complaint.userId,
      originalImageUrl: verification.originalImageUrl.slice(0, 2000),
      afterImageUrl: verification.afterImageUrl.slice(0, 2000),
      result: verification.result,
      visualDifferences: verification.visualDifferences.slice(0, 12).map((s) => String(s).slice(0, 300)),
      explanation: verification.explanation.slice(0, 3000),
      confidenceNote: verification.confidenceNote.slice(0, 1000),
      verifiedByUid: verification.verifiedByUid,
      createdAt: serverTimestamp(),
    });

    if (nextStatus !== complaint.status) {
      batch.update(complaintRef, {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    }

    batch.set(doc(db, 'statusHistory', historyId), {
      complaintId: complaint.complaintId,
      complaintUserId: complaint.userId,
      status: nextStatus,
      remarks: `FixVerify AI visual check: ${verification.result}. ${verification.explanation.slice(0, 400)}`,
      updatedBy: verifierName.slice(0, 100),
      updatedByUid: verification.verifiedByUid,
      timestamp: serverTimestamp(),
    });

    await batch.commit();

    return {
      ...verification,
      createdAt: new Date().toISOString(),
      isDemo: false,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `verifications/${verification.verificationId}`);
  }
}
