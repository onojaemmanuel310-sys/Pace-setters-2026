export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type UserRoleType = 'admin' | 'member';
export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface GraduateRegistration {
  id: string;
  user_id: string;
  full_name: string;
  department: string;
  matric_number: string;
  email: string;
  bio?: string | null;
  phone?: string | null;
  approval_status: ApprovalStatus;
  rejection_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GraduateProfile {
  id: string;
  user_id: string;
  username?: string | null;
  full_name: string;
  department: string;
  profile_photo_url?: string | null;
  bio?: string | null;
  phone?: string | null;
  privacy_settings: {
    show_phone: boolean;
    show_matric: boolean;
  };
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface GraduatePhoto {
  id: string;
  user_id: string;
  storage_path: string;
  image_url: string;
  caption?: string | null;
  is_approved: boolean;
  is_removed: boolean;
  created_at: string;
  graduate_profiles?: {
    full_name: string;
    department: string;
  } | null;
}

export interface GraduateMemory {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: 'General' | 'Graduation Story' | 'Class Event' | 'Appreciation' | 'Milestone' | 'Lesson Learned' | 'Friendship';
  photo_url?: string | null;
  moderation_status: ModerationStatus;
  created_at: string;
  updated_at: string;
  graduate_profiles?: {
    full_name: string;
    department: string;
  } | null;
}

export interface GraduateAchievement {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: 'Academic' | 'Career' | 'Certification' | 'Business' | 'Award' | 'Community Service' | 'Other';
  moderation_status: ModerationStatus;
  created_at: string;
  graduate_profiles?: {
    full_name: string;
    department: string;
  } | null;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: UserRoleType;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  administrator_id?: string | null;
  action: string;
  target_user_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}
