-- Local dev seed data for the Expenses Tracker (reversible; local D1 only).
-- Amounts are integer cents. Dates are YYYY-MM-DD. "Today" context: 2026-06.

DELETE FROM transactions;
DELETE FROM investment_snapshots;
DELETE FROM recurring_rules;
DELETE FROM categories;
DELETE FROM sqlite_sequence WHERE name IN ('transactions','investment_snapshots','recurring_rules','categories');

-- Categories (ids 1..10)
INSERT INTO categories (name, color, icon) VALUES
  ('Salaire',       '#6366f1', NULL),
  ('Loyer',         '#0ea5e9', NULL),
  ('Courses',       '#f59e0b', NULL),
  ('Restaurants',   '#ec4899', NULL),
  ('Transport',     '#14b8a6', NULL),
  ('Abonnements',   '#8b5cf6', NULL),
  ('Santé',         '#f43f5e', NULL),
  ('Loisirs',       '#a855f7', NULL),
  ('Énergie',       '#06b6d4', NULL),
  ('Freelance',     '#22c55e', NULL);

-- Recurring rules (ids 1..6). The app generates their monthly transactions
-- from start_date up to today on the next dashboard load.
INSERT INTO recurring_rules (type, amount, description, category_id, frequency, start_date, is_active) VALUES
  ('income',  320000, 'Salaire mensuel', 1, 'monthly', '2026-01-02', 1),
  ('expense', 118000, 'Loyer',           2, 'monthly', '2026-01-03', 1),
  ('expense',   1399, 'Netflix',         6, 'monthly', '2026-01-05', 1),
  ('expense',   1099, 'Spotify',         6, 'monthly', '2026-01-05', 1),
  ('expense',   2990, 'Salle de sport',  7, 'monthly', '2026-01-08', 1),
  ('expense',   4990, 'Box internet',    9, 'monthly', '2026-01-15', 1);

-- Variable transactions (recurring_id NULL)
INSERT INTO transactions (type, amount, description, date, category_id) VALUES
  -- June 2026 (current month)
  ('expense',  6750, 'Carrefour',                      '2026-06-02', 3),
  ('expense',  4230, 'Marché bio',                     '2026-06-05', 3),
  ('expense',  3290, 'Restaurant Le Petit Sud',        '2026-06-06', 4),
  ('expense',  1890, 'Ticket de métro',                '2026-06-03', 5),
  ('income',  85000, 'Mission freelance — site vitrine','2026-06-04', 10),
  ('expense',  5499, 'Pharmacie',                      '2026-06-07', 7),
  ('expense',  2400, 'Cinéma',                         '2026-06-08', 8),
  ('expense',  8990, 'Courses Monoprix',               '2026-06-08', 3),
  -- May 2026 (previous month)
  ('expense',  7120, 'Carrefour',                      '2026-05-04', 3),
  ('expense',  5340, 'Auchan',                         '2026-05-18', 3),
  ('expense',  4500, 'Restaurant',                     '2026-05-10', 4),
  ('expense',  2890, 'Brunch',                         '2026-05-25', 4),
  ('expense',  6000, 'Essence',                        '2026-05-12', 5),
  ('income', 120000, 'Mission freelance — refonte UI', '2026-05-15', 10),
  ('expense',  3200, 'Concert',                        '2026-05-22', 8),
  ('expense',  4199, 'Décathlon',                      '2026-05-09', 8),
  ('expense',  2750, 'Médecin',                        '2026-05-06', 7),
  ('expense',  9100, 'Courses du mois',                '2026-05-28', 3),
  -- April 2026
  ('expense',  6800, 'Carrefour',                      '2026-04-06', 3),
  ('expense',  5200, 'Lidl',                           '2026-04-20', 3),
  ('expense',  3890, 'Restaurant',                     '2026-04-14', 4),
  ('expense',  5500, 'Essence',                        '2026-04-11', 5),
  ('income',  60000, 'Mission freelance',              '2026-04-18', 10),
  ('expense',  2999, 'Librairie',                      '2026-04-22', 8),
  -- March 2026
  ('expense',  7200, 'Courses',                        '2026-03-08', 3),
  ('expense',  4100, 'Restaurant',                     '2026-03-15', 4),
  ('expense',  5800, 'Transport',                      '2026-03-05', 5),
  ('expense',  3500, 'Loisirs',                        '2026-03-20', 8),
  -- February 2026
  ('expense',  6900, 'Courses',                        '2026-02-10', 3),
  ('expense',  3800, 'Restaurant',                     '2026-02-14', 4),
  ('expense',  5400, 'Essence',                        '2026-02-07', 5),
  ('income',  45000, 'Freelance',                      '2026-02-21', 10),
  -- January 2026
  ('expense',  7400, 'Courses',                        '2026-01-12', 3),
  ('expense',  4500, 'Restaurant',                     '2026-01-19', 4),
  ('expense',  5100, 'Transport',                      '2026-01-09', 5);

-- Investment snapshots (portfolio value over time, with a realistic March dip)
INSERT INTO investment_snapshots (date, total_value, note) VALUES
  ('2026-01-15', 1500000, 'Portefeuille initial'),
  ('2026-02-15', 1542000, NULL),
  ('2026-03-15', 1518000, 'Correction de marché'),
  ('2026-04-15', 1605000, NULL),
  ('2026-05-15', 1668000, NULL),
  ('2026-06-08', 1731000, 'Plus haut récent');
