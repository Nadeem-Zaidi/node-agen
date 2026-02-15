import { Migration } from "../types/types";

/**
 * Migration: Create workorder table
 * Version: 20260216140000
 */
export const migration_20260216140000: Migration = {
  version: "20260216140000",
  description: "Create workorder table",
  
  up: [
    `CREATE TABLE workorder (
      wonum VARCHAR(20) PRIMARY KEY,
      description TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'WAPPR',
      pmnum VARCHAR(20),
      targetstartdate TIMESTAMP,
      targetfinishdate TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE INDEX idx_workorder_status ON workorder(status)`,
    `CREATE INDEX idx_workorder_pmnum ON workorder(pmnum)`
  ],
  
  down: [
    `DROP TABLE IF EXISTS workorder CASCADE`
  ]
};

export const migration_20260216160000: Migration = {
  version: "20260216160000",
  description: "Seed workorder table with sample data",
  
  up: [
    // WAPPR (Waiting for Approval) - 10 records
    `INSERT INTO workorder (wonum, description, status, pmnum, targetstartdate, targetfinishdate) VALUES
    ('WO-2024-001', 'Replace HVAC filters in Building A', 'WAPPR', 'PM-001', '2024-03-01 08:00:00', '2024-03-01 12:00:00'),
    ('WO-2024-002', 'Inspect fire extinguishers on all floors', 'WAPPR', 'PM-002', '2024-03-02 09:00:00', '2024-03-02 17:00:00'),
    ('WO-2024-003', 'Quarterly electrical panel inspection', 'WAPPR', 'PM-003', '2024-03-05 07:30:00', '2024-03-05 16:30:00'),
    ('WO-2024-004', 'Emergency exit light testing', 'WAPPR', NULL, '2024-03-06 08:00:00', '2024-03-06 14:00:00'),
    ('WO-2024-005', 'Roof drainage system cleaning', 'WAPPR', 'PM-005', '2024-03-08 08:00:00', '2024-03-08 17:00:00'),
    ('WO-2024-006', 'Parking lot lighting repair', 'WAPPR', NULL, '2024-03-10 07:00:00', '2024-03-10 11:00:00'),
    ('WO-2024-007', 'Generator monthly load test', 'WAPPR', 'PM-007', '2024-03-12 10:00:00', '2024-03-12 15:00:00'),
    ('WO-2024-008', 'Landscaping maintenance - main entrance', 'WAPPR', 'PM-008', '2024-03-14 08:00:00', '2024-03-14 16:00:00'),
    ('WO-2024-009', 'Water heater inspection and flush', 'WAPPR', 'PM-009', '2024-03-15 09:00:00', '2024-03-15 14:00:00'),
    ('WO-2024-010', 'Elevator annual safety inspection', 'WAPPR', 'PM-010', '2024-03-18 08:00:00', '2024-03-18 17:00:00')`,

    // APPR (Approved) - 12 records
    `INSERT INTO workorder (wonum, description, status, pmnum, targetstartdate, targetfinishdate) VALUES
    ('WO-2024-011', 'Replace broken windows in conference room', 'APPR', NULL, '2024-02-20 08:00:00', '2024-02-20 12:00:00'),
    ('WO-2024-012', 'Install new security cameras - Building B', 'APPR', NULL, '2024-02-22 07:00:00', '2024-02-23 17:00:00'),
    ('WO-2024-013', 'Repair leaking faucet in restroom 3rd floor', 'APPR', NULL, '2024-02-25 10:00:00', '2024-02-25 14:00:00'),
    ('WO-2024-014', 'Paint office walls - Suite 301', 'APPR', NULL, '2024-02-26 08:00:00', '2024-02-27 17:00:00'),
    ('WO-2024-015', 'Replace carpet in reception area', 'APPR', NULL, '2024-02-28 07:00:00', '2024-03-01 17:00:00'),
    ('WO-2024-016', 'Boiler maintenance and cleaning', 'APPR', 'PM-016', '2024-03-03 08:00:00', '2024-03-03 16:00:00'),
    ('WO-2024-017', 'Update door access control system', 'APPR', NULL, '2024-03-04 09:00:00', '2024-03-04 17:00:00'),
    ('WO-2024-018', 'Install additional electrical outlets - Room 205', 'APPR', NULL, '2024-03-07 08:00:00', '2024-03-07 15:00:00'),
    ('WO-2024-019', 'Fix malfunctioning thermostat - 4th floor', 'APPR', NULL, '2024-03-09 09:00:00', '2024-03-09 13:00:00'),
    ('WO-2024-020', 'Replace fluorescent lights with LED - Warehouse', 'APPR', NULL, '2024-03-11 07:00:00', '2024-03-12 17:00:00'),
    ('WO-2024-021', 'Repair automatic sliding door - Main entrance', 'APPR', NULL, '2024-03-13 08:00:00', '2024-03-13 12:00:00'),
    ('WO-2024-022', 'Install new water fountain - 2nd floor', 'APPR', NULL, '2024-03-16 09:00:00', '2024-03-16 16:00:00')`,

    // INPRG (In Progress) - 15 records
    `INSERT INTO workorder (wonum, description, status, pmnum, targetstartdate, targetfinishdate) VALUES
    ('WO-2024-023', 'Annual HVAC system servicing', 'INPRG', 'PM-023', '2024-02-15 07:00:00', '2024-02-16 17:00:00'),
    ('WO-2024-024', 'Repair parking gate controller', 'INPRG', NULL, '2024-02-16 08:00:00', '2024-02-16 14:00:00'),
    ('WO-2024-025', 'Replace worn-out door seals - Cold storage', 'INPRG', 'PM-025', '2024-02-17 09:00:00', '2024-02-17 15:00:00'),
    ('WO-2024-026', 'Patch and seal roof leak - Section C', 'INPRG', NULL, '2024-02-18 08:00:00', '2024-02-18 16:00:00'),
    ('WO-2024-027', 'Upgrade network switches in server room', 'INPRG', NULL, '2024-02-19 10:00:00', '2024-02-20 17:00:00'),
    ('WO-2024-028', 'Clean and sanitize water tanks', 'INPRG', 'PM-028', '2024-02-21 07:00:00', '2024-02-21 17:00:00'),
    ('WO-2024-029', 'Replace damaged floor tiles - Cafeteria', 'INPRG', NULL, '2024-02-23 08:00:00', '2024-02-24 17:00:00'),
    ('WO-2024-030', 'Install handrails on exterior stairs', 'INPRG', NULL, '2024-02-24 09:00:00', '2024-02-25 15:00:00'),
    ('WO-2024-031', 'Repair emergency generator fuel leak', 'INPRG', NULL, '2024-02-26 07:30:00', '2024-02-26 16:30:00'),
    ('WO-2024-032', 'Replace bathroom exhaust fans - 3rd floor', 'INPRG', 'PM-032', '2024-02-27 08:00:00', '2024-02-27 14:00:00'),
    ('WO-2024-033', 'Calibrate thermostat controls - entire building', 'INPRG', 'PM-033', '2024-02-28 09:00:00', '2024-02-29 17:00:00'),
    ('WO-2024-034', 'Install bird netting on rooftop AC units', 'INPRG', NULL, '2024-03-01 08:00:00', '2024-03-01 16:00:00'),
    ('WO-2024-035', 'Replace corroded pipes in mechanical room', 'INPRG', 'PM-035', '2024-03-02 07:00:00', '2024-03-03 17:00:00'),
    ('WO-2024-036', 'Grease and adjust loading dock doors', 'INPRG', 'PM-036', '2024-03-04 08:00:00', '2024-03-04 14:00:00'),
    ('WO-2024-037', 'Test and reset fire alarm system', 'INPRG', 'PM-037', '2024-03-05 09:00:00', '2024-03-05 17:00:00')`,

    // COMP (Completed) - 10 records
    `INSERT INTO workorder (wonum, description, status, pmnum, targetstartdate, targetfinishdate) VALUES
    ('WO-2024-038', 'Monthly pest control treatment', 'COMP', 'PM-038', '2024-02-01 08:00:00', '2024-02-01 12:00:00'),
    ('WO-2024-039', 'Replace broken office chairs - Floor 2', 'COMP', NULL, '2024-02-03 09:00:00', '2024-02-03 11:00:00'),
    ('WO-2024-040', 'Clean exterior windows - all sides', 'COMP', 'PM-040', '2024-02-05 07:00:00', '2024-02-06 17:00:00'),
    ('WO-2024-041', 'Repair damaged drywall - Room 401', 'COMP', NULL, '2024-02-07 08:00:00', '2024-02-07 15:00:00'),
    ('WO-2024-042', 'Replace air filters in server room', 'COMP', 'PM-042', '2024-02-08 10:00:00', '2024-02-08 12:00:00'),
    ('WO-2024-043', 'Pressure wash building exterior', 'COMP', 'PM-043', '2024-02-10 07:00:00', '2024-02-11 17:00:00'),
    ('WO-2024-044', 'Install new lock on storage room door', 'COMP', NULL, '2024-02-12 09:00:00', '2024-02-12 11:00:00'),
    ('WO-2024-045', 'Quarterly grease trap cleaning', 'COMP', 'PM-045', '2024-02-13 08:00:00', '2024-02-13 14:00:00'),
    ('WO-2024-046', 'Replace motion sensor lights - Parking lot', 'COMP', NULL, '2024-02-14 07:30:00', '2024-02-14 13:30:00'),
    ('WO-2024-047', 'Touch up paint on exterior trim', 'COMP', 'PM-047', '2024-02-15 08:00:00', '2024-02-15 16:00:00')`,

    // CAN (Cancelled) - 3 records
    `INSERT INTO workorder (wonum, description, status, pmnum, targetstartdate, targetfinishdate) VALUES
    ('WO-2024-048', 'Replace old office furniture - Suite 500', 'CAN', NULL, '2024-02-10 08:00:00', '2024-02-11 17:00:00'),
    ('WO-2024-049', 'Install solar panels on roof', 'CAN', NULL, '2024-03-01 07:00:00', '2024-03-15 17:00:00'),
    ('WO-2024-050', 'Upgrade building management system', 'CAN', NULL, '2024-03-20 08:00:00', '2024-04-30 17:00:00')`
  ],
  
  down: [
    `DELETE FROM workorder WHERE wonum LIKE 'WO-2024-%'`
  ]
};

export default migration_20260216160000;

/**
 * Export all migrations in order
 */
export const migrations: Migration[] = [
  migration_20260216140000,
  migration_20260216160000,
  // Add more migrations here as you create them
];