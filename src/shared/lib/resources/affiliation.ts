import { Organization } from 'shared/lib/resources/organization';
import { User } from 'shared/lib/resources/user';
import { BodyWithErrors, Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation';

export enum MembershipType {
  Owner = 'OWNER',
  Member = 'MEMBER'
}

export enum MembershipStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Pending = 'PENDING'
}

export interface Affiliation {
  id: Id;
  createdAt: Date;
  user: User;
  organization: Organization;
  membershipType: MembershipType;
  membershipStatus: MembershipStatus;
}

// Used when returning a list of the current user's affiliations
export interface AffiliationSlim {
  id: Id;
  membershipType: MembershipType;
  organization: Pick<Organization, 'id' | 'legalName'>;
}

export interface AffiliationMember {
  id: Id;
  membershipType: MembershipType;
  membershipStatus: MembershipStatus;
  user: Pick<User, 'id' | 'name' | 'avatarImageFile' | 'capabilities'>;
}

export interface CreateRequestBody {
  userEmail: string;
  organization: string;
  membershipType: MembershipType;
}

export interface CreateValidationErrors extends ErrorTypeFrom<CreateRequestBody>, BodyWithErrors {
  inviteeNotRegistered?: string[];
  affiliation?: string[];
}

export interface UpdateValidationErrors extends BodyWithErrors {
  affiliation?: string[];
}

export interface DeleteValidationErrors extends BodyWithErrors {
  affiliation?: string[];
}

export function parseMembershipType(raw: string): MembershipType | null {
  switch (raw) {
    case MembershipType.Member:
      return MembershipType.Member;
    case MembershipType.Owner:
      return MembershipType.Owner;
    default:
      return null;
  }
}
