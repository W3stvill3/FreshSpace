-- FreshSpace Database Schema
-- Location: /home/team/shared/freshspace/server/schema.sql

CREATE TABLE services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    add_on_parent_id INTEGER
);

CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    segment TEXT NOT NULL CHECK (segment IN ('residential', 'host', 'student'))
);

CREATE TABLE cleaners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    skills TEXT,
    max_distance_km REAL
);

CREATE TABLE cleaner_availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cleaner_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    FOREIGN KEY (cleaner_id) REFERENCES cleaners(id)
);

CREATE TABLE bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    cleaner_id INTEGER,
    service_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    booking_date TEXT NOT NULL,
    booking_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (cleaner_id) REFERENCES cleaners(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    revenue REAL NOT NULL,
    commission REAL NOT NULL,
    date_recorded TEXT NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
);
