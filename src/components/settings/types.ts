export interface CompanyData {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
  whatsappSetupComplete: boolean;
  whatsappPhoneNumber: string | null;
  whatsappVerifiedName: string | null;
  whatsappProvider: string | null;
  email: string | null;
  contactNumber: string | null;
  address: string | null;
  website: string | null;
}

export interface PersonalData {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  image: string | null;
  contactNumber: string | null;
  createdAt: string;
}

export interface CompanyProfileForm {
  name: string;
  slug: string;
  email: string;
  contactNumber: string;
  address: string;
  website: string;
}

export interface PersonalProfileForm {
  name: string;
  email: string;
  contactNumber: string;
  image: string;
}
