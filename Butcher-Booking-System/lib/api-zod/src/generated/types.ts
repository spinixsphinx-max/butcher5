/**
 * Generated types for Butcher Booking Management API
 */

export interface AllocateInput {
  date?: string;
  forceReallocate?: boolean;
}

export interface ApiError {
  error: string;
}

export type BookingStatus = typeof BookingStatus[keyof typeof BookingStatus];

export const BookingStatus = {
  active: 'active',
  completed: 'completed',
  cancelled: 'cancelled',
} as const;

export interface Booking {
  id: number;
  customerName: string;
  phoneNumber: string;
  animalType: string;
  animalCount: number;
  /** @nullable */
  notes?: string | null;
  status: BookingStatus;
  /** @nullable */
  assignedLine?: number | null;
  /** @nullable */
  assignedTime?: string | null;
  bookingDate?: string;
  /** @nullable */
  slotOrder?: number | null;
  earlySlotCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface BookingInput {
  /**
   * @minLength 1
   * @maxLength 100
   */
  customerName: string;
  /**
   * @minLength 7
   * @maxLength 20
   */
  phoneNumber: string;
  /**
   * @minLength 1
   * @maxLength 50
   */
  animalType: string;
  /**
   * @minimum 1
   * @maximum 50
   */
  animalCount: number;
  /** @maxLength 500 */
  notes?: string;
  bookingDate?: string;
}

export interface BookingRules {
  id: number;
  earlySlotCutoff: string;
  maxAnimalsPerCustomer: number;
  cooldownPeriodDays: number;
  maxBookingsPerDay: number;
  allowSameCustomerSameDay: boolean;
  updatedAt?: string;
}

export interface BookingRulesInput {
  earlySlotCutoff?: string;
  /**
   * @minimum 1
   * @maximum 100
   */
  maxAnimalsPerCustomer?: number;
  /**
   * @minimum 0
   * @maximum 365
   */
  cooldownPeriodDays?: number;
  /**
   * @minimum 1
   * @maximum 200
   */
  maxBookingsPerDay?: number;
  allowSameCustomerSameDay?: boolean;
}

export interface BookingUpdate {
  /**
   * @minLength 1
   * @maxLength 100
   */
  customerName?: string;
  /**
   * @minLength 7
   * @maxLength 20
   */
  phoneNumber?: string;
  /**
   * @minLength 1
   * @maxLength 50
   */
  animalType?: string;
  /**
   * @minimum 1
   * @maximum 50
   */
  animalCount?: number;
  /** @maxLength 500 */
  notes?: string;
  /** @nullable */
  assignedLine?: number | null;
  /** @nullable */
  assignedTime?: string | null;
  bookingDate?: string;
}

export interface BreakPeriod {
  startTime: string;
  endTime: string;
  label?: string;
}

export interface DashboardStats {
  totalBookingsToday: number;
  totalCompleted: number;
  remaining: number;
  totalAnimals: number;
  line1Count: number;
  line2Count: number;
  date: string;
}

export type GetAvailableSlotsParams = {
  date?: string;
};

export type GetDashboardStatsParams = {
  date?: string;
};

export type GetLineStatsParams = {
  date?: string;
};

export interface HealthStatus {
  status: string;
}

export interface LineStat {
  line: number;
  totalBookings: number;
  completed: number;
  remaining: number;
  totalAnimals: number;
}

export type ListBookingsStatus = typeof ListBookingsStatus[keyof typeof ListBookingsStatus];

export const ListBookingsStatus = {
  active: 'active',
  completed: 'completed',
  cancelled: 'cancelled',
} as const;

export type ListBookingsParams = {
  status?: ListBookingsStatus;
  date?: string;
  search?: string;
  line?: number;
};

export interface Schedule {
  id: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  breaks: BreakPeriod[];
  updatedAt?: string;
}

export interface ScheduleInput {
  startTime: string;
  endTime: string;
  /**
   * @minimum 5
   * @maximum 240
   */
  slotDuration: number;
  breaks?: BreakPeriod[];
}

export interface TimeSlot {
  time: string;
  line: number;
  available: boolean;
  /** @nullable */
  bookingId?: number | null;
  /** @nullable */
  customerName?: string | null;
}
