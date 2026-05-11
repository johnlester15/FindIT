import {
  arrayRemove,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { CATEGORIES } from "../constants/categories";
import { db } from "../config/firebase";
import { ClaimStatus, ReportType } from "../types";

type LostItemInput = {
  itemName: string;
  categoryId: string;
  categoryName: string;
  description: string;
  locationLost: string;
  dateLost: string;
  imageUrl: string;
};

type FoundItemInput = {
  itemName: string;
  categoryId: string;
  categoryName: string;
  description: string;
  locationFound: string;
  dateFound: string;
  imageUrl: string;
};

type ClaimInput = {
  claimantId: string;
  foundItemId: string;
  lostItemId?: string | null;
  claimMessage: string;
  proofImageUrl: string;
};

type ReportDecision = "approve" | "reject";

export async function seedCategories() {
  const batch = writeBatch(db);

  CATEGORIES.forEach((category) => {
    const categoryRef = doc(db, "categories", category.id);
    batch.set(
      categoryRef,
      {
        categoryId: category.id,
        name: category.name,
        description: `${category.name} lost and found items`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  await batch.commit();
}

export async function createLostItem(userId: string, data: LostItemInput) {
  const itemRef = doc(collection(db, "lostItems"));
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  const owner = userSnap.exists() ? userSnap.data() : {};

  await setDoc(itemRef, {
    lostItemId: itemRef.id,
    userId,
    userRef,
    posterName: owner.fullName ?? "Unknown user",
    posterPhotoUrl: owner.profileImageUrl ?? "",
    categoryId: data.categoryId,
    categoryName: data.categoryName,
    categoryRef: doc(db, "categories", data.categoryId),
    itemName: data.itemName,
    description: data.description,
    locationLost: data.locationLost,
    dateLost: data.dateLost,
    imageUrl: data.imageUrl,
    status: "pending",
    rejectionReason: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await createReportLog("lost", itemRef.id, "pending", userId, "Lost report submitted for admin review.");
  return itemRef.id;
}

export async function createFoundItem(reportedBy: string, data: FoundItemInput) {
  const itemRef = doc(collection(db, "foundItems"));
  const userRef = doc(db, "users", reportedBy);
  const userSnap = await getDoc(userRef);
  const owner = userSnap.exists() ? userSnap.data() : {};

  await setDoc(itemRef, {
    foundItemId: itemRef.id,
    reportedBy,
    reportedByRef: userRef,
    posterName: owner.fullName ?? "Unknown user",
    posterPhotoUrl: owner.profileImageUrl ?? "",
    categoryId: data.categoryId,
    categoryName: data.categoryName,
    categoryRef: doc(db, "categories", data.categoryId),
    itemName: data.itemName,
    description: data.description,
    locationFound: data.locationFound,
    dateFound: data.dateFound,
    imageUrl: data.imageUrl,
    status: "pending",
    rejectionReason: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await createReportLog("found", itemRef.id, "pending", reportedBy, "Found report submitted for admin review.");
  return itemRef.id;
}

export async function updateLostItem(lostItemId: string, data: LostItemInput, resetToPending = false) {
  const itemRef = doc(db, "lostItems", lostItemId);
  await updateDoc(itemRef, {
    categoryId: data.categoryId,
    categoryName: data.categoryName,
    categoryRef: doc(db, "categories", data.categoryId),
    itemName: data.itemName,
    description: data.description,
    locationLost: data.locationLost,
    dateLost: data.dateLost,
    imageUrl: data.imageUrl,
    ...(resetToPending ? { status: "pending", rejectionReason: "" } : {}),
    updatedAt: serverTimestamp(),
  });

  if (!resetToPending) {
    await generateMatchesForLostItem(lostItemId, data);
  }
}

export async function updateFoundItem(foundItemId: string, data: FoundItemInput, resetToPending = false) {
  const itemRef = doc(db, "foundItems", foundItemId);
  await updateDoc(itemRef, {
    categoryId: data.categoryId,
    categoryName: data.categoryName,
    categoryRef: doc(db, "categories", data.categoryId),
    itemName: data.itemName,
    description: data.description,
    locationFound: data.locationFound,
    dateFound: data.dateFound,
    imageUrl: data.imageUrl,
    ...(resetToPending ? { status: "pending", rejectionReason: "" } : {}),
    updatedAt: serverTimestamp(),
  });

  if (!resetToPending) {
    await generateMatchesForFoundItem(foundItemId, data);
  }
}

export async function updateReportReviewStatus(
  type: ReportType,
  id: string,
  decision: ReportDecision,
  performedBy: string,
  reason = ""
) {
  const collectionName = type === "found" ? "foundItems" : "lostItems";
  const itemRef = doc(db, collectionName, id);
  const itemSnap = await getDoc(itemRef);

  if (!itemSnap.exists()) {
    throw new Error("Report not found.");
  }

  const item = itemSnap.data();
  const nextStatus = type === "found"
    ? decision === "approve" ? "available" : "rejected"
    : decision === "approve" ? "open" : "rejected";

  await updateDoc(itemRef, {
    status: nextStatus,
    rejectionReason: decision === "reject" ? reason : "",
    reviewedBy: performedBy,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await createReportLog(type, id, nextStatus, performedBy, reason || `Report ${decision}d.`);

  if (decision === "approve") {
    if (type === "found") {
      await generateMatchesForFoundItem(id, item as FoundItemInput);
    } else {
      await generateMatchesForLostItem(id, item as LostItemInput);
    }
  }
}

async function deleteQueryBatch(collectionName: string, fieldName: string, value: string) {
  const docsToDelete = await getDocs(query(collection(db, collectionName), where(fieldName, "==", value)));
  if (docsToDelete.empty) return;

  const batch = writeBatch(db);
  docsToDelete.docs.forEach((snap) => batch.delete(snap.ref));
  await batch.commit();
}

export async function deleteLostItem(lostItemId: string) {
  try { await deleteQueryBatch("itemMatches", "lostItemId", lostItemId); } catch {}
  try { await deleteQueryBatch("reportLogs", "reportId", lostItemId); } catch {}
  await deleteDoc(doc(db, "lostItems", lostItemId));
}

export async function deleteFoundItem(foundItemId: string) {
  try { await deleteQueryBatch("itemMatches", "foundItemId", foundItemId); } catch {}
  try { await deleteQueryBatch("reportLogs", "reportId", foundItemId); } catch {}
  await deleteDoc(doc(db, "foundItems", foundItemId));
}

export async function archiveFoundItem(foundItemId: string) {
  await updateDoc(doc(db, "foundItems", foundItemId), {
    status: "archived",
    updatedAt: serverTimestamp(),
  });
}

export async function closeLostItem(lostItemId: string) {
  await updateDoc(doc(db, "lostItems", lostItemId), {
    status: "closed",
    updatedAt: serverTimestamp(),
  });
}

export async function createClaimRequest(input: ClaimInput) {
  const claimRef = doc(collection(db, "claimRequests"));
  const foundItemRef = doc(db, "foundItems", input.foundItemId);
  const claimantRef = doc(db, "users", input.claimantId);
  const lostItemRef = input.lostItemId ? doc(db, "lostItems", input.lostItemId) : null;
  const logRef = doc(collection(db, "claimLogs"));
  const notificationRef = doc(collection(db, "notifications"));

  await runTransaction(db, async (transaction) => {
    const foundSnap = await transaction.get(foundItemRef);
    const claimantSnap = await transaction.get(claimantRef);

    if (!foundSnap.exists()) throw new Error("Found item no longer exists.");
    if (!claimantSnap.exists()) throw new Error("User profile not found.");

    const found = foundSnap.data();
    const claimant = claimantSnap.data();

    if (found.status !== "available") {
      throw new Error("This item is not available for claiming yet.");
    }

    transaction.set(claimRef, {
      claimId: claimRef.id,
      claimantId: input.claimantId,
      claimantRef,
      claimantName: claimant.fullName ?? "Unknown user",
      claimantEmail: claimant.email ?? "",
      foundItemId: input.foundItemId,
      foundItemRef,
      foundItemName: found.itemName ?? "Found item",
      foundItemLocation: found.locationFound ?? "",
      lostItemId: input.lostItemId ?? null,
      lostItemRef,
      claimMessage: input.claimMessage,
      proofImageUrl: input.proofImageUrl,
      status: "pending",
      adminRemarks: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Important: claiming no longer hides/removes the public post.
    // The found post remains visible until admin marks the item as returned.

    transaction.set(logRef, {
      logId: logRef.id,
      claimId: claimRef.id,
      claimRef,
      action: "Claim request created",
      previousStatus: null,
      newStatus: "pending",
      performedBy: input.claimantId,
      performedByRef: claimantRef,
      createdAt: serverTimestamp(),
    });

    transaction.set(notificationRef, {
      notificationId: notificationRef.id,
      userId: input.claimantId,
      userRef: claimantRef,
      title: "Claim Submitted",
      message: `Your claim for ${found.itemName ?? "an item"} was submitted for admin review.`,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  });

  return claimRef.id;
}

export async function updateClaimStatus(claimId: string, newStatus: ClaimStatus, performedBy: string, remarks = "") {
  const claimRef = doc(db, "claimRequests", claimId);
  const performerRef = doc(db, "users", performedBy);
  const logRef = doc(collection(db, "claimLogs"));
  const notificationRef = doc(collection(db, "notifications"));

  await runTransaction(db, async (transaction) => {
    const claimSnap = await transaction.get(claimRef);
    if (!claimSnap.exists()) throw new Error("Claim transaction not found.");

    const claim = claimSnap.data();
    const previousStatus = claim.status;
    const foundItemRef = doc(db, "foundItems", claim.foundItemId);
    const lostItemRef = claim.lostItemId ? doc(db, "lostItems", claim.lostItemId) : null;

    const updateData: Record<string, any> = {
      status: newStatus,
      adminRemarks: remarks,
      updatedAt: serverTimestamp(),
    };

    if (newStatus === "returned") updateData.returnedAt = serverTimestamp();

    transaction.update(claimRef, updateData);

    // Do not hide the post on pending/approved/rejected/cancelled.
    // Only mark it returned/closed once the item was really returned.
    if (newStatus === "returned") {
      transaction.update(foundItemRef, {
        status: "returned",
        updatedAt: serverTimestamp(),
      });
      if (lostItemRef) {
        transaction.update(lostItemRef, {
          status: "closed",
          updatedAt: serverTimestamp(),
        });
      }
    }

    transaction.set(logRef, {
      logId: logRef.id,
      claimId,
      claimRef,
      action: `Claim status changed to ${newStatus}`,
      previousStatus,
      newStatus,
      performedBy,
      performedByRef: performerRef,
      createdAt: serverTimestamp(),
    });

    transaction.set(notificationRef, {
      notificationId: notificationRef.id,
      userId: claim.claimantId,
      userRef: doc(db, "users", claim.claimantId),
      title: "Claim Status Updated",
      message: `Your claim for ${claim.foundItemName ?? "an item"} is now ${newStatus.replace("_", " ")}.`,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  });
}

export async function createOrGetConversation(input: {
  reportType: ReportType;
  reportId: string;
  itemName: string;
  ownerId: string;
  requesterId: string;
}) {
  if (input.ownerId === input.requesterId) {
    throw new Error("You cannot message yourself on your own report.");
  }

  const members = [input.ownerId, input.requesterId].sort().join("_");
  const conversationId = `${input.reportType}_${input.reportId}_${members}`;
  const conversationRef = doc(db, "conversations", conversationId);
  const snap = await getDoc(conversationRef);

  if (!snap.exists()) {
    await setDoc(conversationRef, {
      conversationId,
      reportType: input.reportType,
      reportId: input.reportId,
      itemName: input.itemName,
      ownerId: input.ownerId,
      requesterId: input.requesterId,
      participantIds: [input.ownerId, input.requesterId],
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      unreadBy: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return conversationId;
}

export async function sendChatMessage(conversationId: string, senderId: string, text: string) {
  const cleaned = text.trim();
  if (!cleaned) throw new Error("Message is empty.");

  const conversationRef = doc(db, "conversations", conversationId);
  const messageRef = doc(collection(db, "messages"));

  await runTransaction(db, async (transaction) => {
    const conversationSnap = await transaction.get(conversationRef);
    if (!conversationSnap.exists()) throw new Error("Conversation not found.");

    const conversation = conversationSnap.data();
    if (!conversation.participantIds?.includes(senderId)) {
      throw new Error("You are not part of this conversation.");
    }

    transaction.set(messageRef, {
      messageId: messageRef.id,
      conversationId,
      senderId,
      text: cleaned,
      createdAt: serverTimestamp(),
    });

    const unreadBy = (conversation.participantIds ?? []).filter((participantId: string) => participantId !== senderId);

    transaction.update(conversationRef, {
      lastMessage: cleaned,
      lastMessageAt: serverTimestamp(),
      unreadBy,
      updatedAt: serverTimestamp(),
    });
  });
}


export async function markConversationRead(conversationId: string, userId: string) {
  if (!conversationId || !userId) return;
  await updateDoc(doc(db, "conversations", conversationId), {
    unreadBy: arrayRemove(userId),
    updatedAt: serverTimestamp(),
  });
}

async function createReportLog(type: ReportType, reportId: string, status: string, performedBy: string, note: string) {
  try {
    const logRef = doc(collection(db, "reportLogs"));
    await setDoc(logRef, {
      logId: logRef.id,
      reportId,
      reportType: type,
      status,
      note,
      performedBy,
      performedByRef: doc(db, "users", performedBy),
      createdAt: serverTimestamp(),
    });
  } catch {
    // Logs are helpful, but they should never block the main action during testing.
  }
}

async function generateMatchesForLostItem(lostItemId: string, data: LostItemInput) {
  const q = query(collection(db, "foundItems"), where("categoryId", "==", data.categoryId));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  let writes = 0;

  snapshot.docs.forEach((foundDoc) => {
    const found = foundDoc.data();
    if (found.status !== "available") return;

    const score = calculateMatchScore(data.itemName, data.locationLost, found.itemName, found.locationFound);
    if (score < 45) return;

    const matchRef = doc(db, "itemMatches", `${lostItemId}_${foundDoc.id}`);
    writes += 1;
    batch.set(
      matchRef,
      {
        matchId: matchRef.id,
        lostItemId,
        lostItemRef: doc(db, "lostItems", lostItemId),
        foundItemId: foundDoc.id,
        foundItemRef: doc(db, "foundItems", foundDoc.id),
        matchScore: score,
        status: "suggested",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  if (writes > 0) await batch.commit();
}

async function generateMatchesForFoundItem(foundItemId: string, data: FoundItemInput) {
  const q = query(collection(db, "lostItems"), where("categoryId", "==", data.categoryId));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  let writes = 0;

  snapshot.docs.forEach((lostDoc) => {
    const lost = lostDoc.data();
    if (lost.status !== "open" && lost.status !== "matched") return;

    const score = calculateMatchScore(lost.itemName, lost.locationLost, data.itemName, data.locationFound);
    if (score < 45) return;

    const matchRef = doc(db, "itemMatches", `${lostDoc.id}_${foundItemId}`);
    writes += 1;
    batch.set(
      matchRef,
      {
        matchId: matchRef.id,
        lostItemId: lostDoc.id,
        lostItemRef: doc(db, "lostItems", lostDoc.id),
        foundItemId,
        foundItemRef: doc(db, "foundItems", foundItemId),
        matchScore: score,
        status: "suggested",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  if (writes > 0) await batch.commit();
}

function calculateMatchScore(nameA = "", locationA = "", nameB = "", locationB = "") {
  let score = 40;
  const wordsA = normalizeWords(nameA);
  const wordsB = normalizeWords(nameB);
  const locationWordsA = normalizeWords(locationA);
  const locationWordsB = normalizeWords(locationB);

  const commonNameWords = wordsA.filter((word) => wordsB.includes(word)).length;
  const commonLocationWords = locationWordsA.filter((word) => locationWordsB.includes(word)).length;

  score += commonNameWords * 20;
  score += commonLocationWords * 10;

  return Math.min(score, 100);
}

function normalizeWords(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(" ")
    .filter((word) => word.length > 2);
}
