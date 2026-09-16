import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  time,
  date,
  jsonb,
  pgEnum,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const roleEnum = pgEnum('role', ['admin', 'manager', 'staff']);
export const shiftStatusEnum = pgEnum('shift_status', ['draft', 'published']);
export const assignmentStatusEnum = pgEnum('assignment_status', [
  'assigned',
  'confirmed',
  'dropped',
]);
export const swapTypeEnum = pgEnum('swap_type', ['swap', 'drop']);
export const swapStatusEnum = pgEnum('swap_status', [
  'pending',
  'accepted',
  'approved',
  'rejected',
  'cancelled',
  'expired',
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: roleEnum('role').notNull().default('staff'),
  timezonePref: text('timezone_pref').notNull().default('UTC'),
  notifyEmail: boolean('notify_email').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const locations = pgTable('locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull(),
  address: text('address'),
});

export const userLocations = pgTable('user_locations', {
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.id, { onDelete: 'cascade' }),
  isCertified: boolean('is_certified').notNull().default(true),
  certifiedAt: timestamp('certified_at', { withTimezone: true }).defaultNow().notNull(),
  decertifiedAt: timestamp('decertified_at', { withTimezone: true }),
});

export const skills = pgTable('skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
});

export const userSkills = pgTable('user_skills', {
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  skillId: uuid('skill_id')
    .notNull()
    .references(() => skills.id, { onDelete: 'cascade' }),
});

export const shifts = pgTable('shifts', {
  id: uuid('id').defaultRandom().primaryKey(),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.id, { onDelete: 'cascade' }),
  requiredSkillId: uuid('required_skill_id')
    .notNull()
    .references(() => skills.id),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  headcountNeeded: integer('headcount_needed').notNull().default(1),
  status: shiftStatusEnum('status').notNull().default('draft'),
  createdBy: uuid('created_by').references(() => users.id),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  editCutoffHours: integer('edit_cutoff_hours').notNull().default(48),
});

export const shiftAssignments = pgTable('shift_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  shiftId: uuid('shift_id')
    .notNull()
    .references(() => shifts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: assignmentStatusEnum('status').notNull().default('assigned'),
  assignedBy: uuid('assigned_by').references(() => users.id),
  clockInAt: timestamp('clock_in_at', { withTimezone: true }),
  clockOutAt: timestamp('clock_out_at', { withTimezone: true }),
});

export const availabilityWindows = pgTable('availability_windows', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(), /* 0 = Sunday, 6 = Saturday */
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  effectiveFrom: date('effective_from').notNull(),
  effectiveUntil: date('effective_until'),
});

export const availabilityOverrides = pgTable('availability_overrides', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  isAvailable: boolean('is_available').notNull(),
  startTime: time('start_time'),
  endTime: time('end_time'),
});

export const swapRequests = pgTable('swap_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  requesterId: uuid('requester_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  assignmentId: uuid('assignment_id')
    .notNull()
    .references(() => shiftAssignments.id, { onDelete: 'cascade' }),
  targetUserId: uuid('target_user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: swapTypeEnum('type').notNull(),
  status: swapStatusEnum('status').notNull().default('pending'),
  requesterNote: text('requester_note'),
  managerNote: text('manager_note'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  payload: jsonb('payload'),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  actorId: uuid('actor_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/* Relations for easy querying with Drizzle */
export const usersRelations = relations(users, ({ many }) => ({
  locations: many(userLocations),
  skills: many(userSkills),
  assignments: many(shiftAssignments),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  staff: many(userLocations),
  shifts: many(shifts),
}));

export const shiftRelations = relations(shifts, ({ one, many }) => ({
  location: one(locations, {
    fields: [shifts.locationId],
    references: [locations.id],
  }),
  requiredSkill: one(skills, {
    fields: [shifts.requiredSkillId],
    references: [skills.id],
  }),
  assignments: many(shiftAssignments),
}));

export const assignmentRelations = relations(shiftAssignments, ({ one }) => ({
  shift: one(shifts, {
    fields: [shiftAssignments.shiftId],
    references: [shifts.id],
  }),
  user: one(users, {
    fields: [shiftAssignments.userId],
    references: [users.id],
  }),
}));
