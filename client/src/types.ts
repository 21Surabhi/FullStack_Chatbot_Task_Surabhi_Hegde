export type Status = 'new' | 'contacted' | 'closed';

export interface Enquiry {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  service: string;
  message: string;
  status: Status;
  created_at: string;
}

export interface Paged {
  items: Enquiry[];
  total: number;
  page: number;
  pages: number;
}

export const SERVICES = [
  { value: 'aerial_media', label: 'Aerial photography & videography' },
  { value: 'mapping_survey', label: 'Drone mapping & survey' },
  { value: 'training', label: 'Drone pilot training' },
  { value: 'events', label: 'Event coverage' },
  { value: 'other', label: 'Other' },
];

export const serviceLabel = (v: string) => SERVICES.find((s) => s.value === v)?.label ?? v;