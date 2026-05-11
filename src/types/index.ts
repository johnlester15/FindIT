export type UserRole = "user" | "admin";

export type UserProfile = {
  uid: string;
  fullName: string;
  studentId: string;
  email: string;
  role: UserRole;
  profileImageUrl?: string;
  status: "active" | "disabled";
  createdAt?: any;
  updatedAt?: any;
};

export type ReportType = "lost" | "found";

export type LostItemStatus = "pending" | "open" | "matched" | "claimed" | "closed" | "rejected";
export type FoundItemStatus = "pending" | "available" | "under_review" | "returned" | "archived" | "rejected";

export type LostItem = {
  id: string;
  lostItemId?: string;
  userId: string;
  userRef?: any;
  posterName?: string;
  posterPhotoUrl?: string;
  userName?: string;
  userPhotoUrl?: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
  categoryRef?: any;
  description: string;
  locationLost: string;
  dateLost: string;
  imageUrl?: string;
  status: LostItemStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: any;
  createdAt?: any;
  updatedAt?: any;
};

export type FoundItem = {
  id: string;
  foundItemId?: string;
  reportedBy: string;
  reportedByRef?: any;
  posterName?: string;
  posterPhotoUrl?: string;
  reportedByName?: string;
  reportedByPhotoUrl?: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
  categoryRef?: any;
  description: string;
  locationFound: string;
  dateFound: string;
  imageUrl?: string;
  status: FoundItemStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: any;
  createdAt?: any;
  updatedAt?: any;
};

export type ClaimStatus = "pending" | "under_review" | "approved" | "rejected" | "returned" | "cancelled";

export type ClaimRequest = {
  id: string;
  claimantId: string;
  claimantRef?: any;
  claimantName: string;
  claimantEmail: string;
  foundItemId: string;
  foundItemRef?: any;
  foundItemName: string;
  foundItemLocation: string;
  lostItemId?: string | null;
  lostItemRef?: any;
  claimMessage: string;
  proofImageUrl?: string;
  status: ClaimStatus;
  adminRemarks?: string;
  createdAt?: any;
  updatedAt?: any;
  returnedAt?: any;
};

export type Conversation = {
  id: string;
  conversationId?: string;
  reportType: ReportType;
  reportId: string;
  itemName: string;
  ownerId: string;
  requesterId: string;
  participantIds: string[];
  unreadBy?: string[];
  lastMessage?: string;
  lastMessageAt?: any;
  createdAt?: any;
  updatedAt?: any;
};

export type ChatMessage = {
  id: string;
  messageId?: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt?: any;
};
